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

      if (addressFetchTimeoutRef.current) {
        clearTimeout(addressFetchTimeoutRef.current);
        addressFetchTimeoutRef.current = null;
      }

      if (digits.length === 8 && digits !== lastFetchedCepRef.current) {
        setIsFetchingAddress(true);

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

            lastFetchedCepRef.current = digits;
          } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            setStepErrors({
              'address.zipCode': 'Não foi possível localizar o endereço. Verifique o CEP ou preencha manualmente.'
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
    clearFieldError('birth_date');
  };

  const handleSimpleFieldChange = (field: keyof OnboardingData, value: string) => {
    setData(prev => ({
      ...prev,
      [field]: value
    }));
    clearFieldError(field as string);
  };

  const handleInstagramChange = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setData(prev => ({ ...prev, instagram_url: '' }));
      clearFieldError('instagram_url');
      return;
    }

    const normalized = trimmed.startsWith('http')
      ? trimmed
      : `https://instagram.com/${trimmed.replace(/^@/, '')}`;

    setData(prev => ({ ...prev, instagram_url: normalized }));
    clearFieldError('instagram_url');
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
      return;
    }

    const detectedType = detectDocumentType(digits) ?? undefined;
    const formatted = formatDocument(digits, detectedType);

    setData(prev => ({
      ...prev,
      document_number: formatted,
      document_type: detectedType ?? prev.document_type
    }));

    clearFieldError('document_number');
    if (detectedType) {
      clearFieldError('document_type');
    }
  };

  useEffect(() => {
    // Pré-preencher com dados do usuário se disponível
    if (user?.email) {
      setData(prev => ({ ...prev, email: user.email || '' }));
    }
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

  const handleComplete = async () => {
    if (!validateStep(3, true) || !user?.id) return;

    setLoading(true);
    try {
      const updateData = {
        birth_date: data.birth_date || null,
        instagram_url: data.instagram_url?.trim() || null,
        tiktok_url: data.tiktok_url?.trim() || null,
        portfolio_url: data.portfolio_url?.trim() || null,
        age: data.age,
        gender: data.gender,
        niches: data.niches,
        pix_key: data.pix_key?.trim() || null,
        full_name: data.full_name?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address,
        document_type: data.document_type,
        document_number: data.document_number ? stripFormatting(data.document_number) : null,
        onboarding_completed: true,
        onboarding_step: 4,
        onboarding_completed_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      onComplete();
    } catch (error) {
      console.error('Erro ao salvar onboarding:', error);
      alert('Erro ao salvar informações. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete seu perfil</h1>
          <p className="text-gray-600">Para começar a se candidatar às oportunidades, precisamos conhecer você melhor</p>
          
          {/* Progress Bar */}
          <div className="flex items-center justify-center mt-6 space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {currentStep > step ? <Check className="h-5 w-5" /> : step}
                </div>
                {step < 3 && (
                  <div className={`w-16 h-1 mx-2 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          <div className="flex justify-center mt-2 space-x-8 text-sm">
            <span className={currentStep >= 1 ? 'text-blue-600 font-medium' : 'text-gray-500'}>
              Qualificação
            </span>
            <span className={currentStep >= 2 ? 'text-blue-600 font-medium' : 'text-gray-500'}>
              Dados Bancários
            </span>
            <span className={currentStep >= 3 ? 'text-blue-600 font-medium' : 'text-gray-500'}>
              Dados Contratuais
            </span>
          </div>
        </div>

        {/* Step 1 - Qualificação */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Dados de Qualificação</h2>
                <p className="text-gray-600">Conte-nos mais sobre você e seu trabalho</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de nascimento *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={data.birth_date || ''}
                    max={maxBirthDate}
                    min={minBirthDate}
                    onChange={(e) => handleBirthDateChange(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                      fieldErrors.birth_date
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    required
                  />
                </div>
                {data.birth_date && (
                  <p className="mt-2 text-sm text-gray-500">
                    Idade calculada:{' '}
                    <span className="font-medium">
                      {data.age !== undefined ? `${data.age} anos` : '—'}
                    </span>
                  </p>
                )}
                {fieldErrors.birth_date && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {fieldErrors.birth_date}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gênero *
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    value={data.gender || ''}
                    onChange={(e) => handleSimpleFieldChange('gender', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                      fieldErrors.gender
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    required
                  >
                    <option value="">Selecione</option>
                    {GENDER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {fieldErrors.gender && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {fieldErrors.gender}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Perfil Instagram *
                </label>
                <div className="relative">
                  <Camera className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="url"
                    value={data.instagram_url || ''}
                    onChange={(e) => handleSimpleFieldChange('instagram_url', e.target.value)}
                    onBlur={(e) => handleInstagramChange(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                      fieldErrors.instagram_url
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="https://instagram.com/seuperfil"
                    required
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">Informe o link completo ou seu @. Usamos isso para entender seu alcance.</p>
                {fieldErrors.instagram_url && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {fieldErrors.instagram_url}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Perfil TikTok (opcional)
                </label>
                <div className="relative">
                  <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="url"
                    value={data.tiktok_url || ''}
                    onChange={(e) => handleSimpleFieldChange('tiktok_url', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://tiktok.com/@seuperfil"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Site ou Portfólio (opcional)
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="url"
                    value={data.portfolio_url || ''}
                    onChange={(e) => handleSimpleFieldChange('portfolio_url', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://seusite.com"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Seus nichos * <span className="text-sm text-gray-500">(escolha pelo menos um)</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {NICHE_OPTIONS.map((niche) => {
                  const active = data.niches?.includes(niche);
                  return (
                    <button
                      key={niche}
                      type="button"
                      onClick={() => handleNicheToggle(niche)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                        active
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200'
                      }`}
                    >
                      {niche}
                    </button>
                  );
                })}
              </div>
              {fieldErrors.niches && (
                <p className="mt-3 text-sm text-red-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {fieldErrors.niches}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 2 - Dados Bancários */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Dados Bancários</h2>
                <p className="text-gray-600">Para receber seus pagamentos</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chave PIX *
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={data.pix_key || ''}
                  onChange={(e) => handleSimpleFieldChange('pix_key', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                    fieldErrors.pix_key
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="Sua chave PIX (CPF, email, telefone ou chave aleatória)"
                  required
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Pode ser seu CPF, email, telefone ou uma chave aleatória
              </p>
              {fieldErrors.pix_key && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {fieldErrors.pix_key}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 3 - Dados para Contrato */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Dados para Contrato</h2>
                <p className="text-gray-600">Informações necessárias para formalização</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={data.full_name || ''}
                  onChange={(e) => handleSimpleFieldChange('full_name', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                    fieldErrors.full_name
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="Seu nome completo"
                  required
                />
                {fieldErrors.full_name && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {fieldErrors.full_name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    value={data.phone || ''}
                    onChange={(e) => handleSimpleFieldChange('phone', formatPhone(e.target.value))}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                      fieldErrors.phone
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>
                {fieldErrors.phone && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {fieldErrors.phone}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={data.email || ''}
                  readOnly
                  className={`w-full px-4 py-3 border rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed focus:outline-none ${
                    fieldErrors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="seu@email.com"
                  required
                />
                <p className="mt-2 text-sm text-gray-500">Usamos o email da sua conta. Caso precise alterar, atualize em configurações.</p>
                {fieldErrors.email && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    CPF ou CNPJ *
                  </label>
                  {data.document_number && (
                    <span
                      className={`text-xs px-2 py-1 rounded-full border ${
                        data.document_type
                          ? 'border-blue-600 text-blue-600 bg-blue-50'
                          : 'border-red-500 text-red-600 bg-red-50'
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
                <input
                  type="text"
                  value={data.document_number || ''}
                  onChange={(e) => handleDocumentChange(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                    fieldErrors.document_number || fieldErrors.document_type
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="Digite seu CPF ou CNPJ"
                  maxLength={18}
                  required
                />
                {fieldErrors.document_number && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {fieldErrors.document_number}
                  </p>
                )}
                {!fieldErrors.document_number && fieldErrors.document_type && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {fieldErrors.document_type}
                  </p>
                )}
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Endereço
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rua *
                  </label>
                  <input
                    type="text"
                    value={data.address?.street || ''}
                    onChange={(e) => handleAddressChange('street', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                      fieldErrors['address.street']
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="Nome da rua"
                    required
                  />
                  {fieldErrors['address.street'] && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {fieldErrors['address.street']}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número *
                  </label>
                  <input
                    type="text"
                    value={data.address?.number || ''}
                    onChange={(e) => handleAddressChange('number', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                      fieldErrors['address.number']
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="123"
                    required
                  />
                  {fieldErrors['address.number'] && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {fieldErrors['address.number']}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={data.address?.complement || ''}
                    onChange={(e) => handleAddressChange('complement', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Apto, casa, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bairro *
                  </label>
                  <input
                    type="text"
                    value={data.address?.neighborhood || ''}
                    onChange={(e) => handleAddressChange('neighborhood', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                      fieldErrors['address.neighborhood']
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="Nome do bairro"
                    required
                  />
                  {fieldErrors['address.neighborhood'] && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {fieldErrors['address.neighborhood']}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    value={data.address?.city || ''}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                      fieldErrors['address.city']
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="Nome da cidade"
                    required
                  />
                  {fieldErrors['address.city'] && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {fieldErrors['address.city']}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado *
                  </label>
                  <select
                    value={data.address?.state || ''}
                    onChange={(e) => handleAddressChange('state', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                      fieldErrors['address.state']
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    required
                  >
                    <option value="">UF</option>
                    {STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                  {fieldErrors['address.state'] && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {fieldErrors['address.state']}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CEP *
                  </label>
                  <input
                    type="text"
                    value={data.address?.zipCode || ''}
                    onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                      fieldErrors['address.zipCode']
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="00000-000"
                    maxLength={9}
                    required
                  />
                  {isFetchingAddress && (
                    <p className="mt-2 text-sm text-blue-600 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Buscando endereço automaticamente...
                    </p>
                  )}
                  {fieldErrors['address.zipCode'] && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {fieldErrors['address.zipCode']}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-8 border-t border-gray-200 mt-8">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>

          {currentStep < 3 ? (
            <button
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
            >
              Próximo
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!validateStep(3) || loading}
              className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
  );
};

export default CreatorOnboarding;