import { useState, useEffect } from 'react';
import { Eye, Calendar, Award, Target, Clock, ArrowRight, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';

interface Application {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  applied_at: string;
  opportunity: {
    id: string;
    title: string;
    company: string;
    budget_min: number;
    budget_max: number;
    deadline: string;
  };
}

interface Deliverable {
  id: string;
  title: string;
  description: string;
  due_date: string;
  priority: number;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  opportunity: {
    title: string;
    company: string;
    budget_min?: number;
    budget_max?: number;
  };
}

interface UpcomingDeadline {
  id: string;
  title: string;
  company: string;
  deadline: string;
  description: string;
}

const Dashboard = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<UpcomingDeadline[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [loadingDeadlines, setLoadingDeadlines] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const { user } = useAuth();
  const { navigate } = useRouter();

  const getPriorityLabel = (priority: number) => {
    const labels = { 1: 'Baixa', 2: 'Normal', 3: 'Alta', 4: 'Urgente', 5: 'Crítica' };
    return labels[priority as keyof typeof labels] || 'Normal';
  };

  useEffect(() => {
    const fetchApplications = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('opportunity_applications')
          .select(`
            id,
            status,
            applied_at,
            opportunity:opportunities (
              id,
              title,
              company,
              budget_min,
              budget_max,
              deadline
            )
          `)
          .eq('creator_id', user.id)
          .order('applied_at', { ascending: false });

        if (error) {
          console.error('Erro ao buscar candidaturas:', error);
        } else {
          // Fix: Garantir que opportunity seja um objeto, não array
          const fixedData = data?.map(app => ({
            ...app,
            opportunity: Array.isArray(app.opportunity) ? app.opportunity[0] : app.opportunity
          })) || [];
          setApplications(fixedData);
        }
      } catch (err) {
        console.error('Erro ao buscar candidaturas:', err);
      } finally {
        setLoadingApplications(false);
      }
    };

    const fetchUpcomingDeadlines = async () => {
      if (!user) return;

      try {
        // Busca deliverables específicos definidos pelo analista (próximos 30 dias)
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        
        const { data, error } = await supabase
          .from('project_deliverables')
          .select(`
            id,
            title,
            description,
            due_date,
            priority,
            status,
            opportunity:opportunities(
              title,
              company,
              budget_min,
              budget_max
            )
          `)
          .eq('creator_id', user.id)
          .order('due_date', { ascending: true });

        if (error) {
          console.error('Erro ao buscar deliverables:', error);
          // Fallback para busca por oportunidades se a tabela não existir ainda
          await fetchUpcomingDeadlinesFallback();
        } else {
          // Separar deliverables por status e calcular earnings
          const allDeliverables = data?.map(deliverable => {
            const opportunity = Array.isArray(deliverable.opportunity) 
              ? deliverable.opportunity[0] 
              : deliverable.opportunity;
            
            return {
              ...deliverable,
              opportunity: opportunity || { title: 'Projeto', company: 'Empresa', budget_min: 0, budget_max: 0 }
            };
          }) as Deliverable[];
          
          setDeliverables(allDeliverables || []);
          
          // Calcular earnings estimados baseado em projetos aprovados
          const completedDeliverables = allDeliverables?.filter(d => d.status === 'completed') || [];
          const estimatedEarnings = completedDeliverables.reduce((total, deliverable) => {
            const budgetMin = deliverable.opportunity.budget_min || 0;
            const budgetMax = deliverable.opportunity.budget_max || 0;
            const avgBudget = budgetMin && budgetMax ? (budgetMin + budgetMax) / 2 : 0;
            return total + avgBudget;
          }, 0);
          setTotalEarnings(estimatedEarnings);

          // Filtrar apenas próximos prazos para a seção de deadlines
          const upcomingDeadlinesData = allDeliverables
            ?.filter(deliverable => {
              const dueDate = new Date(deliverable.due_date);
              return dueDate >= new Date() && 
                     dueDate <= thirtyDaysFromNow && 
                     ['pending', 'in_progress'].includes(deliverable.status);
            })
            .slice(0, 3)
            .map(deliverable => ({
              id: deliverable.id,
              title: deliverable.title,
              company: deliverable.opportunity?.company || 'Empresa',
              deadline: deliverable.due_date,
              description: deliverable.description || `${deliverable.title} - Prioridade: ${getPriorityLabel(deliverable.priority)}`
            })) as UpcomingDeadline[];
          
          setUpcomingDeadlines(upcomingDeadlinesData || []);
        }
      } catch (error) {
        console.error('Erro ao buscar deliverables:', error);
        // Fallback para busca por oportunidades se houver erro
        await fetchUpcomingDeadlinesFallback();
      } finally {
        setLoadingDeadlines(false);
      }
    };

    // Função de fallback que usa o sistema antigo
    const fetchUpcomingDeadlinesFallback = async () => {
      if (!user) return;

      try {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        
        const { data, error } = await supabase
          .from('opportunity_applications')
          .select(`
            opportunity:opportunities (
              id,
              title,
              company,
              deadline,
              description
            )
          `)
          .eq('creator_id', user.id)
          .eq('status', 'approved')
          .gte('opportunity.deadline', new Date().toISOString().split('T')[0])
          .lte('opportunity.deadline', thirtyDaysFromNow.toISOString().split('T')[0])
          .order('opportunity.deadline', { ascending: true })
          .limit(3);

        if (error) {
          console.error('Erro ao buscar prazos fallback:', error);
        } else {
          const upcomingDeadlinesData = data
            ?.map(app => Array.isArray(app.opportunity) ? app.opportunity[0] : app.opportunity)
            .filter(Boolean) as UpcomingDeadline[];
          
          setUpcomingDeadlines(upcomingDeadlinesData || []);
        }
      } catch (error) {
        console.error('Erro ao buscar prazos fallback:', error);
      }
    };

    if (user) {
      fetchApplications();
      fetchUpcomingDeadlines();
    }
  }, [user]);

  const stats = [
    { 
      label: 'Oportunidades Aplicadas', 
      value: applications.length.toString(), 
      icon: Target, 
      color: 'text-blue-600', 
      bg: 'bg-blue-100',
      description: 'Total de candidaturas enviadas'
    },
    { 
      label: 'Propostas Aceitas', 
      value: applications.filter(app => app.status === 'approved').length.toString(), 
      icon: Award, 
      color: 'text-green-600', 
      bg: 'bg-green-100',
      description: 'Projetos aprovados ativos'
    },
    { 
      label: 'Candidaturas Pendentes', 
      value: applications.filter(app => app.status === 'pending').length.toString(), 
      icon: Clock, 
      color: 'text-yellow-600', 
      bg: 'bg-yellow-100',
      description: 'Aguardando análise'
    },
    { 
      label: 'Earnings Estimados', 
      value: totalEarnings > 0 ? `R$ ${(totalEarnings / 1000).toFixed(1)}k` : 'R$ 0', 
      icon: DollarSign, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-100',
      description: 'Baseado em projetos completados'
    },
    { 
      label: 'Tarefas Ativas', 
      value: deliverables.filter(d => ['pending', 'in_progress'].includes(d.status)).length.toString(), 
      icon: TrendingUp, 
      color: 'text-purple-600', 
      bg: 'bg-purple-100',
      description: 'Deliverables em andamento'
    },
    { 
      label: 'Prazos Urgentes', 
      value: (() => {
        const today = new Date();
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(today.getDate() + 3);
        return deliverables.filter(d => {
          if (!['pending', 'in_progress'].includes(d.status)) return false;
          const dueDate = new Date(d.due_date);
          return dueDate <= threeDaysFromNow;
        }).length.toString();
      })(), 
      icon: AlertCircle, 
      color: 'text-red-600', 
      bg: 'bg-red-100',
      description: 'Entrega em até 3 dias'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Acompanhe suas atividades e métricas de performance</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/creators/opportunities')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Target className="h-4 w-4" />
            Ver Oportunidades
          </button>
          <button 
            onClick={() => navigate('/creators/projects')}
            className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Meus Projetos
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const getNavigationPath = () => {
            switch(stat.label) {
              case 'Oportunidades Aplicadas':
              case 'Candidaturas Pendentes':
                return '/creators/opportunities';
              case 'Propostas Aceitas':
              case 'Earnings Estimados':
              case 'Tarefas Ativas':
              case 'Prazos Urgentes':
                return '/creators/projects';
              default:
                return '/creators/dashboard';
            }
          };
          
          return (
            <div 
              key={index} 
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all duration-200 cursor-pointer group hover:border-blue-200"
              onClick={() => navigate(getNavigationPath())}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-lg ${stat.bg} group-hover:scale-105 transition-transform`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
                <p className="text-xs text-gray-500">{stat.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Applications */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Minhas Candidaturas</h3>
          {loadingApplications ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Nenhuma candidatura ainda</p>
              <p className="text-sm text-gray-500">Candidate-se a oportunidades para vê-las aqui</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {applications.slice(0, 5).map((application) => (
                  <div 
                    key={application.id} 
                    className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-gray-200"
                    onClick={() => {
                      if (application.status === 'approved') {
                        navigate('/creators/projects');
                      } else {
                        navigate('/creators/opportunities');
                      }
                    }}
                  >
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        application.status === 'approved' 
                          ? 'bg-green-100' 
                          : application.status === 'rejected'
                          ? 'bg-red-100'
                          : 'bg-yellow-100'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          application.status === 'approved' 
                            ? 'bg-green-600' 
                            : application.status === 'rejected'
                            ? 'bg-red-600'
                            : 'bg-yellow-600'
                        }`}></div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                            {application.opportunity.title}
                          </p>
                          <p className="text-sm text-gray-600">{application.opportunity.company}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-gray-500">
                              {new Date(application.applied_at).toLocaleDateString('pt-BR')}
                            </p>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              application.status === 'approved' 
                                ? 'bg-green-100 text-green-700' 
                                : application.status === 'rejected'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {application.status === 'approved' 
                                ? 'Aprovado' 
                                : application.status === 'rejected'
                                ? 'Rejeitado'
                                : 'Pendente'
                              }
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {applications.length > 5 && (
                <div className="pt-4 border-t border-gray-200">
                  <button 
                    onClick={() => navigate('/creators/opportunities')}
                    className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-1 py-2"
                  >
                    Ver todas as candidaturas <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Próximos Prazos</h3>
          <button 
            onClick={() => navigate('/creators/projects')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            Ver todos <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        
        {loadingDeadlines ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : upcomingDeadlines.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingDeadlines.map((deadline) => {
              const deadlineDate = new Date(deadline.deadline);
              const today = new Date();
              const daysLeft = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              
              // Cor baseada na urgência
              const getUrgencyColor = (days: number) => {
                if (days <= 3) return { border: 'border-red-200', bg: 'bg-red-50', text: 'text-red-800', icon: 'text-red-600', hover: 'hover:border-red-300' };
                if (days <= 7) return { border: 'border-orange-200', bg: 'bg-orange-50', text: 'text-orange-800', icon: 'text-orange-600', hover: 'hover:border-orange-300' };
                return { border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-800', icon: 'text-blue-600', hover: 'hover:border-blue-300' };
              };
              
              const colors = getUrgencyColor(daysLeft);
              
              return (
                <div 
                  key={deadline.id}
                  className={`border ${colors.border} ${colors.bg} rounded-lg p-4 hover:shadow-sm transition-all cursor-pointer ${colors.hover}`}
                  onClick={() => navigate('/creators/projects')}
                >
                  <div className="flex items-center mb-2">
                    <Calendar className={`h-4 w-4 ${colors.icon} mr-2`} />
                    <span className={`text-sm font-medium ${colors.text}`}>
                      {deadlineDate.toLocaleDateString('pt-BR')}
                      {daysLeft <= 7 && (
                        <span className="ml-2 text-xs">
                          ({daysLeft === 0 ? 'Hoje' : daysLeft === 1 ? 'Amanhã' : `${daysLeft} dias`})
                        </span>
                      )}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900">{deadline.title}</p>
                  <p className="text-sm text-gray-600">{deadline.company}</p>
                  {deadline.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{deadline.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Nenhum prazo próximo encontrado</p>
            <p className="text-xs text-gray-400 mt-1">Prazos aparecerão aqui quando você tiver projetos aprovados</p>
          </div>
        )}
      </div>

      {/* Creator Performance Insights */}
      {applications.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Insights de Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Success Rate */}
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {applications.length > 0 
                  ? `${Math.round((applications.filter(app => app.status === 'approved').length / applications.length) * 100)}%`
                  : '0%'
                }
              </div>
              <div className="text-sm font-medium text-gray-600">Taxa de Aprovação</div>
              <div className="text-xs text-gray-500 mt-1">
                {applications.filter(app => app.status === 'approved').length} de {applications.length} candidaturas
              </div>
            </div>

            {/* Active Projects */}
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                <Target className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {applications.filter(app => app.status === 'approved').length}
              </div>
              <div className="text-sm font-medium text-gray-600">Projetos Ativos</div>
              <div className="text-xs text-gray-500 mt-1">
                {deliverables.filter(d => d.status === 'completed').length} deliverables concluídos
              </div>
            </div>

            {/* Response Time */}
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {(() => {
                  const urgentTasks = deliverables.filter(d => {
                    if (!['pending', 'in_progress'].includes(d.status)) return false;
                    const today = new Date();
                    const dueDate = new Date(d.due_date);
                    const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return daysLeft <= 3;
                  }).length;
                  
                  if (urgentTasks > 0) return `${urgentTasks}`;
                  return '✓';
                })()}
              </div>
              <div className="text-sm font-medium text-gray-600">Prazos Urgentes</div>
              <div className="text-xs text-gray-500 mt-1">
                {(() => {
                  const urgentTasks = deliverables.filter(d => {
                    if (!['pending', 'in_progress'].includes(d.status)) return false;
                    const today = new Date();
                    const dueDate = new Date(d.due_date);
                    const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return daysLeft <= 3;
                  }).length;
                  
                  return urgentTasks > 0 ? 'Requer atenção imediata' : 'Todos os prazos em dia';
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;