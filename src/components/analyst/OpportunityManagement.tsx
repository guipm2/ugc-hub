import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Eye, Users, Target, UserCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAnalystAuth } from '../../contexts/AnalystAuthContext';
import CreateOpportunityModal from './CreateOpportunityModal';
import ApplicationsModal from './ApplicationsModal';

interface Opportunity {
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

const OpportunityManagement: React.FC = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApplicationsModal, setShowApplicationsModal] = useState<{
    opportunityId: string;
    opportunityTitle: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { profile } = useAnalystAuth();

  const fetchOpportunities = useCallback(async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .eq('analyst_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar oportunidades:', error);
      } else {
        setOpportunities(data || []);
      }
    } catch (err) {
      console.error('Erro ao buscar oportunidades:', err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const handleCreateOpportunity = async (opportunityData: any) => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('opportunities')
        .insert({
          ...opportunityData,
          analyst_id: profile.id,
          company: profile.company,
          created_by: profile.id
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar oportunidade:', error);
        alert('Erro ao criar oportunidade');
      } else {
        setOpportunities([data, ...opportunities]);
        setShowCreateModal(false);
        alert('Oportunidade criada com sucesso!');
      }
    } catch (err) {
      console.error('Erro ao criar oportunidade:', err);
      alert('Erro ao criar oportunidade');
    }
  };

  const handleDeleteOpportunity = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta oportunidade?')) return;

    try {
      const { error } = await supabase
        .from('opportunities')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir oportunidade:', error);
        alert('Erro ao excluir oportunidade');
      } else {
        setOpportunities(opportunities.filter(opp => opp.id !== id));
        alert('Oportunidade excluída com sucesso!');
      }
    } catch (err) {
      console.error('Erro ao excluir oportunidade:', err);
      alert('Erro ao excluir oportunidade');
    }
  };

  const filteredOpportunities = opportunities.filter(opportunity =>
    opportunity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opportunity.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Gerenciar Oportunidades</h1>
          <p className="text-gray-600 mt-1">{opportunities.length} oportunidades criadas</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova Oportunidade
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar oportunidades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <Filter className="h-4 w-4" />
          Filtros
        </button>
      </div>

      {/* Opportunities List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredOpportunities.map((opportunity) => (
          <div
            key={opportunity.id}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">{opportunity.title}</h3>
                <p className="text-gray-600 text-sm">{opportunity.company}</p>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  opportunity.status === 'ativo' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {opportunity.status === 'ativo' ? 'Ativa' : 'Inativa'}
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {opportunity.description}
            </p>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Valor para Criador:</span>
                <br />
                {opportunity.budget_min === 0 && opportunity.budget_max === 0 
                  ? 'Permuta' 
                  : `R$ ${opportunity.budget_min.toFixed(2)}`
                }
              </div>
              <div>
                <span className="font-medium">Localização:</span>
                <br />
                {opportunity.location}
              </div>
              <div>
                <span className="font-medium">Tipo:</span>
                <br />
                {opportunity.content_type}
              </div>
              <div>
                <span className="font-medium">Prazo:</span>
                <br />
                {new Date(opportunity.deadline).toLocaleDateString('pt-BR')}
              </div>
            </div>

            {/* Candidates */}
            <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              {opportunity.candidates_count} candidatos
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowApplicationsModal({
                    opportunityId: opportunity.id,
                    opportunityTitle: opportunity.title
                  })}
                  className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <UserCheck className="h-4 w-4" />
                  Candidaturas
                </button>
                <button className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors">
                  <Eye className="h-4 w-4" />
                  Ver
                </button>
                <button className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors">
                  <Edit className="h-4 w-4" />
                  Editar
                </button>
              </div>
              
              <button
                onClick={() => handleDeleteOpportunity(opportunity.id)}
                className="flex items-center gap-1 text-red-500 hover:text-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredOpportunities.length === 0 && (
        <div className="text-center py-12">
          <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            {opportunities.length === 0 ? 'Nenhuma oportunidade criada' : 'Nenhuma oportunidade encontrada'}
          </h3>
          <p className="text-gray-600 mb-4">
            {opportunities.length === 0 
              ? 'Crie sua primeira oportunidade para começar a conectar com criadores'
              : 'Tente ajustar seus filtros de busca'
            }
          </p>
          {opportunities.length === 0 && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Criar Primeira Oportunidade
            </button>
          )}
        </div>
      )}

      {/* Create Opportunity Modal */}
      {showCreateModal && (
        <CreateOpportunityModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateOpportunity}
        />
      )}

      {/* Applications Modal */}
      {showApplicationsModal && (
        <ApplicationsModal
          opportunityId={showApplicationsModal.opportunityId}
          opportunityTitle={showApplicationsModal.opportunityTitle}
          onClose={() => setShowApplicationsModal(null)}
        />
      )}
    </div>
  );
};

export default OpportunityManagement;