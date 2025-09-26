import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, MapPin, Calendar, DollarSign, Tag, Users, Building2, Send, Heart, Share2, Check, Clock, Star, Award, Briefcase } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../hooks/useRouter';

interface OpportunityDetails {
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

interface UserApplication {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  applied_at: string;
  message: string;
}

interface OpportunityDetailsPageProps {
  opportunityId: string;
}

const OpportunityDetailsPage: React.FC<OpportunityDetailsPageProps> = ({ opportunityId }) => {
  const [opportunity, setOpportunity] = useState<OpportunityDetails | null>(null);
  const [userApplication, setUserApplication] = useState<UserApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const { user } = useAuth();
  const { navigate } = useRouter();

  const fetchOpportunityDetails = useCallback(async () => {
    try {
      // Buscar detalhes da oportunidade
      const { data: oppData, error: oppError } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', opportunityId)
        .single();

      if (oppError) {
        console.error('Erro ao buscar oportunidade:', oppError);
        return;
      }

      // Buscar contagem dinâmica de candidatos
      const { count: candidatesCount, error: countError } = await supabase
        .from('opportunity_applications')
        .select('*', { count: 'exact', head: true })
        .eq('opportunity_id', opportunityId);

      if (countError) {
        console.error('Erro ao buscar contagem de candidatos:', countError);
      }

      // Atualizar dados da oportunidade com contagem dinâmica
      const updatedOpportunity = {
        ...oppData,
        candidates_count: candidatesCount || 0
      };

      setOpportunity(updatedOpportunity);

      // Buscar candidatura do usuário se logado
      if (user) {
        const { data: applicationData, error: applicationError } = await supabase
          .from('opportunity_applications')
          .select('*')
          .eq('opportunity_id', opportunityId)
          .eq('creator_id', user.id)
          .maybeSingle();

        if (applicationError && applicationError.code !== 'PGRST116') {
          console.error('Erro ao buscar candidatura:', applicationError);
        } else {
          setUserApplication(applicationData);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes:', error);
    } finally {
      setLoading(false);
    }
  }, [opportunityId, user]);

  useEffect(() => {
    fetchOpportunityDetails();
  }, [fetchOpportunityDetails]);

  const handleApply = async () => {
    if (!user || !opportunity) return;
    
    setApplying(true);
    try {
      // Inserir nova candidatura
      const { error: insertError } = await supabase
        .from('opportunity_applications')
        .insert({
          opportunity_id: opportunity.id,
          creator_id: user.id,
          message: applicationMessage || 'Candidatura enviada através da plataforma UGC Hub',
          status: 'pending'
        });

      if (insertError) {
        console.error('Erro ao enviar candidatura:', insertError);
        // REMOVIDO: alert('Erro ao enviar candidatura. Tente novamente.');
        return;
      }

      // Atualizar contagem de candidatos na tabela opportunities
      const { error: updateError } = await supabase
        .from('opportunities')
        .update({ 
          candidates_count: (opportunity.candidates_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', opportunity.id);

      if (updateError) {
        console.error('Erro ao atualizar contagem de candidatos:', updateError);
        // Não interromper o fluxo, pois a candidatura já foi criada
      }

      // REMOVIDO: alert('Candidatura enviada com sucesso!');
      setShowApplicationForm(false);
      setApplicationMessage('');
      // Recarregar dados para mostrar a nova candidatura
      fetchOpportunityDetails();
    } catch (error) {
      console.error('Erro ao enviar candidatura:', error);
      // REMOVIDO: alert('Erro ao enviar candidatura. Tente novamente.');
    } finally {
      setApplying(false);
    }
  };

  const formatBudget = (min: number, max: number) => {
    if (min === 0 && max === 0) return 'Permuta';
    if (min === max) return `R$ ${min.toLocaleString('pt-BR')}`;
    return `R$ ${min.toLocaleString('pt-BR')} - R$ ${max.toLocaleString('pt-BR')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getDaysLeft = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusBadge = (status?: 'pending' | 'approved' | 'rejected') => {
    if (!status) return null;
    
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700'
    };
    
    const labels = {
      pending: 'Pendente',
      approved: 'Aprovado',
      rejected: 'Rejeitado'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Oportunidade não encontrada</h2>
          <p className="text-gray-600 mb-4">A oportunidade que você está procurando não existe ou foi removida.</p>
          <button
            onClick={() => navigate('/creators/opportunities')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            Voltar para Oportunidades
          </button>
        </div>
      </div>
    );
  }

  const daysLeft = getDaysLeft(opportunity.deadline);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <button
              onClick={() => navigate('/creators/opportunities')}
              className="flex items-center gap-2 hover:text-blue-600 transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Oportunidades
            </button>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium truncate">{opportunity.title}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title and Header Info */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                  daysLeft <= 3 
                    ? 'bg-red-100 text-red-800' 
                    : daysLeft <= 7 
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  <Clock className="h-4 w-4 mr-2" />
                  {daysLeft > 0 ? `${daysLeft} dias restantes` : 'Prazo expirado'}
                </span>
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  <Briefcase className="h-4 w-4 mr-2" />
                  {opportunity.content_type}
                </span>
                {opportunity.candidates_count >= 10 && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                    <Star className="h-4 w-4 mr-2" />
                    Popular
                  </span>
                )}
                {userApplication && (
                  <div className="ml-auto">
                    {getStatusBadge(userApplication.status)}
                  </div>
                )}
              </div>
              
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{opportunity.title}</h1>
              
              <div className="flex items-center gap-4 text-lg text-gray-600 mb-6">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  <span className="font-semibold">{opportunity.company}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  <span className="font-semibold text-green-600">
                    {formatBudget(opportunity.budget_min, opportunity.budget_max)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  <span>{opportunity.location}</span>
                </div>
              </div>
              
              {/* Application Status if exists */}
              {userApplication && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Check className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Candidatura Enviada</h3>
                      <p className="text-sm text-gray-600">
                        Enviada em {formatDate(userApplication.applied_at)}
                      </p>
                    </div>
                    <div className="ml-auto">
                      {getStatusBadge(userApplication.status)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Briefcase className="h-6 w-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Descrição da Oportunidade</h2>
              </div>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {opportunity.description}
                </p>
              </div>
              
              {/* Engagement metrics */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{opportunity.candidates_count || 0} candidatos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Criada em {formatDate(opportunity.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Prazo: {formatDate(opportunity.deadline)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Requirements */}
            {opportunity.requirements && opportunity.requirements.length > 0 && (
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Award className="h-6 w-6 text-purple-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Requisitos</h2>
                </div>
                <div className="space-y-3">
                  {opportunity.requirements.map((req, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                      <div className="p-1 bg-purple-100 rounded-full mt-0.5">
                        <Check className="h-3 w-3 text-purple-600" />
                      </div>
                      <span className="text-gray-700">{req}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Horizontal Cards - Actions and Company Info */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Actions */}
              {user && !userApplication && daysLeft > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Send className="h-5 w-5 text-blue-600" />
                    </div>
                    Ações Disponíveis
                  </h3>
                  <div className="space-y-4">
                    <button
                      onClick={() => setShowApplicationForm(true)}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-4 rounded-xl font-semibold transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
                    >
                      <Send className="h-5 w-5" />
                      Candidatar-se Agora
                    </button>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button className="flex-1 bg-white border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-700 hover:text-red-600 px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 group">
                        <Heart className="h-4 w-4 group-hover:fill-current" />
                        <span className="hidden sm:inline">Salvar</span>
                      </button>
                      <button className="flex-1 bg-white border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700 hover:text-blue-600 px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 group">
                        <Share2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Compartilhar</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Company Info */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Building2 className="h-5 w-5 text-gray-600" />
                  </div>
                  Sobre a Empresa
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="p-3 bg-gray-100 rounded-xl flex-shrink-0">
                      <Building2 className="h-6 w-6 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-bold text-gray-900 truncate">{opportunity.company}</p>
                      <p className="text-sm text-gray-600 flex items-center gap-2 mt-2">
                        <Calendar className="h-4 w-4" />
                        Membro desde {formatDate(opportunity.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Additional company stats */}
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">★</p>
                      <p className="text-xs text-green-700 font-medium">Empresa Verificada</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">🎯</p>
                      <p className="text-xs text-blue-700 font-medium">Resposta Rápida</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Only Key Details */}
          <div className="space-y-6">
            {/* Key Details */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Award className="h-5 w-5 text-indigo-600" />
                </div>
                Detalhes da Oportunidade
              </h3>
              <div className="space-y-4">
                {/* Budget */}
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-green-700 font-medium">Investimento</p>
                      <p className="text-lg font-bold text-green-900">
                        {formatBudget(opportunity.budget_min, opportunity.budget_max)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <MapPin className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-700 font-medium">Localização</p>
                      <p className="text-lg font-bold text-blue-900 truncate">{opportunity.location}</p>
                    </div>
                  </div>
                </div>

                {/* Content Type */}
                <div className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl border border-purple-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Tag className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-700 font-medium">Tipo de Conteúdo</p>
                      <p className="text-lg font-bold text-purple-900 truncate">{opportunity.content_type}</p>
                    </div>
                  </div>
                </div>

                {/* Deadline */}
                <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Clock className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-orange-700 font-medium">Prazo</p>
                      <p className="text-base font-bold text-orange-900 truncate">
                        {formatDate(opportunity.deadline)}
                      </p>
                      <p className={`text-xs font-medium ${
                        daysLeft <= 3 ? 'text-red-600' : daysLeft <= 7 ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        {daysLeft > 0 ? `${daysLeft} dias restantes` : 'Prazo expirado'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Candidates */}
                <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Users className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-700 font-medium">Candidatos</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {opportunity.candidates_count || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Application Form Modal */}
      {showApplicationForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Enviar Candidatura</h2>
            
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">{opportunity.title}</h3>
              <p className="text-gray-600">{opportunity.company}</p>
            </div>

            <div className="mb-6">
              <label htmlFor="application-message" className="block text-sm font-medium text-gray-700 mb-2">
                Mensagem (opcional)
              </label>
              <textarea
                id="application-message"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Conte um pouco sobre por que você é ideal para esta oportunidade..."
                value={applicationMessage}
                onChange={(e) => setApplicationMessage(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowApplicationForm(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleApply}
                disabled={applying}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
              >
                {applying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar Candidatura
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpportunityDetailsPage;