import React from 'react';
import { Target, Users, TrendingUp, Eye } from 'lucide-react';

const AnalystOverview: React.FC = () => {
  const stats = [
    { label: 'Oportunidades Ativas', value: '8', icon: Target, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Criadores Conectados', value: '24', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Campanhas Concluídas', value: '12', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Visualizações Totais', value: '156K', icon: Eye, color: 'text-orange-600', bg: 'bg-orange-100' }
  ];

  const recentOpportunities = [
    {
      id: 1,
      title: 'Campanha Skincare - Verão 2024',
      candidates: 15,
      status: 'Ativa',
      created: '2 dias atrás'
    },
    {
      id: 2,
      title: 'Review de Produto Tech',
      candidates: 8,
      status: 'Ativa',
      created: '5 dias atrás'
    },
    {
      id: 3,
      title: 'Lifestyle Content - Fitness',
      candidates: 22,
      status: 'Finalizada',
      created: '1 semana atrás'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Visão Geral</h1>
        <p className="text-gray-600 mt-1">Acompanhe suas campanhas e métricas</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.bg}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Opportunities */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Oportunidades Recentes</h3>
          <div className="space-y-4">
            {recentOpportunities.map((opportunity) => (
              <div key={opportunity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{opportunity.title}</h4>
                  <p className="text-sm text-gray-600">{opportunity.candidates} candidatos • {opportunity.created}</p>
                </div>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                  opportunity.status === 'Ativa' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {opportunity.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Chart Placeholder */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance das Campanhas</h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Gráfico de performance</p>
              <p className="text-sm text-gray-500">Em breve</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalystOverview;