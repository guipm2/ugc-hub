import React from 'react';
import { ArrowRight, Users, Target, MessageCircle, Star, Zap, Shield, ChevronRight } from 'lucide-react';
import { useRouter } from '../hooks/useRouter';

const LandingPage: React.FC = () => {
  const { navigate } = useRouter();

  const features = [
    {
      icon: Target,
      title: 'Oportunidades Direcionadas',
      description: 'Encontre campanhas que combinam perfeitamente com seu nicho e audiência',
      color: 'text-blue-600',
      bg: 'bg-blue-100'
    },
    {
      icon: Users,
      title: 'Conexão Direta',
      description: 'Conecte-se diretamente com marcas e empresas sem intermediários',
      color: 'text-purple-600',
      bg: 'bg-purple-100'
    },
    {
      icon: MessageCircle,
      title: 'Comunicação Integrada',
      description: 'Sistema de mensagens integrado para negociação e acompanhamento',
      color: 'text-green-600',
      bg: 'bg-green-100'
    },
    {
      icon: Zap,
      title: 'Processo Ágil',
      description: 'Da candidatura à entrega, tudo em uma plataforma otimizada',
      color: 'text-orange-600',
      bg: 'bg-orange-100'
    },
    {
      icon: Shield,
      title: 'Segurança Garantida',
      description: 'Contratos claros e pagamentos seguros para ambas as partes',
      color: 'text-red-600',
      bg: 'bg-red-100'
    },
    {
      icon: Star,
      title: 'Qualidade Premium',
      description: 'Apenas criadores e marcas verificados para garantir excelência',
      color: 'text-yellow-600',
      bg: 'bg-yellow-100'
    }
  ];

  const stats = [
    { number: '500+', label: 'Criadores Ativos' },
    { number: '200+', label: 'Marcas Parceiras' },
    { number: '1000+', label: 'Campanhas Realizadas' },
    { number: '98%', label: 'Satisfação' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            {/* Logo */}
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">UGC</span>
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900">UGC Hub</span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">
                Funcionalidades
              </a>
              <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 transition-colors">
                Como Funciona
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                Preços
              </a>
            </nav>

            {/* Login Buttons */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/login/creators')}
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Sou Criador
              </button>
              <button
                onClick={() => navigate('/login/analysts')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
              >
                Sou Empresa
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-32 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Conecte <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Criadores</span>
              <br />
              com <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">Marcas</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              A plataforma definitiva para User Generated Content. Criadores encontram oportunidades incríveis, 
              marcas descobrem talentos autênticos. Tudo em um só lugar.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => navigate('/login/creators')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                Começar como Criador
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/login/analysts')}
                className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 flex items-center gap-2"
              >
                Encontrar Criadores
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Por que escolher o UGC Hub?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Uma plataforma completa que transforma a forma como criadores e marcas colaboram
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="bg-white rounded-xl p-8 shadow-sm hover:shadow-lg transition-shadow">
                  <div className={`w-12 h-12 ${feature.bg} rounded-lg flex items-center justify-center mb-6`}>
                    <Icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Como funciona?
            </h2>
            <p className="text-xl text-gray-600">
              Processo simples e transparente para ambos os lados
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Para Criadores */}
            <div>
              <h3 className="text-2xl font-bold text-blue-600 mb-8 text-center">
                Para Criadores
              </h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Crie seu perfil</h4>
                    <p className="text-gray-600">Complete seu portfólio com seus melhores trabalhos</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Encontre oportunidades</h4>
                    <p className="text-gray-600">Navegue por campanhas que combinam com seu estilo</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Candidate-se</h4>
                    <p className="text-gray-600">Envie sua proposta e negocie diretamente</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    4
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Crie e entregue</h4>
                    <p className="text-gray-600">Produza conteúdo incrível e receba seu pagamento</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Para Empresas */}
            <div>
              <h3 className="text-2xl font-bold text-purple-600 mb-8 text-center">
                Para Empresas
              </h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Defina sua campanha</h4>
                    <p className="text-gray-600">Crie briefings claros com objetivos e orçamento</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Receba candidaturas</h4>
                    <p className="text-gray-600">Analise propostas de criadores qualificados</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Selecione talentos</h4>
                    <p className="text-gray-600">Escolha os criadores ideais para sua marca</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    4
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Acompanhe resultados</h4>
                    <p className="text-gray-600">Receba conteúdo de alta qualidade e meça impacto</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Pronto para começar?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Junte-se a milhares de criadores e marcas que já transformam ideias em resultados
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/login/creators')}
              className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-colors"
            >
              Cadastrar como Criador
            </button>
            <button
              onClick={() => navigate('/login/analysts')}
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white hover:text-blue-600 transition-colors"
            >
              Cadastrar como Empresa
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">UGC</span>
                </div>
                <span className="ml-3 text-lg font-bold">UGC Hub</span>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                A plataforma que conecta criadores de conteúdo autênticos com marcas visionárias.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Links Rápidos</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Funcionalidades</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">Como Funciona</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Preços</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Suporte</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacidade</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2025 UGC Hub. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;