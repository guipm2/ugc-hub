import React, { useState, useEffect } from 'react';
import { Target, Users, TrendingUp, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAnalystAuth } from '../../contexts/AnalystAuthContext';
import ViewOpportunityModal from './ViewOpportunityModal';

interface DashboardStats {
  activeOpportunities: number;
  totalOpportunities: number;
  completedOpportunities: number;
  totalApplications: number;
}

interface RecentOpportunity {
  id: string;
  title: string;
  company: string;
  description: string;
  budget_min: number;
  budget_max: number;
  location: string;
  content_type: string;
  requirements: string[];
  deadline: string;
  status: string;
  candidates_count: number;
  created_at: string;
}

const AnalystOverview: React.FC = () => {
  const { user } = useAnalystAuth();
  const [stats, setStats] = useState<DashboardStats>({
    activeOpportunities: 0,
    totalOpportunities: 0,
    completedOpportunities: 0,
    totalApplications: 0,
  });
  const [recentOpportunities, setRecentOpportunities] = useState<RecentOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOpportunity, setSelectedOpportunity] = useState<RecentOpportunity | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Buscar estatísticas das oportunidades
        const { data: opportunities, error: opportunitiesError } = await supabase
          .from('opportunities')
          .select('*')
          .eq('created_by', user?.id)
          .order('created_at', { ascending: false });

        if (opportunitiesError) {
          console.error('Erro ao buscar oportunidades:', opportunitiesError);
          return;
        }

        // Calcular estatísticas
        const activeOpportunities = opportunities?.filter(op => op.status === 'ativo').length || 0;
        const completedOpportunities = opportunities?.filter(op => op.status === 'concluido').length || 0;
        const totalOpportunities = opportunities?.length || 0;

        // Buscar total de candidaturas
        const { count: totalApplications, error: applicationsError } = await supabase
          .from('opportunity_applications')
          .select('id', { count: 'exact', head: true })
          .in('opportunity_id', opportunities?.map(op => op.id) || []);

        if (applicationsError) {
          console.error('Erro ao buscar candidaturas:', applicationsError);
        }

        setStats({
          activeOpportunities,
          totalOpportunities,
          completedOpportunities,
          totalApplications: totalApplications || 0,
        });

        // Calcular contagem dinâmica de candidatos para cada oportunidade
        const opportunitiesWithCandidatesCount = await Promise.all(
          (opportunities || []).map(async (opp) => {
            const { count, error: countError } = await supabase
              .from('opportunity_applications')
              .select('*', { count: 'exact', head: true })
              .eq('opportunity_id', opp.id);

            if (countError) {
              console.error('Erro ao buscar contagem de candidatos:', countError);
            }

            return {
              ...opp,
              candidates_count: count || 0
            };
          })
        );

        // Pegar as 5 oportunidades mais recentes com contagem atualizada
        setRecentOpportunities(opportunitiesWithCandidatesCount.slice(0, 5));

      } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const handleViewOpportunity = (opportunity: RecentOpportunity) => {
    setSelectedOpportunity(opportunity);
    setShowViewModal(true);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 dia atrás';
    if (diffDays <= 7) return `${diffDays} dias atrás`;
    if (diffDays <= 14) return '1 semana atrás';
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} semanas atrás`;
    return `${Math.ceil(diffDays / 30)} meses atrás`;
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'ativo': return { text: 'Ativa', class: 'bg-green-100 text-green-700' };
      case 'inativo': return { text: 'Inativa', class: 'bg-yellow-100 text-yellow-700' };
      case 'concluido': return { text: 'Concluída', class: 'bg-gray-100 text-gray-700' };
      default: return { text: 'Desconhecido', class: 'bg-gray-100 text-gray-700' };
    }
  };

  const dashboardStats = [
    { 
      label: 'Oportunidades Ativas', 
      value: loading ? '...' : stats.activeOpportunities.toString(), 
      icon: Target, 
      color: 'text-purple-600', 
      bg: 'bg-purple-100' 
    },
    { 
      label: 'Total de Candidaturas', 
      value: loading ? '...' : stats.totalApplications.toString(), 
      icon: Users, 
      color: 'text-blue-600', 
      bg: 'bg-blue-100' 
    },
    { 
      label: 'Campanhas Concluídas', 
      value: loading ? '...' : stats.completedOpportunities.toString(), 
      icon: TrendingUp, 
      color: 'text-green-600', 
      bg: 'bg-green-100' 
    },
    { 
      label: 'Total de Oportunidades', 
      value: loading ? '...' : stats.totalOpportunities.toString(), 
      icon: Eye, 
      color: 'text-orange-600', 
      bg: 'bg-orange-100' 
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
        {dashboardStats.map((stat, index) => {
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
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Carregando...</p>
              </div>
            ) : recentOpportunities.length === 0 ? (
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhuma oportunidade criada ainda</p>
                <p className="text-sm text-gray-500">Crie sua primeira oportunidade!</p>
              </div>
            ) : (
              recentOpportunities.map((opportunity) => {
                const statusDisplay = getStatusDisplay(opportunity.status);
                return (
                  <div 
                    key={opportunity.id} 
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => handleViewOpportunity(opportunity)}
                  >
                    <div>
                      <h4 className="font-medium text-gray-900">{opportunity.title}</h4>
                      <p className="text-sm text-gray-600">
                        {opportunity.candidates_count || 0} candidatos • {formatTimeAgo(opportunity.created_at)}
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusDisplay.class}`}>
                      {statusDisplay.text}
                    </span>
                  </div>
                );
              })
            )}
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

      {/* View Opportunity Modal */}
      {showViewModal && selectedOpportunity && (
        <ViewOpportunityModal
          opportunity={selectedOpportunity}
          onClose={() => setShowViewModal(false)}
        />
      )}
    </div>
  );
};

export default AnalystOverview;