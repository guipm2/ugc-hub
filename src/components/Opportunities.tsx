import React, { useState } from 'react';
import { useEffect } from 'react';
import { Search, Filter, Clock, MapPin, DollarSign, Users, Eye, Heart, Send, X, Grid3X3, List, ChevronDown, ExternalLink, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../hooks/useRouter';

interface Opportunity {
  id: string;
  title: string;
  company: string;
  companyLogo: string;
  location: string;
  budget: string;
  deadline: string;
  description: string;
  requirements: string[] | any;
  contentType: string;
  candidates: number;
  status: 'novo' | 'urgente';
  daysLeft: number;
  userApplication?: {
    id: string;
    status: 'pending' | 'approved' | 'rejected';
  };
}

const Opportunities = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [locationFilter, setLocationFilter] = useState('Todos');
  const [budgetFilter, setBudgetFilter] = useState('Todos');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { user } = useAuth();
  const { navigate } = useRouter();

  const filters = ['Todos', 'Reel', 'Vídeo', 'Post', 'Stories', 'TikTok'];
  const statusFilters = ['Todos', 'Novo', 'Urgente'];
  const locationFilters = ['Todos', 'Remoto', 'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Brasília'];
  const budgetFilters = ['Todos', 'Até R$ 500', 'R$ 500 - R$ 1.000', 'R$ 1.000 - R$ 2.500', 'R$ 2.500 - R$ 5.000', 'Acima de R$ 5.000'];

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    try {
      // First get opportunities
      const { data: opportunitiesData, error: opportunitiesError } = await supabase
        .from('opportunities')
        .select('*')
        .eq('status', 'ativo')
        .order('created_at', { ascending: false });

      if (opportunitiesError) {
        console.error('Erro ao buscar oportunidades:', opportunitiesError);
        return;
      }

      // Get user applications if user is logged in
      let userApplications: any[] = [];
      if (user) {
        const { data: applicationsData, error: applicationsError } = await supabase
          .from('opportunity_applications')
          .select('id, opportunity_id, status')
          .eq('creator_id', user.id);

        if (applicationsError) {
          console.error('Erro ao buscar candidaturas:', applicationsError);
        } else {
          userApplications = applicationsData || [];
        }
      }

      // Combine data
      const formattedOpportunities = opportunitiesData?.map(opp => {
        const deadline = new Date(opp.deadline);
        const today = new Date();
        const diffTime = deadline.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Find user application for this opportunity
        const userApplication = userApplications.find(app => app.opportunity_id === opp.id);
        
        // Format budget display
        const budgetDisplay = opp.budget_min === 0 && opp.budget_max === 0 
          ? 'Permuta' 
          : `R$ ${opp.budget_min} - R$ ${opp.budget_max}`;
        
        return {
          id: opp.id,
          title: opp.title,
          company: opp.company,
          companyLogo: 'https://images.pexels.com/photos/3762800/pexels-photo-3762800.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
          location: opp.location,
          budget: budgetDisplay,
          deadline: `${diffDays} dias restantes`,
          description: opp.description,
          requirements: Array.isArray(opp.requirements) ? opp.requirements : [],
          contentType: opp.content_type,
          candidates: opp.candidates_count || 0,
          status: diffDays <= 7 ? 'urgente' as const : 'novo' as const,
          daysLeft: diffDays,
          userApplication: userApplication ? {
            id: userApplication.id,
            status: userApplication.status
          } : undefined
        };
      }) || [];
      
      setOpportunities(formattedOpportunities);
    } catch (err) {
      console.error('Erro ao buscar oportunidades:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOpportunities = opportunities.filter(opportunity => {
    const matchesSearch = opportunity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         opportunity.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesContentType = activeFilter === 'Todos' || opportunity.contentType.toLowerCase().includes(activeFilter.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' || 
      (statusFilter === 'Novo' && opportunity.status === 'novo') ||
      (statusFilter === 'Urgente' && opportunity.status === 'urgente');
    const matchesLocation = locationFilter === 'Todos' || opportunity.location === locationFilter;
    
    // Budget filter logic
    let matchesBudget = true;
    if (budgetFilter !== 'Todos') {
      const budgetMin = parseInt(opportunity.budget.split(' - ')[0].replace('R$ ', '').replace('.', ''));
      const budgetMax = parseInt(opportunity.budget.split(' - ')[1].replace('R$ ', '').replace('.', ''));
      const avgBudget = (budgetMin + budgetMax) / 2;
      
      switch (budgetFilter) {
        case 'Até R$ 500':
          matchesBudget = avgBudget <= 500;
          break;
        case 'R$ 500 - R$ 1.000':
          matchesBudget = avgBudget > 500 && avgBudget <= 1000;
          break;
        case 'R$ 1.000 - R$ 2.500':
          matchesBudget = avgBudget > 1000 && avgBudget <= 2500;
          break;
        case 'R$ 2.500 - R$ 5.000':
          matchesBudget = avgBudget > 2500 && avgBudget <= 5000;
          break;
        case 'Acima de R$ 5.000':
          matchesBudget = avgBudget > 5000;
          break;
      }
    }
    
    return matchesSearch && matchesContentType && matchesStatus && matchesLocation && matchesBudget;
  });

  const handleApply = async (opportunityId: string) => {
    if (!user) return;
    
    setActionLoading(opportunityId);
    
    try {
      const { error } = await supabase
        .from('opportunity_applications')
        .insert({
          opportunity_id: opportunityId,
          creator_id: user.id,
          message: 'Tenho interesse nesta oportunidade!'
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          alert('Você já se candidatou para esta oportunidade!');
        } else {
          console.error('Erro ao se candidatar:', error);
          alert('Erro ao se candidatar. Tente novamente.');
        }
      } else {
        alert('Candidatura enviada com sucesso!');
        // Refresh opportunities to update application status
        fetchOpportunities();
      }
    } catch (err) {
      console.error('Erro ao se candidatar:', err);
      alert('Erro ao se candidatar. Tente novamente.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelApplication = async (opportunityId: string, applicationId: string) => {
    if (!user) return;
    
    if (!confirm('Tem certeza que deseja cancelar sua candidatura?')) return;
    
    setActionLoading(opportunityId);
    
    try {
      const { data, error } = await supabase
        .from('opportunity_applications')
        .delete()
        .eq('id', applicationId)
        .eq('creator_id', user.id);

      if (error) {
        console.error('Erro ao cancelar candidatura:', error);
        if (error.code === '42501') {
          alert('Você não tem permissão para cancelar esta candidatura.');
        } else {
          alert('Erro ao cancelar candidatura. Tente novamente.');
        }
      } else {
        alert('Candidatura cancelada com sucesso!');
        // Refresh opportunities to update application status
        fetchOpportunities();
      }
    } catch (err) {
      console.error('Erro ao cancelar candidatura:', err);
      alert('Erro ao cancelar candidatura. Tente novamente.');
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Oportunidades</h1>
        <p className="text-gray-600 mt-1">{opportunities.length} oportunidades disponíveis</p>
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          
          {/* Content Type Filter */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeFilter === filter
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="h-4 w-4" />
            Filtros
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {statusFilters.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Localização</label>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {locationFilters.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Investimento</label>
              <select
                value={budgetFilter}
                onChange={(e) => setBudgetFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {budgetFilters.map(budget => (
                  <option key={budget} value={budget}>{budget}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Opportunities Grid */}
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
              /* List View */
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
                      <span className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                        opportunity.status === 'urgente' 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {opportunity.status === 'urgente' ? 'Urgente' : 'Novo'}
                      </span>
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
                        <span className="text-red-500">{opportunity.deadline}</span>
                      </div>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                        {opportunity.contentType}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 ml-4">
                  {opportunity.userApplication ? (
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        opportunity.userApplication.status === 'approved' 
                          ? 'bg-green-100 text-green-700' 
                          : opportunity.userApplication.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {opportunity.userApplication.status === 'approved' 
                          ? 'Aprovado' 
                          : opportunity.userApplication.status === 'rejected'
                          ? 'Rejeitado'
                          : 'Pendente'
                        }
                      </span>
                      {opportunity.userApplication.status === 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApply(opportunity.id);
                      }}
                      disabled={actionLoading === opportunity.id}
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
                          Candidatar-se
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Grid View (existing layout) */
              <>
                {/* Header */}
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
                  
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    opportunity.status === 'urgente' 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {opportunity.status === 'urgente' ? 'Urgente' : 'Novo'}
                  </span>
                </div>

                {/* Description */}
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {opportunity.description}
                </p>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="h-4 w-4" />
                    {opportunity.budget}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span className="text-red-500">{opportunity.daysLeft} dias restantes</span>
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

                {/* Content Type Badge */}
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                    {opportunity.contentType}
                  </span>
                </div>

                {/* Requirements */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Requisitos:</p>
                  <div className="flex flex-wrap gap-2">
                    {(opportunity.requirements || []).map((req: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                      >
                        {req}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/creators/opportunities/${opportunity.id}`);
                      }}
                      className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <Heart className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {opportunity.userApplication ? (
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        opportunity.userApplication.status === 'approved' 
                          ? 'bg-green-100 text-green-700' 
                          : opportunity.userApplication.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {opportunity.userApplication.status === 'approved' 
                          ? 'Aprovado' 
                          : opportunity.userApplication.status === 'rejected'
                          ? 'Rejeitado'
                          : 'Pendente'
                        }
                      </span>
                      {opportunity.userApplication.status === 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApply(opportunity.id);
                      }}
                      disabled={actionLoading === opportunity.id}
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
                          Candidatar-se
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

      {/* Opportunity Details Modal */}
      {selectedOpportunity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <img
                  src={selectedOpportunity.companyLogo}
                  alt={selectedOpportunity.company}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedOpportunity.title}</h2>
                  <p className="text-gray-600">{selectedOpportunity.company}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOpportunity(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status and Type */}
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                  selectedOpportunity.status === 'urgente' 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {selectedOpportunity.status === 'urgente' ? 'Urgente' : 'Novo'}
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                  {selectedOpportunity.contentType}
                </span>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Descrição</h3>
                <p className="text-gray-600 leading-relaxed">{selectedOpportunity.description}</p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Investimento</p>
                      <p className="text-gray-600">{selectedOpportunity.budget}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Localização</p>
                      <p className="text-gray-600">{selectedOpportunity.location}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Prazo</p>
                      <p className="text-gray-600">{selectedOpportunity.deadline}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Candidatos</p>
                      <p className="text-gray-600">{selectedOpportunity.candidates} candidatos</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Requirements */}
              {selectedOpportunity.requirements && selectedOpportunity.requirements.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Requisitos</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedOpportunity.requirements.map((req: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                      >
                        {req}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-4 border-t border-gray-200">
                {selectedOpportunity.userApplication ? (
                  <div className="flex items-center justify-center">
                    <span className={`px-4 py-2 text-sm font-medium rounded-full ${
                      selectedOpportunity.userApplication.status === 'approved' 
                        ? 'bg-green-100 text-green-700' 
                        : selectedOpportunity.userApplication.status === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {selectedOpportunity.userApplication.status === 'approved' 
                        ? 'Candidatura Aprovada' 
                        : selectedOpportunity.userApplication.status === 'rejected'
                        ? 'Candidatura Rejeitada'
                        : 'Candidatura Pendente'
                      }
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApply(selectedOpportunity.id);
                    }}
                    disabled={actionLoading === selectedOpportunity.id}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {actionLoading === selectedOpportunity.id ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Enviando Candidatura...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        Candidatar-se a esta Oportunidade
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
              : 'Tente ajustar seus filtros de busca'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default Opportunities;