import React, { useState, useEffect } from 'react';
import { TrendingUp, Target, Award, Clock, DollarSign, AlertCircle, Calendar, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface CreatorStatsData {
  totalApplications: number;
  approvedApplications: number;
  pendingApplications: number;
  rejectedApplications: number;
  totalEarnings: number;
  completedDeliverables: number;
  pendingDeliverables: number;
  overdueDeliverables: number;
  averageResponseTime: number;
  successRate: number;
}

interface CreatorStatsProps {
  variant?: 'full' | 'compact';
  className?: string;
}

const CreatorStats: React.FC<CreatorStatsProps> = ({ variant = 'full', className = '' }) => {
  const [stats, setStats] = useState<CreatorStatsData>({
    totalApplications: 0,
    approvedApplications: 0,
    pendingApplications: 0,
    rejectedApplications: 0,
    totalEarnings: 0,
    completedDeliverables: 0,
    pendingDeliverables: 0,
    overdueDeliverables: 0,
    averageResponseTime: 0,
    successRate: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        // Fetch applications data
        const { data: applications, error: appError } = await supabase
          .from('opportunity_applications')
          .select(`
            id,
            status,
            applied_at,
            opportunity:opportunities (
              budget_min,
              budget_max
            )
          `)
          .eq('creator_id', user.id);

        if (appError) {
          console.error('Erro ao buscar candidaturas:', appError);
          return;
        }

        // Fetch deliverables data
        const { data: deliverables, error: delError } = await supabase
          .from('project_deliverables')
          .select('id, status, due_date, created_at')
          .eq('creator_id', user.id);

        if (delError) {
          console.log('Tabela de deliverables não encontrada, usando dados básicos');
        }

        // Calculate stats
        const totalApplications = applications?.length || 0;
        const approvedApplications = applications?.filter(app => app.status === 'approved').length || 0;
        const pendingApplications = applications?.filter(app => app.status === 'pending').length || 0;
        const rejectedApplications = applications?.filter(app => app.status === 'rejected').length || 0;
        
        const successRate = totalApplications > 0 ? (approvedApplications / totalApplications) * 100 : 0;

        // Calculate estimated earnings from approved projects
        const totalEarnings = applications
          ?.filter(app => app.status === 'approved')
          .reduce((total, app) => {
            const opportunity = Array.isArray(app.opportunity) ? app.opportunity[0] : app.opportunity;
            if (opportunity?.budget_min && opportunity?.budget_max) {
              return total + ((opportunity.budget_min + opportunity.budget_max) / 2);
            }
            return total;
          }, 0) || 0;

        // Calculate deliverable stats
        const completedDeliverables = deliverables?.filter(d => d.status === 'completed').length || 0;
        const pendingDeliverables = deliverables?.filter(d => ['pending', 'in_progress'].includes(d.status)).length || 0;
        
        const today = new Date();
        const overdueDeliverables = deliverables?.filter(d => {
          if (!['pending', 'in_progress'].includes(d.status)) return false;
          const dueDate = new Date(d.due_date);
          return dueDate < today;
        }).length || 0;

        // Calculate average response time (simplified - days between application and first response)
        const respondedApplications = applications?.filter(app => app.status !== 'pending') || [];
        const averageResponseTime = respondedApplications.length > 0
          ? respondedApplications.reduce((total, app) => {
              const appliedDate = new Date(app.applied_at);
              const today = new Date();
              const daysDiff = Math.ceil((today.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));
              return total + daysDiff;
            }, 0) / respondedApplications.length
          : 0;

        setStats({
          totalApplications,
          approvedApplications,
          pendingApplications,
          rejectedApplications,
          totalEarnings,
          completedDeliverables,
          pendingDeliverables,
          overdueDeliverables,
          averageResponseTime,
          successRate
        });

      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getStatItems = () => {
    const allStats = [
      {
        label: 'Taxa de Sucesso',
        value: `${stats.successRate.toFixed(1)}%`,
        icon: TrendingUp,
        color: 'text-green-600',
        bg: 'bg-green-100',
        description: `${stats.approvedApplications} de ${stats.totalApplications} aprovadas`
      },
      {
        label: 'Candidaturas',
        value: stats.totalApplications.toString(),
        icon: Target,
        color: 'text-blue-600',
        bg: 'bg-blue-100',
        description: `${stats.pendingApplications} pendentes`
      },
      {
        label: 'Projetos Ativos',
        value: stats.approvedApplications.toString(),
        icon: Award,
        color: 'text-purple-600',
        bg: 'bg-purple-100',
        description: `${stats.completedDeliverables} deliverables concluídos`
      },
      {
        label: 'Earnings',
        value: stats.totalEarnings > 0 ? `R$ ${(stats.totalEarnings / 1000).toFixed(1)}k` : 'R$ 0',
        icon: DollarSign,
        color: 'text-emerald-600',
        bg: 'bg-emerald-100',
        description: 'Valor estimado de projetos'
      },
      {
        label: 'Tarefas Pendentes',
        value: stats.pendingDeliverables.toString(),
        icon: Calendar,
        color: 'text-yellow-600',
        bg: 'bg-yellow-100',
        description: `${stats.overdueDeliverables} em atraso`
      },
      {
        label: 'Tempo Resposta',
        value: stats.averageResponseTime > 0 ? `${stats.averageResponseTime.toFixed(0)}d` : '-',
        icon: Clock,
        color: 'text-orange-600',
        bg: 'bg-orange-100',
        description: 'Média de resposta a candidaturas'
      },
      {
        label: 'Entregas Feitas',
        value: stats.completedDeliverables.toString(),
        icon: CheckCircle,
        color: 'text-teal-600',
        bg: 'bg-teal-100',
        description: 'Deliverables completados com sucesso'
      },
      {
        label: 'Alertas',
        value: stats.overdueDeliverables.toString(),
        icon: AlertCircle,
        color: stats.overdueDeliverables > 0 ? 'text-red-600' : 'text-gray-400',
        bg: stats.overdueDeliverables > 0 ? 'bg-red-100' : 'bg-gray-100',
        description: stats.overdueDeliverables > 0 ? 'Tarefas em atraso' : 'Nenhum atraso'
      }
    ];

    return variant === 'compact' ? allStats.slice(0, 4) : allStats;
  };

  const statItems = getStatItems();

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Estatísticas de Performance</h3>
        {variant === 'compact' && (
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Ver mais →
          </button>
        )}
      </div>

      <div className={`grid gap-4 ${
        variant === 'compact' 
          ? 'grid-cols-2 lg:grid-cols-4' 
          : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
      }`}>
        {statItems.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
              <div className="text-xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-sm font-medium text-gray-600 mb-1">{stat.label}</div>
              <div className="text-xs text-gray-500">{stat.description}</div>
            </div>
          );
        })}
      </div>

      {/* Performance Insights */}
      {variant === 'full' && stats.totalApplications > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Insights</h4>
          <div className="space-y-2 text-sm text-gray-600">
            {stats.successRate >= 75 && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Excelente taxa de aprovação! Continue assim.</span>
              </div>
            )}
            {stats.overdueDeliverables > 0 && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>Você tem {stats.overdueDeliverables} tarefa(s) em atraso.</span>
              </div>
            )}
            {stats.pendingApplications > 5 && (
              <div className="flex items-center gap-2 text-yellow-600">
                <Clock className="h-4 w-4" />
                <span>Muitas candidaturas pendentes. Acompanhe as respostas.</span>
              </div>
            )}
            {stats.totalApplications < 5 && (
              <div className="flex items-center gap-2 text-blue-600">
                <Target className="h-4 w-4" />
                <span>Candidate-se a mais oportunidades para aumentar suas chances.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatorStats;