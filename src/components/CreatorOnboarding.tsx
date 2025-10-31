import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ArrowLeft, User, CreditCard, FileText, Check, Camera, TrendingUp, Globe, Phone, MapPin, Hash, Calendar, Users, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { detectDocumentType, formatCEP, formatDocument, formatPhone, stripFormatting } from '../utils/formatters';

interface OnboardingData {
  // Etapa 1 - Qualificação
  birth_date?: string;
  instagram_url?: string;
  tiktok_url?: string;
  portfolio_url?: string;
  age?: number;
  gender?: string;
  niches?: string[];
  
  // Etapa 2 - Dados bancários
  pix_key?: string;
  
  // Etapa 3 - Dados para contrato
  full_name?: string;
  phone?: string;
  email?: string;
  address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  document_type?: 'cpf' | 'cnpj';
  document_number?: string;
}

interface CreatorOnboardingProps {
  onComplete: () => void;
}

const NICHE_OPTIONS = [
  'Moda', 'Beleza', 'Fitness', 'Lifestyle', 'Viagem', 'Culinária', 
  'Tecnologia', 'Gaming', 'Música', 'Arte', 'Decoração', 'Pets',
  'Maternidade', 'Negócios', 'Educação', 'Saúde', 'Esportes', 'Entretenimento'
];

const GENDER_OPTIONS = [
  { value: 'feminino', label: 'Feminino' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'nao-binario', label: 'Não-binário' },
  { value: 'prefiro-nao-informar', label: 'Prefiro não informar' }
];

const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const STEP_FIELDS = {
  1: ['birth_date', 'instagram_url', 'gender', 'niches'] as const,
  2: ['pix_key'] as const,
  3: [
    'full_name',
    'phone',
    'email',
    'document_number',
    'document_type',
    'address.street',
    'address.number',
    'address.neighborhood',
    'address.city',
    'address.state',
    'address.zipCode'
  ] as const
};

const CreatorOnboarding: React.FC<CreatorOnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    birth_date: '',
    niches: [],
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: ''
    }
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [fieldValidations, setFieldValidations] = useState<Record<string, 'valid' | 'invalid' | 'validating'>>({});
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const { user } = useAuth();
  const lastFetchedCepRef = useRef('');
  const addressFetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maxBirthDate = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 13);
    return date.toISOString().split('T')[0];
  }, []);

  const minBirthDate = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 100);
    return date.toISOString().split('T')[0];
  }, []);

  const clearFieldError = (field: string) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const setFieldValidation = (field: string, status: 'valid' | 'invalid' | 'validating') => {
    setFieldValidations(prev => ({ ...prev, [field]: status }));
  };

  const clearFieldValidation = (field: string) => {
    setFieldValidations(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Validações em tempo real
  const validateBirthDateRealTime = (value: string) => {
    if (!value) {
      clearFieldValidation('birth_date');
      return;
    }

    const age = calculateAge(value);
    if (!age || age < 13) {
      setFieldValidation('birth_date', 'invalid');
      setFieldErrors(prev => ({ ...prev, birth_date: 'Você precisa ter pelo menos 13 anos.' }));
    } else if (age > 100) {
      setFieldValidation('birth_date', 'invalid');
      setFieldErrors(prev => ({ ...prev, birth_date: 'Por favor, verifique a data de nascimento.' }));
    } else {
      setFieldValidation('birth_date', 'valid');
      clearFieldError('birth_date');
    }
  };

  const validateInstagramRealTime = (value: string) => {
    if (!value || !value.trim()) {
      clearFieldValidation('instagram_url');
      return;
    }

    const trimmed = value.trim();
    const isValidUrl = trimmed.startsWith('http') && (trimmed.includes('instagram.com') || trimmed.includes('instagr.am'));
    const isUsername = !trimmed.startsWith('http') && trimmed.length >= 2;

    if (isValidUrl || isUsername) {
      setFieldValidation('instagram_url', 'valid');
      clearFieldError('instagram_url');
    } else {
      setFieldValidation('instagram_url', 'invalid');
      setFieldErrors(prev => ({ ...prev, instagram_url: 'Link ou @ inválido.' }));
    }
  };

  const validatePixKeyRealTime = (value: string) => {
    if (!value || !value.trim()) {
      clearFieldValidation('pix_key');
      return;
    }

    const trimmed = value.trim();
    
    // Validar se parece com email
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    
    // Validar se parece com telefone (10 ou 11 dígitos)
    const digitsOnly = stripFormatting(trimmed);
    const isPhone = digitsOnly.length === 10 || digitsOnly.length === 11;
    
    // Validar se parece com CPF (11 dígitos)
    const isCPF = digitsOnly.length === 11;
    
    // Validar se parece com CNPJ (14 dígitos)
    const isCNPJ = digitsOnly.length === 14;
    
    // Chave aleatória (UUID ou similar - mínimo 32 caracteres)
    const isRandomKey = trimmed.length >= 32 && /^[a-zA-Z0-9-]+$/.test(trimmed);

    if (isEmail || isPhone || isCPF || isCNPJ || isRandomKey) {
      setFieldValidation('pix_key', 'valid');
      clearFieldError('pix_key');
    } else if (trimmed.length < 11) {
      clearFieldValidation('pix_key');
    } else {
      setFieldValidation('pix_key', 'invalid');
      setFieldErrors(prev => ({ ...prev, pix_key: 'Chave PIX inválida. Use CPF, email, telefone ou chave aleatória.' }));
    }
  };

  const validateDocumentRealTime = (value: string) => {
    if (!value || !value.trim()) {
      clearFieldValidation('document_number');
      return;
    }

    const digits = stripFormatting(value);
    
    if (digits.length < 11) {
      clearFieldValidation('document_number');
      return;
    }

    const detectedType = detectDocumentType(digits);
    
    if (detectedType === 'cpf' && digits.length === 11) {
      setFieldValidation('document_number', 'valid');
      clearFieldError('document_number');
    } else if (detectedType === 'cnpj' && digits.length === 14) {
      setFieldValidation('document_number', 'valid');
      clearFieldError('document_number');
    } else if (digits.length >= 11) {
      setFieldValidation('document_number', 'invalid');
      setFieldErrors(prev => ({ ...prev, document_number: 'CPF ou CNPJ inválido.' }));
    }
  };

  const validatePhoneRealTime = (value: string) => {
    if (!value || !value.trim()) {
      clearFieldValidation('phone');
      return;
    }

    const digits = stripFormatting(value);
    
    if (digits.length < 10) {
      clearFieldValidation('phone');
      return;
    }

    if (digits.length === 10 || digits.length === 11) {
      setFieldValidation('phone', 'valid');
      clearFieldError('phone');
    } else {
      setFieldValidation('phone', 'invalid');
      setFieldErrors(prev => ({ ...prev, phone: 'Telefone inválido. Use formato (11) 99999-9999.' }));
    }
  };

  const validateEmailRealTime = (value: string) => {
    if (!value || !value.trim()) {
      clearFieldValidation('email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (emailRegex.test(value.trim())) {
      setFieldValidation('email', 'valid');
      clearFieldError('email');
    } else {
      setFieldValidation('email', 'invalid');
      setFieldErrors(prev => ({ ...prev, email: 'Email inválido.' }));
    }
  };

  const validateCEPRealTime = (value: string) => {
    if (!value || !value.trim()) {
      clearFieldValidation('address.zipCode');
      return;
    }

    const digits = stripFormatting(value);
    
    if (digits.length < 8) {
      clearFieldValidation('address.zipCode');
      return;
    }

    if (digits.length === 8) {
      setFieldValidation('address.zipCode', 'validating');
      // A validação final será feita pela API do ViaCEP
    } else {
      setFieldValidation('address.zipCode', 'invalid');
      setFieldErrors(prev => ({ ...prev, 'address.zipCode': 'CEP deve ter 8 dígitos.' }));
    }
  };

  const resetStepErrors = (fields: readonly string[]) => {
    if (fields.length === 0) return;
    setFieldErrors(prev => {
      const next = { ...prev };
      fields.forEach((field) => {
        if (next[field]) {
          delete next[field];
        }
      });
      return next;
    });
  };

  const setStepErrors = (errors: Record<string, string>) => {
    if (Object.keys(errors).length === 0) return;
    setFieldErrors(prev => ({ ...prev, ...errors }));
  };

  const handleAddressChange = (
    field: keyof NonNullable<OnboardingData['address']>,
    value: string
  ) => {
    const fullFieldKey = `address.${field}`;

    if (field === 'zipCode') {
      const formattedValue = formatCEP(value);
      const digits = stripFormatting(formattedValue).slice(0, 8);

      setData(prev => ({
        ...prev,
        address: {
          ...prev.address!,
          zipCode: formattedValue
        }
      }));

      clearFieldError(fullFieldKey);
      validateCEPRealTime(formattedValue);

      if (addressFetchTimeoutRef.current) {
        clearTimeout(addressFetchTimeoutRef.current);
        addressFetchTimeoutRef.current = null;
      }

      if (digits.length === 8 && digits !== lastFetchedCepRef.current) {
        setIsFetchingAddress(true);
        setFieldValidation('address.zipCode', 'validating');

        addressFetchTimeoutRef.current = setTimeout(async () => {
          try {
            const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
            const addressData = await response.json();

            if (!response.ok || addressData?.erro) {
              throw new Error('CEP não encontrado');
            }

            setData(prev => ({
              ...prev,
              address: {
                ...prev.address!,
                street: addressData.logradouro || prev.address?.street || '',
                neighborhood: addressData.bairro || prev.address?.neighborhood || '',
                city: addressData.localidade || prev.address?.city || '',
                state: addressData.uf || prev.address?.state || '',
                number: prev.address?.number || '',
                complement: prev.address?.complement || '',
                zipCode: formatCEP(digits)
              }
            }));

            clearFieldError('address.street');
            clearFieldError('address.neighborhood');
            clearFieldError('address.city');
            clearFieldError('address.state');
            
            // Marcar CEP como válido após sucesso
            setFieldValidation('address.zipCode', 'valid');
            clearFieldError('address.zipCode');

            lastFetchedCepRef.current = digits;
          } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            setFieldValidation('address.zipCode', 'invalid');
            setStepErrors({
              'address.zipCode': 'CEP não encontrado. Verifique ou preencha manualmente.'
            });
          } finally {
            setIsFetchingAddress(false);
          }
        }, 400);
      } else {
        lastFetchedCepRef.current = digits;
        setIsFetchingAddress(false);
      }
    } else {
      setData(prev => ({
        ...prev,
        address: {
          ...prev.address!,
          [field]: value
        }
      }));
      clearFieldError(fullFieldKey);
    }
  };

  const calculateAge = (birthDate: string | undefined) => {
    if (!birthDate) return undefined;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }
    return age;
  };

  const handleBirthDateChange = (value: string) => {
    setData(prev => ({
      ...prev,
      birth_date: value,
      age: calculateAge(value)
    }));
    validateBirthDateRealTime(value);
  };

  const inputClass = (hasError: boolean, extra = '') =>
    ['input-glass', extra, hasError ? 'input-error' : ''].filter(Boolean).join(' ');

  const selectClass = (hasError: boolean, extra = '') =>
    ['select-glass', extra, hasError ? 'input-error' : ''].filter(Boolean).join(' ');

  const handleSimpleFieldChange = (field: keyof OnboardingData, value: string) => {
    setData(prev => ({
      ...prev,
      [field]: value
    }));
    clearFieldError(field as string);

    // Validação em tempo real para campos específicos
    if (field === 'pix_key') {
      validatePixKeyRealTime(value);
    } else if (field === 'phone') {
      validatePhoneRealTime(value);
    } else if (field === 'email') {
      validateEmailRealTime(value);
    }
  };

  // Componente de ícone de validação
  const ValidationIcon = ({ field }: { field: string }) => {
    const status = fieldValidations[field];
    
    if (!status) return null;

    if (status === 'validating') {
      return (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
        </div>
      );
    }

    if (status === 'valid') {
      return (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <Check className="h-5 w-5 text-emerald-400" />
        </div>
      );
    }

    if (status === 'invalid') {
      return (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <AlertTriangle className="h-5 w-5 text-rose-400" />
        </div>
      );
    }

    return null;
  };

  const handleInstagramChange = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setData(prev => ({ ...prev, instagram_url: '' }));
      clearFieldError('instagram_url');
      clearFieldValidation('instagram_url');
      return;
    }

    const normalized = trimmed.startsWith('http')
      ? trimmed
      : `https://instagram.com/${trimmed.replace(/^@/, '')}`;

    setData(prev => ({ ...prev, instagram_url: normalized }));
    validateInstagramRealTime(trimmed);
  };

  const handleDocumentChange = (value: string) => {
    const digits = stripFormatting(value).slice(0, 14);

    if (!digits) {
      setData(prev => ({
        ...prev,
        document_number: '',
        document_type: undefined
      }));
      clearFieldError('document_number');
      clearFieldError('document_type');
      clearFieldValidation('document_number');
      return;
    }

    const detectedType = detectDocumentType(digits) ?? undefined;
    const formatted = formatDocument(digits, detectedType);

    setData(prev => ({
      ...prev,
      document_number: formatted,
      document_type: detectedType ?? prev.document_type
    }));

    validateDocumentRealTime(formatted);
    if (detectedType) {
      clearFieldError('document_type');
    }
  };

  useEffect(() => {
    // Pré-preencher com dados do usuário se disponível
    if (user?.email) {
      setData(prev => ({ ...prev, email: user.email || '' }));
    }

    // 🔥 WARM-UP: Acordar o Supabase assim que o componente montar
    // Isso é crítico para planos gratuitos que entram em cold start
    warmupSupabase();
  }, [user]);

  const handleNicheToggle = (niche: string) => {
    setData(prev => ({
      ...prev,
      niches: prev.niches?.includes(niche)
        ? prev.niches.filter(n => n !== niche)
        : [...(prev.niches || []), niche]
    }));
    clearFieldError('niches');
  };

  const validateStep = (step: number, showErrors = false): boolean => {
    const stepFields = STEP_FIELDS[step as keyof typeof STEP_FIELDS] || [];
    if (showErrors) {
      resetStepErrors(stepFields);
    }

    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!data.birth_date) {
        errors.birth_date = 'Informe sua data de nascimento.';
      } else if (!data.age || data.age < 13) {
        errors.birth_date = 'Você precisa ter pelo menos 13 anos para usar a plataforma.';
      }

      if (!data.instagram_url || !data.instagram_url.trim()) {
        errors.instagram_url = 'Informe o link do seu Instagram.';
      }

      if (!data.gender) {
        errors.gender = 'Selecione seu gênero.';
      }

      if (!data.niches || data.niches.length === 0) {
        errors.niches = 'Selecione ao menos um nicho.';
      }
    } else if (step === 2) {
      if (!data.pix_key || !data.pix_key.trim()) {
        errors.pix_key = 'Informe sua chave PIX.';
      }
    } else if (step === 3) {
      if (!data.full_name || !data.full_name.trim()) {
        errors.full_name = 'Informe seu nome completo.';
      }

      if (!data.phone || !data.phone.trim()) {
        errors.phone = 'Informe um telefone para contato.';
      }

      if (!data.email || !data.email.trim()) {
        errors.email = 'Email é obrigatório.';
      }

      if (!data.document_number || !data.document_number.trim()) {
        errors.document_number = 'Informe um CPF ou CNPJ.';
      }

      if (!data.document_type) {
        errors.document_type = 'Não conseguimos identificar se é CPF ou CNPJ.';
      }

      if (!data.address?.zipCode?.trim()) {
        errors['address.zipCode'] = 'Informe o CEP.';
      }
      if (!data.address?.street?.trim()) {
        errors['address.street'] = 'Informe a rua.';
      }
      if (!data.address?.number?.trim()) {
        errors['address.number'] = 'Informe o número.';
      }
      if (!data.address?.neighborhood?.trim()) {
        errors['address.neighborhood'] = 'Informe o bairro.';
      }
      if (!data.address?.city?.trim()) {
        errors['address.city'] = 'Informe a cidade.';
      }
      if (!data.address?.state?.trim()) {
        errors['address.state'] = 'Selecione o estado.';
      }
    }

    if (showErrors && Object.keys(errors).length > 0) {
      setStepErrors(errors);
    }

    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep, true)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  // Função para "acordar" o Supabase com uma query leve
  const warmupSupabase = async (): Promise<void> => {
    try {
      console.log('🔥 Aquecendo conexão com Supabase...');
      // Query simples e leve apenas para estabelecer conexão
      await supabase.from('profiles').select('id').limit(1).single();
    } catch (error) {
      // Ignora erros - o objetivo é apenas acordar o banco
      console.log('Warmup completado (erro esperado):', error);
    }
  };

  // Função auxiliar para retry com backoff exponencial OTIMIZADO PARA COLD START
  const retryWithBackoff = async <T,>(
    fn: () => Promise<T>,
    maxRetries = 5, // Aumentado de 3 para 5 tentativas
    baseDelay = 2000 // Aumentado de 1s para 2s
  ): Promise<T> => {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Timeout progressivo: primeira tentativa 30s, depois 20s, depois 15s
        const timeoutDuration = attempt === 0 ? 30000 : attempt === 1 ? 20000 : 15000;
        
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), timeoutDuration);
        });
        
        console.log(`⏱️ Tentativa ${attempt + 1}/${maxRetries} (timeout: ${timeoutDuration/1000}s)`);
        
        const result = await Promise.race([fn(), timeoutPromise]);
        
        console.log(`✅ Tentativa ${attempt + 1} bem-sucedida!`);
        return result as T;
      } catch (error) {
        lastError = error as Error;
        const isTimeout = (error as Error).message.includes('timeout');
        
        console.warn(
          `⚠️ Tentativa ${attempt + 1}/${maxRetries} falhou:`, 
          isTimeout ? 'Timeout' : (error as Error).message
        );
        
        // Se não for a última tentativa, aguardar antes de tentar novamente
        if (attempt < maxRetries - 1) {
          // Backoff exponencial mais agressivo para cold start
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`⏳ Aguardando ${delay/1000}s antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('Todas as tentativas falharam');
  };

  const handleComplete = async () => {
    if (!validateStep(3, true) || !user?.id) return;

    setLoading(true);
    
    try {
      // 🔥 Fazer warmup novamente antes do save para garantir que a conexão está ativa
      console.log('111- 🔥 Garantindo que Supabase está acordado antes de salvar...');
      // await warmupSupabase();
      
      // Validar e preparar dados antes de enviar
      const updateData = {
        birth_date: data.birth_date || null,
        instagram_url: data.instagram_url?.trim() || null,
        tiktok_url: data.tiktok_url?.trim() || null,
        portfolio_url: data.portfolio_url?.trim() || null,
        age: data.age,
        gender: data.gender,
        niches: Array.isArray(data.niches) ? data.niches : [],
        pix_key: data.pix_key?.trim() || null,
        full_name: data.full_name?.trim() || null,
        phone: data.phone ? stripFormatting(data.phone) : null,
        email: data.email?.trim() || null,
        address: data.address || null,
        document_type: data.document_type || null,
        document_number: data.document_number ? stripFormatting(data.document_number) : null,
        onboarding_completed: true,
        onboarding_step: 4,
        onboarding_completed_at: new Date().toISOString()
      };

      console.log('📤 Enviando dados do onboarding:', { 
        userId: user.id, 
        dataKeys: Object.keys(updateData),
        hasAddress: !!updateData.address,
        hasNiches: updateData.niches.length > 0
      });

      // Tentar salvar com retry otimizado para cold start
      await retryWithBackoff(async () => {
        const { data: result, error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', user.id)
          .select()
          .single();

        if (error) {
          console.error('❌ Erro do Supabase:', error);
          throw error;
        }

        console.log('✅ Onboarding salvo com sucesso:', result);
        return result;
      }, 5, 2000); // 5 tentativas com delay base de 2s

      // Sucesso - completar onboarding
      console.log('🎉 Onboarding completado com sucesso! Redirecionando...');
      onComplete();
      
    } catch (error) {
      console.error('❌ Erro ao salvar onboarding após todas as tentativas:', error);
      
      // Salvar dados localmente como fallback
      try {
        const fallbackData = {
          userId: user.id,
          data: data,
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        };
        localStorage.setItem('onboarding_fallback', JSON.stringify(fallbackData));
        console.log('💾 Dados salvos localmente como fallback');
      } catch (storageError) {
        console.error('Erro ao salvar fallback:', storageError);
      }
      
      // Mostrar mensagem amigável ao usuário com informações sobre cold start
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const isTimeout = errorMessage.includes('timeout');
      
      let userMessage = '⚠️ Não conseguimos salvar suas informações.\n\n';
      
      if (isTimeout) {
        userMessage += '🕒 POSSÍVEL CAUSA: O servidor está demorando para responder.\n\n';
        userMessage += 'Isso pode acontecer quando:\n';
        userMessage += '• É o primeiro acesso do dia (servidor em modo economia)\n';
        userMessage += '• Sua conexão está lenta\n';
        userMessage += '• O servidor está sobrecarregado\n\n';
        userMessage += '💡 SOLUÇÕES:\n';
        userMessage += '1. Aguarde 30 segundos e tente novamente (o servidor já deve estar ativo)\n';
        userMessage += '2. Verifique sua conexão com internet\n';
        userMessage += '3. Tente em outro navegador\n\n';
        userMessage += '✅ Seus dados foram salvos localmente e você pode:\n';
        userMessage += '• Clicar em CANCELAR e tentar novamente em instantes\n';
        userMessage += '• Clicar em OK para acessar o dashboard (você pode completar depois)';
      } else {
        userMessage += `Erro técnico: ${errorMessage}\n\n`;
        userMessage += 'Suas informações foram salvas temporariamente.\n';
        userMessage += 'Você pode completar o cadastro depois em "Configurações".\n\n';
        userMessage += 'Deseja continuar para o dashboard?';
      }
      
      // Perguntar ao usuário se quer continuar
      const shouldContinue = confirm(userMessage);
      
      if (shouldContinue) {
        console.log('⚠️ Usuário optou por continuar sem completar o onboarding');
        
        // Tentar marcar apenas o onboarding_step sem os outros dados
        try {
          await supabase
            .from('profiles')
            .update({ 
              onboarding_step: 3,
              onboarding_completed: false 
            })
            .eq('id', user.id);
        } catch (stepError) {
          console.error('Erro ao atualizar step:', stepError);
        }
        
        onComplete();
      } else {
        // Se cancelou, mostrar dica
        alert('💡 DICA: Aguarde 30-60 segundos para o servidor "acordar" e tente novamente.\n\nSe o problema persistir, entre em contato com o suporte.');
      }
      
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-12 text-slate-100">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-[8%] h-[420px] w-[420px] rounded-full bg-gradient-to-br from-[#4A5BFF]/35 via-[#6E4FFF]/28 to-transparent blur-[180px]" />
        <div className="absolute top-[35%] -right-[12%] h-[480px] w-[480px] rounded-full bg-gradient-to-br from-[#2ED3FF]/32 via-transparent to-transparent blur-[220px]" />
      </div>

      <div className="mx-auto w-full max-w-4xl">
        <div className="glass-panel space-y-12 px-8 py-10 md:px-12 md:py-12">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4A5BFF] via-[#6E4FFF] to-[#B249FF] font-semibold uppercase tracking-[0.3em] text-white">
              UGC
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Complete seu perfil</h1>
            <p className="mt-3 text-sm text-slate-300">
              Avance pelas etapas para desbloquear oportunidades com a estética neon do hub.
            </p>

            <div className="mt-8 flex items-center justify-center space-x-5">
              {[1, 2, 3].map(step => (
                <div key={step} className="flex items-center">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold transition ${
                      currentStep >= step
                        ? 'bg-gradient-to-br from-[#4A5BFF] via-[#6E4FFF] to-[#B249FF] text-white shadow-[0_18px_45px_-22px_rgba(91,99,255,0.75)]'
                        : 'border border-white/15 bg-white/5 text-slate-400'
                    }`}
                  >
                    {currentStep > step ? <Check className="h-5 w-5" /> : step}
                  </div>
                  {step < 3 && (
                    <div
                      className={`mx-3 h-[2px] w-20 rounded-full ${
                        currentStep > step
                          ? 'bg-gradient-to-r from-[#4A5BFF] via-[#6E4FFF] to-[#B249FF]'
                          : 'bg-white/10'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-center gap-10 text-xs uppercase tracking-[0.35em]">
              <span className={currentStep >= 1 ? 'text-[#B7C5FF]' : 'text-slate-500'}>Qualificação</span>
              <span className={currentStep >= 2 ? 'text-[#B7C5FF]' : 'text-slate-500'}>Dados Bancários</span>
              <span className={currentStep >= 3 ? 'text-[#B7C5FF]' : 'text-slate-500'}>Dados Contratuais</span>
            </div>
          </div>

          {currentStep === 1 && (
            <div className="space-y-10">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[#9FA8FF]">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Dados de Qualificação</h2>
                  <p className="text-sm text-slate-300">Conte-nos mais sobre você e seu trabalho</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                    Data de nascimento *
                  </label>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8A7CFF]" />
                    <input
                      type="date"
                      value={data.birth_date || ''}
                      max={maxBirthDate}
                      min={minBirthDate}
                      onChange={event => handleBirthDateChange(event.target.value)}
                      className={inputClass(Boolean(fieldErrors.birth_date), '!pl-12 !pr-12')}
                      required
                    />
                    <ValidationIcon field="birth_date" />
                  </div>
                  {data.birth_date && (
                    <p className="mt-2 text-xs uppercase tracking-[0.25em] text-slate-400">
                      Idade calculada:
                      <span className="ml-2 text-slate-200">
                        {data.age !== undefined ? `${data.age} anos` : '—'}
                      </span>
                    </p>
                  )}
                  {fieldErrors.birth_date && (
                    <p className="mt-2 flex items-center gap-2 text-xs text-rose-300">
                      <AlertTriangle className="h-4 w-4" />
                      {fieldErrors.birth_date}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                    Gênero *
                  </label>
                  <div className="relative">
                    <Users className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8A7CFF]" />
                    <select
                      value={data.gender || ''}
                      onChange={event => handleSimpleFieldChange('gender', event.target.value)}
                      className={selectClass(Boolean(fieldErrors.gender), '!pl-12')}
                      required
                    >
                      <option value="">Selecione</option>
                      {GENDER_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {fieldErrors.gender && (
                    <p className="mt-2 flex items-center gap-2 text-xs text-rose-300">
                      <AlertTriangle className="h-4 w-4" />
                      {fieldErrors.gender}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                    Perfil Instagram *
                  </label>
                  <div className="relative">
                    <Camera className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8A7CFF]" />
                    <input
                      type="url"
                      value={data.instagram_url || ''}
                      onChange={event => handleSimpleFieldChange('instagram_url', event.target.value)}
                      onBlur={event => handleInstagramChange(event.target.value)}
                      className={inputClass(Boolean(fieldErrors.instagram_url), '!pl-12 !pr-12')}
                      placeholder="https://instagram.com/seuperfil"
                      required
                    />
                    <ValidationIcon field="instagram_url" />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Informe o link completo ou seu @. Usamos isso para entender seu alcance.
                  </p>
                  {fieldErrors.instagram_url && (
                    <p className="mt-2 flex items-center gap-2 text-xs text-rose-300">
                      <AlertTriangle className="h-4 w-4" />
                      {fieldErrors.instagram_url}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                    Perfil TikTok (opcional)
                  </label>
                  <div className="relative">
                    <TrendingUp className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8A7CFF]" />
                    <input
                      type="url"
                      value={data.tiktok_url || ''}
                      onChange={event => handleSimpleFieldChange('tiktok_url', event.target.value)}
                      className={inputClass(false, '!pl-12')}
                      placeholder="https://tiktok.com/@seuperfil"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                    Site ou Portfólio (opcional)
                  </label>
                  <div className="relative">
                    <Globe className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8A7CFF]" />
                    <input
                      type="url"
                      value={data.portfolio_url || ''}
                      onChange={event => handleSimpleFieldChange('portfolio_url', event.target.value)}
                      className={inputClass(false, '!pl-12')}
                      placeholder="https://seusite.com"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                    Seus nichos *
                  </label>
                  <span className="text-[10px] uppercase tracking-[0.45em] text-slate-500">escolha pelo menos um</span>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {NICHE_OPTIONS.map(niche => {
                    const active = data.niches?.includes(niche);
                    return (
                      <button
                        key={niche}
                        type="button"
                        onClick={() => handleNicheToggle(niche)}
                        className={`rounded-2xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition ${
                          active
                            ? 'bg-gradient-to-r from-[#4A5BFF]/85 via-[#6E4FFF]/80 to-[#B249FF]/70 text-white shadow-[0_16px_45px_-25px_rgba(91,99,255,0.65)]'
                            : 'border border-white/10 bg-white/5 text-slate-200 hover:border-white/20'
                        }`}
                      >
                        {niche}
                      </button>
                    );
                  })}
                </div>
                {fieldErrors.niches && (
                  <p className="mt-3 flex items-center gap-2 text-xs text-rose-300">
                    <AlertTriangle className="h-4 w-4" />
                    {fieldErrors.niches}
                  </p>
                )}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-10">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[#7CFEEE]">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Dados Bancários</h2>
                  <p className="text-sm text-slate-300">Para receber seus pagamentos</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                  Chave PIX *
                </label>
                <div className="relative">
                  <Hash className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7CFEEE]" />
                  <input
                    type="text"
                    value={data.pix_key || ''}
                    onChange={event => handleSimpleFieldChange('pix_key', event.target.value)}
                    className={inputClass(Boolean(fieldErrors.pix_key), '!pl-12 !pr-12')}
                    placeholder="CPF, email, telefone ou chave aleatória"
                    required
                  />
                  <ValidationIcon field="pix_key" />
                </div>
                <p className="text-xs text-slate-400">Pode ser seu CPF, email, telefone ou uma chave aleatória.</p>
                {fieldErrors.pix_key && (
                  <p className="flex items-center gap-2 text-xs text-rose-300">
                    <AlertTriangle className="h-4 w-4" />
                    {fieldErrors.pix_key}
                  </p>
                )}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-12">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[#B58CFF]">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Dados para Contrato</h2>
                  <p className="text-sm text-slate-300">Informações necessárias para formalização</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={data.full_name || ''}
                    onChange={event => handleSimpleFieldChange('full_name', event.target.value)}
                    className={inputClass(Boolean(fieldErrors.full_name))}
                    placeholder="Seu nome completo"
                    required
                  />
                  {fieldErrors.full_name && (
                    <p className="mt-2 flex items-center gap-2 text-xs text-rose-300">
                      <AlertTriangle className="h-4 w-4" />
                      {fieldErrors.full_name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                    Telefone *
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7CFEEE]" />
                    <input
                      type="tel"
                      value={data.phone || ''}
                      onChange={event => handleSimpleFieldChange('phone', formatPhone(event.target.value))}
                      className={inputClass(Boolean(fieldErrors.phone), '!pl-12 !pr-12')}
                      placeholder="(11) 99999-9999"
                      required
                    />
                    <ValidationIcon field="phone" />
                  </div>
                  {fieldErrors.phone && (
                    <p className="mt-2 flex items-center gap-2 text-xs text-rose-300">
                      <AlertTriangle className="h-4 w-4" />
                      {fieldErrors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={data.email || ''}
                    readOnly
                    className={`${inputClass(Boolean(fieldErrors.email))} cursor-not-allowed bg-white/10 text-slate-300 opacity-75`}
                    placeholder="seu@email.com"
                    required
                  />
                  <p className="mt-2 text-xs text-slate-400">
                    Usamos o email da sua conta. Caso precise alterar, atualize em configurações.
                  </p>
                  {fieldErrors.email && (
                    <p className="mt-2 flex items-center gap-2 text-xs text-rose-300">
                      <AlertTriangle className="h-4 w-4" />
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                      CPF ou CNPJ *
                    </label>
                    {data.document_number && (
                      <span
                        className={`badge-pill ${
                          data.document_type === 'cnpj'
                            ? 'bg-gradient-to-r from-[#2ED3B7]/30 to-[#55A0FF]/20 text-[#CFFBEF]'
                            : data.document_type === 'cpf'
                            ? 'bg-gradient-to-r from-[#4A5BFF]/35 to-[#B249FF]/25 text-[#E6E9FF]'
                            : 'bg-gradient-to-r from-[#FF7B73]/30 to-[#FF4471]/20 text-[#FFD6DA]'
                        }`}
                      >
                        {data.document_type === 'cnpj'
                          ? 'CNPJ detectado'
                          : data.document_type === 'cpf'
                          ? 'CPF detectado'
                          : 'Tipo não identificado'}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={data.document_number || ''}
                      onChange={event => handleDocumentChange(event.target.value)}
                      className={inputClass(Boolean(fieldErrors.document_number || fieldErrors.document_type), '!pr-12')}
                      placeholder="Digite seu CPF ou CNPJ"
                      maxLength={18}
                      required
                    />
                    <ValidationIcon field="document_number" />
                  </div>
                  {fieldErrors.document_number && (
                    <p className="mt-2 flex items-center gap-2 text-xs text-rose-300">
                      <AlertTriangle className="h-4 w-4" />
                      {fieldErrors.document_number}
                    </p>
                  )}
                  {!fieldErrors.document_number && fieldErrors.document_type && (
                    <p className="mt-2 flex items-center gap-2 text-xs text-rose-300">
                      <AlertTriangle className="h-4 w-4" />
                      {fieldErrors.document_type}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-8 rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[#7AD3FF]">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-300">Endereço</h3>
                    <p className="text-xs text-slate-400">Informações necessárias para emissão de contratos e NF.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                    CEP *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={data.address?.zipCode || ''}
                      onChange={event => handleAddressChange('zipCode', event.target.value)}
                      className={inputClass(Boolean(fieldErrors['address.zipCode']), '!pr-12')}
                      placeholder="00000-000"
                      maxLength={9}
                      required
                    />
                    <ValidationIcon field="address.zipCode" />
                  </div>
                  {isFetchingAddress && (
                    <p className="flex items-center gap-2 text-xs text-cyan-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Buscando endereço automaticamente...
                    </p>
                  )}
                  {!isFetchingAddress && !fieldErrors['address.zipCode'] && (
                    <p className="text-xs text-slate-400">
                      Digite seu CEP e preencheremos os campos automaticamente.
                    </p>
                  )}
                  {fieldErrors['address.zipCode'] && (
                    <p className="flex items-center gap-2 text-xs text-rose-300">
                      <AlertTriangle className="h-4 w-4" />
                      {fieldErrors['address.zipCode']}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                      Rua *
                    </label>
                    <input
                      type="text"
                      value={data.address?.street || ''}
                      onChange={event => handleAddressChange('street', event.target.value)}
                      className={inputClass(Boolean(fieldErrors['address.street']))}
                      placeholder="Nome da rua"
                      required
                    />
                    {fieldErrors['address.street'] && (
                      <p className="flex items-center gap-2 text-xs text-rose-300">
                        <AlertTriangle className="h-4 w-4" />
                        {fieldErrors['address.street']}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                      Número *
                    </label>
                    <input
                      type="text"
                      value={data.address?.number || ''}
                      onChange={event => handleAddressChange('number', event.target.value)}
                      className={inputClass(Boolean(fieldErrors['address.number']))}
                      placeholder="123"
                      required
                    />
                    {fieldErrors['address.number'] && (
                      <p className="flex items-center gap-2 text-xs text-rose-300">
                        <AlertTriangle className="h-4 w-4" />
                        {fieldErrors['address.number']}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                      Complemento
                    </label>
                    <input
                      type="text"
                      value={data.address?.complement || ''}
                      onChange={event => handleAddressChange('complement', event.target.value)}
                      className={inputClass(false)}
                      placeholder="Apto, casa, etc."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                      Bairro *
                    </label>
                    <input
                      type="text"
                      value={data.address?.neighborhood || ''}
                      onChange={event => handleAddressChange('neighborhood', event.target.value)}
                      className={inputClass(Boolean(fieldErrors['address.neighborhood']))}
                      placeholder="Nome do bairro"
                      required
                    />
                    {fieldErrors['address.neighborhood'] && (
                      <p className="flex items-center gap-2 text-xs text-rose-300">
                        <AlertTriangle className="h-4 w-4" />
                        {fieldErrors['address.neighborhood']}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                      Cidade *
                    </label>
                    <input
                      type="text"
                      value={data.address?.city || ''}
                      onChange={event => handleAddressChange('city', event.target.value)}
                      className={inputClass(Boolean(fieldErrors['address.city']))}
                      placeholder="Nome da cidade"
                      required
                    />
                    {fieldErrors['address.city'] && (
                      <p className="flex items-center gap-2 text-xs text-rose-300">
                        <AlertTriangle className="h-4 w-4" />
                        {fieldErrors['address.city']}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                      Estado *
                    </label>
                    <select
                      value={data.address?.state || ''}
                      onChange={event => handleAddressChange('state', event.target.value)}
                      className={selectClass(Boolean(fieldErrors['address.state']))}
                      required
                    >
                      <option value="">UF</option>
                      {STATES.map(state => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                    {fieldErrors['address.state'] && (
                      <p className="flex items-center gap-2 text-xs text-rose-300">
                        <AlertTriangle className="h-4 w-4" />
                        {fieldErrors['address.state']}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-8">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className="group flex items-center gap-3 rounded-full border border-white/10 px-6 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-slate-300 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
              Voltar
            </button>

            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                disabled={!validateStep(currentStep)}
                className="group flex items-center gap-3 rounded-full bg-gradient-to-r from-[#4A5BFF] via-[#764BFF] to-[#B249FF] px-8 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-white shadow-[0_22px_60px_-28px_rgba(91,99,255,0.75)] transition hover:shadow-[0_22px_70px_-24px_rgba(91,99,255,0.85)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Próximo
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={!validateStep(3) || loading}
                className="group flex items-center gap-3 rounded-full bg-gradient-to-r from-[#3AF9BC] via-[#4FDEFF] to-[#8A7CFF] px-10 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-[#0B1023] shadow-[0_22px_65px_-28px_rgba(74,225,204,0.55)] transition hover:shadow-[0_22px_75px_-24px_rgba(74,225,204,0.68)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-[#0B1023]"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Finalizar
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorOnboarding;