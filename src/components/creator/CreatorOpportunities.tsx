import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  Clock, 
  MapPin, 
  DollarSign, 
  Users, 
  Eye, 
  Heart, 
  Send, 
  X, 
  Grid3X3, 
  List, 
  ChevronDown, 
  Star,
  TrendingUp,
  Award,
  CheckCircle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from '../../hooks/useRouter';

interface CreatorOpportunity {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  budget: {
    min: number;
    max: number;
    display: string;
    type: 'monetary' | 'barter';
  };
  deadline: string;
  description: string;
  requirements: string[];
  contentType: string;
  candidates: number;
  maxCandidates?: number;
  status: 'new' | 'urgent' | 'trending' | 'ending_soon';
  daysLeft: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  rating: number; // Company rating
  isRecommended?: boolean;
  isFavorited?: boolean;
  userApplication?: {
    id: string;
    status: 'pending' | 'approved' | 'rejected';
    applied_at: string;
  };
  tags: string[];
  engagement: {
    views: number;
    applications: number;
    successRate: number;
  };
}

interface CreatorOpportunitiesProps {
  variant?: 'full' | 'compact';
  className?: string;
  showFavorites?: boolean;
  maxItems?: number;
}

const CreatorOpportunities: React.FC<CreatorOpportunitiesProps> = ({
  variant = 'full',
  className = '',
  showFavorites = false,
  maxItems
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'newest' | 'deadline' | 'budget' | 'recommended'>('recommended');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [locationFilter, setLocationFilter] = useState('Todos');
  const [budgetFilter, setBudgetFilter] = useState('Todos');
  const [difficultyFilter, setDifficultyFilter] = useState('Todos');
  const [showFilters, setShowFilters] = useState(false);
  const [opportunities, setOpportunities] = useState<CreatorOpportunity[]>([]);
  const [favoriteOpportunities, setFavoriteOpportunities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { user } = useAuth();
  const { navigate } = useRouter();

  const contentTypeFilters = ['Todos', 'Reel', 'Vídeo', 'Post', 'Stories', 'TikTok', 'YouTube'];
  const statusFilters = ['Todos', 'Novo', 'Urgente', 'Trending', 'Terminando'];
  const locationFilters = ['Todos', 'Remoto', 'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Brasília'];
  const budgetFilters = ['Todos', 'Até R$ 500', 'R$ 500 - R$ 1.000', 'R$ 1.000 - R$ 2.500', 'R$ 2.500 - R$ 5.000', 'Acima de R$ 5.000', 'Permuta'];
  const difficultyFilters = ['Todos', 'Iniciante', 'Intermediário', 'Avançado'];
  const sortOptions = [
    { value: 'recommended', label: 'Recomendadas' },
    { value: 'newest', label: 'Mais Recentes' },
    { value: 'deadline', label: 'Prazo' },
    { value: 'budget', label: 'Maior Orçamento' }
  ];

  const fetchUserFavorites = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('opportunity_id')
        .eq('user_id', user.id)
        .eq('type', 'opportunity');

      if (!error && data) {
        setFavoriteOpportunities(data.map(fav => fav.opportunity_id));
      }
    } catch (err) {
      console.error('Erro ao buscar favoritos:', err);
    }
  }, [user]);

  const fetchOpportunities = useCallback(async () => {
    try {
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
      let userApplications: { id: string; opportunity_id: string; status: string; created_at: string }[] = [];
      if (user) {
        const { data: applicationsData, error: applicationsError } = await supabase
          .from('opportunity_applications')
          .select('id, opportunity_id, status, created_at')
          .eq('creator_id', user.id);

        if (applicationsError) {
          console.error('Erro ao buscar candidaturas:', applicationsError);
        } else {
          userApplications = applicationsData || [];
        }
      }

      // Get candidates count and engagement data for each opportunity
      const opportunitiesWithData = await Promise.all(
        (opportunitiesData || []).map(async (opp) => {
          const { count, error: countError } = await supabase
            .from('opportunity_applications')
            .select('*', { count: 'exact', head: true })
            .eq('opportunity_id', opp.id);

          if (countError) {
            console.error('Erro ao buscar contagem de candidatos:', countError);
          }

          // Calculate engagement metrics
          const views = Math.floor(Math.random() * 1000) + 100; // Mock data
          const applications = count || 0;
          const successRate = applications > 0 ? Math.floor(Math.random() * 30) + 10 : 0;

          return {
            ...opp,
            candidates_count: applications,
            engagement: {
              views,
              applications,
              successRate
            }
          };
        })
      );

      // Format opportunities data
      const formattedOpportunities = opportunitiesWithData?.map(opp => {
        const deadline = new Date(opp.deadline);
        const today = new Date();
        const diffTime = deadline.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const userApplication = userApplications.find(app => app.opportunity_id === opp.id);
        
        // Determine status based on various factors
        let status: 'new' | 'urgent' | 'trending' | 'ending_soon' = 'new';
        if (diffDays <= 3) status = 'ending_soon';
        else if (diffDays <= 7) status = 'urgent';
        else if (opp.engagement.applications > 20) status = 'trending';

        // Determine difficulty based on requirements and budget
        let difficulty: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
        const avgBudget = (opp.budget_min + opp.budget_max) / 2;
        if (avgBudget > 2500 || (opp.requirements && opp.requirements.length > 5)) {
          difficulty = 'advanced';
        } else if (avgBudget > 1000 || (opp.requirements && opp.requirements.length > 3)) {
          difficulty = 'intermediate';
        }

        // Budget display
        const budgetDisplay = opp.budget_min === 0 && opp.budget_max === 0 
          ? 'Permuta' 
          : `R$ ${opp.budget_min.toLocaleString()} - R$ ${opp.budget_max.toLocaleString()}`;

        // Generate tags based on content
        const tags = [
          opp.content_type,
          difficulty === 'beginner' ? 'Iniciante' : difficulty === 'intermediate' ? 'Intermediário' : 'Avançado',
          status === 'urgent' ? 'Urgente' : status === 'trending' ? 'Popular' : 'Novo'
        ].filter(Boolean);

        return {
          id: opp.id,
          title: opp.title,
          company: opp.company,
          companyLogo: opp.company_logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(opp.company)}&background=3b82f6&color=ffffff`,
          location: opp.location,
          budget: {
            min: opp.budget_min,
            max: opp.budget_max,
            display: budgetDisplay,
            type: (opp.budget_min === 0 && opp.budget_max === 0) ? 'barter' as const : 'monetary' as const
          },
          deadline: `${diffDays} dias restantes`,
          description: opp.description,
          requirements: Array.isArray(opp.requirements) ? opp.requirements : [],
          contentType: opp.content_type,
          candidates: opp.candidates_count || 0,
          maxCandidates: opp.max_candidates,
          status,
          daysLeft: diffDays,
          difficulty,
          rating: Math.random() * 2 + 3, // Mock rating 3-5
          isRecommended: Math.random() > 0.7, // 30% are recommended
          isFavorited: favoriteOpportunities.includes(opp.id),
          userApplication: userApplication ? {
            id: userApplication.id,
            status: userApplication.status,
            applied_at: userApplication.created_at
          } : undefined,
          tags,
          engagement: opp.engagement
        } as CreatorOpportunity;
      }) || [];
      
      setOpportunities(formattedOpportunities);
    } catch (err) {
      console.error('Erro ao buscar oportunidades:', err);
    } finally {
      setLoading(false);
    }
  }, [user, favoriteOpportunities]);

  useEffect(() => {
    if (user) {
      fetchOpportunities();
      fetchUserFavorites();
    }
  }, [user, fetchOpportunities, fetchUserFavorites]);

  const toggleFavorite = async (opportunityId: string) => {
    if (!user) return;

    const isFavorited = favoriteOpportunities.includes(opportunityId);
    
    try {
      if (isFavorited) {
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('opportunity_id', opportunityId)
          .eq('type', 'opportunity');
        
        setFavoriteOpportunities(prev => prev.filter(id => id !== opportunityId));
      } else {
        await supabase
          .from('user_favorites')
          .insert({
            user_id: user.id,
            opportunity_id: opportunityId,
            type: 'opportunity'
          });
        
        setFavoriteOpportunities(prev => [...prev, opportunityId]);
      }
    } catch (err) {
      console.error('Erro ao alterar favorito:', err);
    }
  };

  const applyToOpportunity = async (opportunityId: string) => {
    if (!user) {
      // Redirect to login
      navigate('/auth/login');
      return;
    }

    setActionLoading(opportunityId);
    try {
      const { error } = await supabase
        .from('opportunity_applications')
        .insert({
          opportunity_id: opportunityId,
          creator_id: user.id,
          status: 'pending'
        });

      if (error) {
        console.error('Erro ao candidatar-se:', error);
      } else {
        await fetchOpportunities(); // Refresh to show application status
      }
    } catch (err) {
      console.error('Erro ao candidatar-se:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Filter and sort opportunities
  const filteredAndSortedOpportunities = React.useMemo(() => {
    const filtered = opportunities.filter(opportunity => {
      if (showFavorites && !opportunity.isFavorited) return false;
      
      const matchesSearch = opportunity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           opportunity.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           opportunity.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesContentType = activeFilter === 'Todos' || 
                                 opportunity.contentType.toLowerCase().includes(activeFilter.toLowerCase());
      
      const matchesStatus = statusFilter === 'Todos' || 
        (statusFilter === 'Novo' && opportunity.status === 'new') ||
        (statusFilter === 'Urgente' && opportunity.status === 'urgent') ||
        (statusFilter === 'Trending' && opportunity.status === 'trending') ||
        (statusFilter === 'Terminando' && opportunity.status === 'ending_soon');
      
      const matchesLocation = locationFilter === 'Todos' || opportunity.location === locationFilter;
      
      const matchesDifficulty = difficultyFilter === 'Todos' ||
        (difficultyFilter === 'Iniciante' && opportunity.difficulty === 'beginner') ||
        (difficultyFilter === 'Intermediário' && opportunity.difficulty === 'intermediate') ||
        (difficultyFilter === 'Avançado' && opportunity.difficulty === 'advanced');
      
      // Budget filter
      let matchesBudget = true;
      if (budgetFilter !== 'Todos') {
        const avgBudget = (opportunity.budget.min + opportunity.budget.max) / 2;
        
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
          case 'Permuta':
            matchesBudget = opportunity.budget.type === 'barter';
            break;
        }
      }
      
      return matchesSearch && matchesContentType && matchesStatus && matchesLocation && matchesDifficulty && matchesBudget;
    });

    // Sort opportunities
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recommended':
          if (a.isRecommended && !b.isRecommended) return -1;
          if (!a.isRecommended && b.isRecommended) return 1;
          return b.engagement.successRate - a.engagement.successRate;
        case 'deadline':
          return a.daysLeft - b.daysLeft;
        case 'budget': {
          const avgA = (a.budget.min + a.budget.max) / 2;
          const avgB = (b.budget.min + b.budget.max) / 2;
          return avgB - avgA;
        }
        case 'newest':
        default:
          return 0; // Already sorted by created_at in the query
      }
    });

    return maxItems ? filtered.slice(0, maxItems) : filtered;
  }, [opportunities, searchTerm, activeFilter, statusFilter, locationFilter, budgetFilter, difficultyFilter, sortBy, showFavorites, maxItems]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'urgent':
        return <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">Urgente</span>;
      case 'trending':
        return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Trending</span>;
      case 'ending_soon':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">Terminando</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Novo</span>;
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">Iniciante</span>;
      case 'intermediate':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">Intermediário</span>;
      case 'advanced':
        return <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">Avançado</span>;
      default:
        return null;
    }
  };

  const getApplicationStatus = (application?: CreatorOpportunity['userApplication']) => {
    if (!application) return null;
    
    switch (application.status) {
      case 'pending':
        return (
          <div className="flex items-center gap-2 text-yellow-600">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Candidatura Pendente</span>
          </div>
        );
      case 'approved':
        return (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Aprovado!</span>
          </div>
        );
      case 'rejected':
        return (
          <div className="flex items-center gap-2 text-red-600">
            <X className="h-4 w-4" />
            <span className="text-sm font-medium">Não selecionado</span>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Compact variant for dashboard
  if (variant === 'compact') {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {showFavorites ? 'Oportunidades Favoritas' : 'Oportunidades Recomendadas'}
          </h3>
          <button 
            onClick={() => navigate('/creators/opportunities')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            Ver todas <ExternalLink className="h-3 w-3" />
          </button>
        </div>
        
        {filteredAndSortedOpportunities.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Award className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">
              {showFavorites ? 'Nenhuma oportunidade favoritada' : 'Nenhuma oportunidade encontrada'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAndSortedOpportunities.map((opportunity) => (
              <div
                key={opportunity.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => navigate(`/creators/opportunities/${opportunity.id}`)}
              >
                <div className="flex items-start gap-3">
                  <img 
                    src={opportunity.companyLogo} 
                    alt={opportunity.company}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {opportunity.title}
                      </h4>
                      {opportunity.isRecommended && (
                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{opportunity.company}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs">
                        {getStatusBadge(opportunity.status)}
                        <span className="text-gray-500">{opportunity.budget.display}</span>
                      </div>
                      <span className="text-xs text-gray-400">{opportunity.deadline}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {showFavorites ? 'Oportunidades Favoritas' : 'Oportunidades'}
          </h1>
          <p className="text-gray-600 mt-1">
            {filteredAndSortedOpportunities.length} oportunidades encontradas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchOpportunities()}
            className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar oportunidades por título, empresa ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          {contentTypeFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeFilter === filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Sort and Advanced Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'deadline' | 'budget' | 'recommended')}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Filter className="h-4 w-4" />
            Filtros Avançados
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {statusFilters.map(filter => (
                    <option key={filter} value={filter}>{filter}</option>
                  ))}
                </select>
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Localização</label>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {locationFilters.map(filter => (
                    <option key={filter} value={filter}>{filter}</option>
                  ))}
                </select>
              </div>

              {/* Budget Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Orçamento</label>
                <select
                  value={budgetFilter}
                  onChange={(e) => setBudgetFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {budgetFilters.map(filter => (
                    <option key={filter} value={filter}>{filter}</option>
                  ))}
                </select>
              </div>

              {/* Difficulty Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nível</label>
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {difficultyFilters.map(filter => (
                    <option key={filter} value={filter}>{filter}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Opportunities List/Grid */}
      <div className={`${
        viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
          : 'space-y-4'
      }`}>
        {filteredAndSortedOpportunities.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Award className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma oportunidade encontrada</h3>
            <p className="text-gray-500">
              Tente ajustar os filtros ou termos de busca para encontrar oportunidades relevantes.
            </p>
          </div>
        ) : (
          filteredAndSortedOpportunities.map((opportunity) => (
            <div
              key={opportunity.id}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-200 hover:shadow-lg transition-all duration-200 cursor-pointer group"
              onClick={() => navigate(`/creators/opportunities/${opportunity.id}`)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <img 
                    src={opportunity.companyLogo} 
                    alt={opportunity.company}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                        {opportunity.title}
                      </h3>
                      {opportunity.isRecommended && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{opportunity.company}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-3 w-3 ${
                              i < Math.floor(opportunity.rating) 
                                ? 'text-yellow-400 fill-current' 
                                : 'text-gray-300'
                            }`} 
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">
                        {opportunity.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(opportunity.id);
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Heart className={`h-4 w-4 ${opportunity.isFavorited ? 'text-red-500 fill-current' : ''}`} />
                </button>
              </div>

              {/* Tags and Status */}
              <div className="flex items-center gap-2 mb-3">
                {getStatusBadge(opportunity.status)}
                {getDifficultyBadge(opportunity.difficulty)}
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                  {opportunity.contentType}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {opportunity.description}
              </p>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    {opportunity.budget.display}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {opportunity.deadline}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {opportunity.location}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {opportunity.candidates} candidatos
                  </span>
                </div>
              </div>

              {/* Engagement Stats */}
              <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {opportunity.engagement.views} visualizações
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {opportunity.engagement.successRate}% taxa de sucesso
                </span>
              </div>

              {/* Application Status or CTA */}
              <div className="border-t border-gray-100 pt-4">
                {opportunity.userApplication ? (
                  getApplicationStatus(opportunity.userApplication)
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      applyToOpportunity(opportunity.id);
                    }}
                    disabled={actionLoading === opportunity.id}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {actionLoading === opportunity.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Candidatar-se
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CreatorOpportunities;