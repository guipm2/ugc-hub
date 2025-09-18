import React from 'react';
import { Users, Target, TrendingUp } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  const features = [
    {
      icon: Target,
      title: 'Oportunidades Exclusivas',
      description: 'Acesse campanhas de marcas renomadas e faça parcerias lucrativas'
    },
    {
      icon: Users,
      title: 'Rede de Criadores',
      description: 'Conecte-se com outros criadores e compartilhe experiências'
    },
    {
      icon: TrendingUp,
      title: 'Cresça Sua Audiência',
      description: 'Ferramentas e insights para expandir seu alcance e engajamento'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center text-white font-bold text-lg backdrop-blur-sm">
                UGC
              </div>
              <span className="ml-3 text-2xl font-bold">UGC Hub</span>
            </div>
            <h1 className="text-4xl font-bold mb-4 leading-tight">
              Conecte-se com as melhores oportunidades
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              A plataforma que conecta criadores de conteúdo com marcas inovadoras
            </p>
          </div>

          <div className="space-y-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-blue-100 text-sm">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-white bg-opacity-10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-32 w-24 h-24 bg-purple-300 bg-opacity-20 rounded-full blur-lg"></div>
        <div className="absolute top-1/2 right-10 w-16 h-16 bg-blue-300 bg-opacity-20 rounded-full blur-md"></div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
              UGC
            </div>
            <span className="ml-3 text-2xl font-bold text-gray-900">UGC Hub</span>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
            <p className="mt-2 text-gray-600">{subtitle}</p>
          </div>

          <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;