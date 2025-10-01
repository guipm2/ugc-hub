import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, User, CreditCard, FileText, Check, Camera, TrendingUp, Globe, Phone, MapPin, Hash, Calendar, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface OnboardingData {
  // Etapa 1 - Qualificação
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

const CreatorOnboarding: React.FC<CreatorOnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
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
  const { user } = useAuth();

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
  };

  const handleAddressChange = (field: string, value: string) => {
    setData(prev => ({
      ...prev,
      address: {
        ...prev.address!,
        [field]: value
      }
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: // Qualificação - apenas idade é obrigatória
        return !!(data.age && data.age >= 13 && data.gender && data.niches && data.niches.length > 0);
      case 2: // Dados bancários
        return !!(data.pix_key && data.pix_key.trim().length > 0);
      case 3: // Dados para contrato
        return !!(
          data.full_name?.trim() &&
          data.phone?.trim() &&
          data.email?.trim() &&
          data.document_type &&
          data.document_number?.trim() &&
          data.address?.street?.trim() &&
          data.address?.number?.trim() &&
          data.address?.neighborhood?.trim() &&
          data.address?.city?.trim() &&
          data.address?.state?.trim() &&
          data.address?.zipCode?.trim()
        );
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleComplete = async () => {
    if (!validateStep(3) || !user?.id) return;

    setLoading(true);
    try {
      const updateData = {
        instagram_url: data.instagram_url || null,
        tiktok_url: data.tiktok_url || null,
        portfolio_url: data.portfolio_url || null,
        age: data.age,
        gender: data.gender,
        niches: data.niches,
        pix_key: data.pix_key,
        full_name: data.full_name,
        phone: data.phone,
        address: data.address,
        document_type: data.document_type,
        document_number: data.document_number,
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

  const formatCPFCNPJ = (value: string, type: 'cpf' | 'cnpj') => {
    const numbers = value.replace(/\D/g, '');
    if (type === 'cpf') {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  };

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
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
              {/* Idade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Idade *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    min="13"
                    max="100"
                    value={data.age || ''}
                    onChange={(e) => setData(prev => ({ ...prev, age: parseInt(e.target.value) || undefined }))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: 25"
                    required
                  />
                </div>
              </div>

              {/* Gênero */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gênero *
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    value={data.gender || ''}
                    onChange={(e) => setData(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              </div>
            </div>

            {/* URLs Sociais */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Perfil Instagram (opcional)
                </label>
                <div className="relative">
                  <Camera className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="url"
                    value={data.instagram_url || ''}
                    onChange={(e) => setData(prev => ({ ...prev, instagram_url: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://instagram.com/seuperfil"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Perfil TikTok (opcional)
                </label>
                <div className="relative">
                  <TrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="url"
                    value={data.tiktok_url || ''}
                    onChange={(e) => setData(prev => ({ ...prev, tiktok_url: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://tiktok.com/@seuperfil"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Site ou Portfólio (opcional)
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="url"
                    value={data.portfolio_url || ''}
                    onChange={(e) => setData(prev => ({ ...prev, portfolio_url: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://seusite.com"
                  />
                </div>
              </div>
            </div>

            {/* Nichos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Seus nichos * <span className="text-sm text-gray-500">(selecione pelo menos um)</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {NICHE_OPTIONS.map((niche) => (
                  <button
                    key={niche}
                    type="button"
                    onClick={() => handleNicheToggle(niche)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      data.niches?.includes(niche)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {niche}
                  </button>
                ))}
              </div>
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
                  onChange={(e) => setData(prev => ({ ...prev, pix_key: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Sua chave PIX (CPF, email, telefone ou chave aleatória)"
                  required
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Pode ser seu CPF, email, telefone ou uma chave aleatória
              </p>
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
                  onChange={(e) => setData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Seu nome completo"
                  required
                />
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
                    onChange={(e) => setData(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={data.email || ''}
                  onChange={(e) => setData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="seu@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Documento *
                </label>
                <select
                  value={data.document_type || ''}
                  onChange={(e) => setData(prev => ({ ...prev, document_type: e.target.value as 'cpf' | 'cnpj' }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecione</option>
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {data.document_type === 'cnpj' ? 'CNPJ' : 'CPF'} *
                </label>
                <input
                  type="text"
                  value={data.document_number || ''}
                  onChange={(e) => {
                    const formatted = data.document_type ? formatCPFCNPJ(e.target.value, data.document_type) : e.target.value;
                    setData(prev => ({ ...prev, document_number: formatted }));
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={data.document_type === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00'}
                  maxLength={data.document_type === 'cnpj' ? 18 : 14}
                  required
                />
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nome da rua"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número *
                  </label>
                  <input
                    type="text"
                    value={data.address?.number || ''}
                    onChange={(e) => handleAddressChange('number', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="123"
                    required
                  />
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nome do bairro"
                    required
                  />
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nome da cidade"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado *
                  </label>
                  <select
                    value={data.address?.state || ''}
                    onChange={(e) => handleAddressChange('state', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">UF</option>
                    {STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CEP *
                  </label>
                  <input
                    type="text"
                    value={data.address?.zipCode || ''}
                    onChange={(e) => handleAddressChange('zipCode', formatCEP(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="00000-000"
                    maxLength={9}
                    required
                  />
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