import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Clock,
  MapPin,
  DollarSign,
  Users,
  Eye,
  Heart,
  Send,
  X,
  Grid3X3,
  List
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { normalizeCompanyLink } from '../utils/formatters';

type ApplicationStatus = 'pending' | 'approved' | 'rejected';

type ViewMode = 'grid' | 'list';

type DbOpportunityStatus = 'ativo' | 'pausado' | 'encerrado' | 'rascunho';

interface DbOpportunity {
  id: string;
  title: string;
  company: string;
  company_link?: string | null;
  location?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  deadline?: string | null;
  description?: string | null;
  requirements?: string[] | null;
  content_type?: string | null;
  candidates_count?: number | null;
  status?: DbOpportunityStatus | null;
  created_at?: string;
}

interface OpportunityApplication {
  id: string;
  status: ApplicationStatus;
}

interface OpportunityCardData {
  id: string;
  title: string;
  company: string;
  companyLogo: string;
  companyLink?: string;
  location: string;
  budget: string;
  deadlineLabel: string;
  deadlineDate: string;
  description: string;
  requirements: string[];
  contentType: string;
  candidates: number;
  urgency: 'novo' | 'urgente';
  isClosed: boolean;
  daysLeft: number;
  userApplication?: OpportunityApplication;
}

const DEFAULT_LOGO =
  'https://images.pexels.com/photos/3762800/pexels-photo-3762800.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop';

const OPPORTUNITY_STATUSES: DbOpportunityStatus[] = ['ativo', 'pausado', 'encerrado'];

const formatBudgetRange = (min?: number | null, max?: number | null) => {
  const parsedMin = Number.isFinite(min) ? Number(min) : 0;
  const parsedMax = Number.isFinite(max) ? Number(max) : 0;

  if (!parsedMin && !parsedMax) {
    return 'Permuta';
  }

  if (!parsedMin) {
    return `Até R$ ${parsedMax.toLocaleString('pt-BR')}`;
  }

  if (!parsedMax) {
    return `A partir de R$ ${parsedMin.toLocaleString('pt-BR')}`;
  }

  if (parsedMin === parsedMax) {
    return `R$ ${parsedMin.toLocaleString('pt-BR')}`;
  }

  return `R$ ${parsedMin.toLocaleString('pt-BR')} - R$ ${parsedMax.toLocaleString('pt-BR')}`;
};

const getDeadlineMeta = (deadline?: string | null, rawStatus?: DbOpportunityStatus | null) => {
  const statusIndicatesClosure = rawStatus ? rawStatus !== 'ativo' : false;

  if (!deadline) {
    const isClosed = statusIndicatesClosure;
    return {
      deadlineLabel: isClosed ? 'Encerrada' : 'Prazo não informado',
      deadlineDate: 'Data não informada',
      daysLeft: 0,
      isClosed
    };
  }

  const deadlineDate = new Date(deadline);
  const today = new Date();
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const hasExpired = diffDays < 0;
  const isClosed = statusIndicatesClosure || hasExpired;

  const absoluteDays = Math.abs(diffDays);
  let deadlineLabel: string;

  if (isClosed) {
    deadlineLabel = hasExpired
      ? `Encerrada há ${absoluteDays === 1 ? '1 dia' : `${absoluteDays} dias`}`
      : 'Encerrada';
  } else if (diffDays === 0) {
    deadlineLabel = 'Encerra hoje';
  } else if (diffDays === 1) {
    deadlineLabel = 'Encerra amanhã';
  } else {
    deadlineLabel = `Encerra em ${diffDays} dias`;
  }

  const deadlineDateLabel = deadlineDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return {
    deadlineLabel,
    deadlineDate: deadlineDateLabel,
    daysLeft: diffDays < 0 ? 0 : diffDays,
    isClosed
  };
};

const getUrgency = (isClosed: boolean, daysLeft: number) => {
  if (isClosed) {
    return 'novo';
  }

  return daysLeft <= 7 ? 'urgente' : 'novo';
};

const sortOpportunities = (items: OpportunityCardData[]) => {
  return [...items].sort((a, b) => {
    if (a.isClosed !== b.isClosed) {
      return a.isClosed ? 1 : -1;
    }

    return a.daysLeft - b.daysLeft;
  });
};

const Opportunities: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [opportunities, setOpportunities] = useState<OpportunityCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { user } = useAuth();
  const { navigate } = useRouter();

  const fetchOpportunities = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setLoading(true);
      }

      try {
        const [opportunitiesResponse, applicationsResponse] = await Promise.all([
          supabase
            .from('opportunities')
            .select('*')
            .in('status', OPPORTUNITY_STATUSES)
            .order('created_at', { ascending: false }),
          user
            ? supabase
                .from('opportunity_applications')
                .select('id, opportunity_id, status')
                .eq('creator_id', user.id)
            : Promise.resolve({ data: [], error: null })
        ]);

        const { data: opportunitiesData, error: opportunitiesError } = opportunitiesResponse;
        const { data: applicationsData, error: applicationsError } = applicationsResponse;

        if (opportunitiesError) {
          console.error('Erro ao buscar oportunidades:', opportunitiesError);
          setOpportunities([]);
          return;
        }

        if (applicationsError) {
          console.error('Erro ao buscar candidaturas:', applicationsError);
        }

        const applications = (applicationsData ?? []) as { id: string; opportunity_id: string; status: ApplicationStatus }[];

        const formatted = (opportunitiesData ?? []).map((opp: DbOpportunity) => {
          const userApplication = applications.find((app) => app.opportunity_id === opp.id);

          const { deadlineLabel, deadlineDate, daysLeft, isClosed } = getDeadlineMeta(opp.deadline, opp.status ?? 'ativo');
          const urgency = getUrgency(isClosed, daysLeft);

          return {
            id: opp.id,
            title: opp.title,
            company: opp.company,
            companyLogo: DEFAULT_LOGO,
            companyLink: normalizeCompanyLink(opp.company_link ?? undefined),
            location: opp.location || 'Remoto',
            budget: formatBudgetRange(opp.budget_min, opp.budget_max),
            deadlineLabel,
            deadlineDate,
            description: opp.description ?? 'Descrição não informada.',
            requirements: Array.isArray(opp.requirements) ? opp.requirements : [],
            contentType: opp.content_type ?? 'Conteúdo UGC',
            candidates: opp.candidates_count ?? 0,
            urgency,
            isClosed,
            daysLeft,
            userApplication: userApplication
              ? {
                  id: userApplication.id,
                  status: userApplication.status
                }
              : undefined
          } satisfies OpportunityCardData;
        });

        setOpportunities(sortOpportunities(formatted));
      } catch (error) {
        console.error('Erro ao buscar oportunidades:', error);
        setOpportunities([]);
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [user]
  );

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  useAutoRefresh(() => fetchOpportunities({ silent: true }), 20000, true);

  const filteredOpportunities = opportunities.filter((opportunity) => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return true;
    }

    return (
      opportunity.title.toLowerCase().includes(term) ||
      opportunity.company.toLowerCase().includes(term) ||
      opportunity.contentType.toLowerCase().includes(term)
    );
  });

  const handleApply = async (opportunityId: string) => {
    if (!user) return;

    const opportunity = opportunities.find((item) => item.id === opportunityId);
    if (!opportunity || opportunity.isClosed) {
      return;
    }

    setActionLoading(opportunityId);

    try {
      const { error: insertError } = await supabase.from('opportunity_applications').insert({
        opportunity_id: opportunityId,
        creator_id: user.id,
        message: 'Tenho interesse nesta oportunidade!',
        status: 'pending'
      });

      if (insertError) {
        if (insertError.code === '23505') {
          console.warn('Usuário já inscrito na oportunidade.');
        } else {
          console.error('Erro ao se candidatar:', insertError);
        }
        return;
      }

      const { error: updateError } = await supabase
        .from('opportunities')
        .update({
          candidates_count: (opportunity.candidates || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', opportunityId);

      if (updateError) {
        console.error('Erro ao atualizar contagem de candidatos:', updateError);
      }

      fetchOpportunities({ silent: true });
    } catch (error) {
      console.error('Erro ao se candidatar:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelApplication = async (opportunityId: string, applicationId: string) => {
    if (!user) return;

    const confirmed = window.confirm('Tem certeza que deseja cancelar sua candidatura?');
    if (!confirmed) {
      return;
    }

    setActionLoading(opportunityId);

    try {
      const { error } = await supabase
        .from('opportunity_applications')
        .delete()
        .eq('id', applicationId)
        .eq('creator_id', user.id);

      if (error) {
        console.error('Erro ao cancelar candidatura:', error);
      } else {
        fetchOpportunities({ silent: true });
      }
    } catch (err) {
      console.error('Erro ao cancelar candidatura:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Oportunidades</h1>
          <p className="text-gray-600 mt-1">Carregando oportunidades...</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Oportunidades</h1>
        <p className="text-gray-600 mt-1">{opportunities.length} oportunidades disponíveis</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar oportunidades..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'space-y-4'}>
        {filteredOpportunities.map((opportunity) => (
          <div
            key={opportunity.id}
            className={`bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-200 cursor-pointer ${
              viewMode === 'list' ? 'p-4' : 'p-6'
            }`}
            onClick={() => navigate(`/creators/opportunities/${opportunity.id}`)}
          >
            {viewMode === 'list' ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={opportunity.companyLogo}
                    alt={opportunity.company}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{opportunity.title}</h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                          opportunity.urgency === 'urgente' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {opportunity.urgency === 'urgente' ? 'Urgente' : 'Novo'}
                      </span>
                      {opportunity.isClosed && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-700">Encerrada</span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{opportunity.company}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {opportunity.budget}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {opportunity.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span className={opportunity.isClosed ? 'text-gray-500' : 'text-red-500'}>{opportunity.deadlineLabel}</span>
                      </div>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                        {opportunity.contentType}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <div className="flex flex-col items-end gap-2">
                    {opportunity.userApplication ? (
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            opportunity.userApplication.status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : opportunity.userApplication.status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {opportunity.userApplication.status === 'approved'
                            ? 'Aprovado'
                            : opportunity.userApplication.status === 'rejected'
                            ? 'Rejeitado'
                            : 'Pendente'}
                        </span>
                        {opportunity.userApplication.status === 'pending' && (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleCancelApplication(opportunity.id, opportunity.userApplication!.id);
                            }}
                            disabled={actionLoading === opportunity.id}
                            className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                          >
                            {actionLoading === opportunity.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            ) : (
                              <X className="h-3 w-3" />
                            )}
                            Cancelar
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleApply(opportunity.id);
                        }}
                        disabled={actionLoading === opportunity.id || opportunity.isClosed}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        {actionLoading === opportunity.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            {opportunity.isClosed ? 'Indisponível' : 'Candidatar-se'}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={opportunity.companyLogo}
                      alt={opportunity.company}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">{opportunity.title}</h3>
                      <p className="text-gray-600 text-sm">{opportunity.company}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        opportunity.urgency === 'urgente' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {opportunity.urgency === 'urgente' ? 'Urgente' : 'Novo'}
                    </span>
                    {opportunity.isClosed && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-700">Encerrada</span>
                    )}
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{opportunity.description}</p>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="h-4 w-4" />
                    {opportunity.budget}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span className={opportunity.isClosed ? 'text-gray-500' : 'text-red-500'}>{opportunity.deadlineLabel}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    {opportunity.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    {opportunity.candidates} candidatos
                  </div>
                </div>

                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                    {opportunity.contentType}
                  </span>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Requisitos:</p>
                  <div className="flex flex-wrap gap-2">
                    {opportunity.requirements.map((req, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {req}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/creators/opportunities/${opportunity.id}`);
                      }}
                      className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(event) => event.stopPropagation()}
                      className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <Heart className="h-4 w-4" />
                    </button>
                  </div>

                  {opportunity.userApplication ? (
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          opportunity.userApplication.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : opportunity.userApplication.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {opportunity.userApplication.status === 'approved'
                          ? 'Aprovado'
                          : opportunity.userApplication.status === 'rejected'
                          ? 'Rejeitado'
                          : 'Pendente'}
                      </span>
                      {opportunity.userApplication.status === 'pending' && (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleCancelApplication(opportunity.id, opportunity.userApplication!.id);
                          }}
                          disabled={actionLoading === opportunity.id}
                          className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                          {actionLoading === opportunity.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Cancelando...
                            </>
                          ) : (
                            <>
                              <X className="h-4 w-4" />
                              Cancelar
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleApply(opportunity.id);
                      }}
                      disabled={actionLoading === opportunity.id || opportunity.isClosed}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      {actionLoading === opportunity.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          {opportunity.isClosed ? 'Indisponível' : 'Candidatar-se'}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {filteredOpportunities.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            {opportunities.length === 0 ? 'Nenhuma oportunidade disponível' : 'Nenhuma oportunidade encontrada'}
          </h3>
          <p className="text-gray-600">
            {opportunities.length === 0
              ? 'Aguarde novas oportunidades serem criadas pelos analistas'
              : 'Tente ajustar seus filtros de busca'}
          </p>
        </div>
      )}
    </div>
  );
};

export default Opportunities;