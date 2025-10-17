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
                      className={inputClass(Boolean(fieldErrors.birth_date), '!pl-12 !pr-4')}
                      required
                    />
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
                      className={inputClass(Boolean(fieldErrors.instagram_url), '!pl-12')}
                      placeholder="https://instagram.com/seuperfil"
                      required
                    />
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
                    className={inputClass(Boolean(fieldErrors.pix_key), '!pl-12')}
                    placeholder="CPF, email, telefone ou chave aleatória"
                    required
                  />
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
                      className={inputClass(Boolean(fieldErrors.phone), '!pl-12')}
                      placeholder="(11) 99999-9999"
                      required
                    />
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
                  <input
                    type="text"
                    value={data.document_number || ''}
                    onChange={event => handleDocumentChange(event.target.value)}
                    className={inputClass(Boolean(fieldErrors.document_number || fieldErrors.document_type))}
                    placeholder="Digite seu CPF ou CNPJ"
                    maxLength={18}
                    required
                  />
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
                  <input
                    type="text"
                    value={data.address?.zipCode || ''}
                    onChange={event => handleAddressChange('zipCode', event.target.value)}
                    className={inputClass(Boolean(fieldErrors['address.zipCode']))}
                    placeholder="00000-000"
                    maxLength={9}
                    required
                  />
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