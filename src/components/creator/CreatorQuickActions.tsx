import React from 'react';
import { Search, Target, Calendar, MessageSquare, Award, TrendingUp, Plus, Filter } from 'lucide-react';
import { useRouter } from '../../hooks/useRouter';

interface CreatorQuickActionsProps {
  variant?: 'horizontal' | 'grid';
  className?: string;
}

const CreatorQuickActions: React.FC<CreatorQuickActionsProps> = ({ 
  variant = 'grid', 
  className = '' 
}) => {
  const { navigate } = useRouter();

  const quickActions = [
    {
      id: 'browse-opportunities',
      title: 'Explorar Oportunidades',
      description: 'Encontre novos projetos para se candidatar',
      icon: Search,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      hoverBg: 'hover:bg-blue-200',
      action: () => navigate('/creators/opportunities')
    },
    {
      id: 'apply-opportunity',
      title: 'Candidatar-se Rapidamente',
      description: 'Veja oportunidades recomendadas para você',
      icon: Target,
      color: 'text-green-600',
      bg: 'bg-green-100',
      hoverBg: 'hover:bg-green-200',
      action: () => navigate('/creators/opportunities?filter=recommended')
    },
    {
      id: 'check-deadlines',
      title: 'Verificar Prazos',
      description: 'Veja deliverables e datas importantes',
      icon: Calendar,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      hoverBg: 'hover:bg-orange-200',
      action: () => navigate('/creators/projects?view=deadlines')
    },
    {
      id: 'view-messages',
      title: 'Mensagens',
      description: 'Acompanhe conversas com analistas',
      icon: MessageSquare,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      hoverBg: 'hover:bg-purple-200',
      action: () => navigate('/creators/messages')
    },
    {
      id: 'my-projects',
      title: 'Meus Projetos',
      description: 'Acompanhe projetos aprovados',
      icon: Award,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100',
      hoverBg: 'hover:bg-indigo-200',
      action: () => navigate('/creators/projects')
    },
    {
      id: 'performance',
      title: 'Performance',
      description: 'Veja suas estatísticas e insights',
      icon: TrendingUp,
      color: 'text-teal-600',
      bg: 'bg-teal-100',
      hoverBg: 'hover:bg-teal-200',
      action: () => navigate('/creators/dashboard?section=performance')
    }
  ];

  const displayActions = variant === 'horizontal' ? quickActions.slice(0, 4) : quickActions;

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Ações Rápidas</h3>
        {variant === 'horizontal' && (
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Ver mais →
          </button>
        )}
      </div>

      <div className={`${
        variant === 'horizontal' 
          ? 'flex gap-4 overflow-x-auto pb-2' 
          : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
      }`}>
        {displayActions.map((action) => {
          const Icon = action.icon;
          return (
            <div
              key={action.id}
              onClick={action.action}
              className={`bg-white border border-gray-200 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md hover:border-gray-300 group ${
                variant === 'horizontal' ? 'min-w-64 flex-shrink-0' : ''
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2.5 rounded-lg ${action.bg} ${action.hoverBg} group-hover:scale-105 transition-transform`}>
                  <Icon className={`h-5 w-5 ${action.color}`} />
                </div>
                {variant === 'grid' && (
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                      {action.title}
                    </h4>
                  </div>
                )}
              </div>
              
              {variant === 'horizontal' && (
                <h4 className="font-medium text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {action.title}
                </h4>
              )}
              
              <p className="text-sm text-gray-600 leading-relaxed">
                {action.description}
              </p>

              {/* Hover indicator */}
              <div className="mt-3 flex items-center text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs font-medium">Clique para acessar</span>
                <Plus className="h-3 w-3 ml-1" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Smart Suggestions */}
      {variant === 'grid' && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-4 w-4 text-blue-600" />
            <h4 className="font-medium text-blue-900">Sugestões Personalizadas</h4>
          </div>
          <p className="text-sm text-blue-700 mb-3">
            Com base na sua atividade, recomendamos:
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
              <span>Candidate-se a mais 2-3 oportunidades esta semana</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
              <span>Verifique prazos de deliverables pendentes</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
              <span>Responda mensagens em aberto</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatorQuickActions;