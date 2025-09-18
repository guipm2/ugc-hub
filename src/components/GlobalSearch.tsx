import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Target, Users, Building, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SearchResult {
  id: string;
  type: 'opportunity' | 'creator' | 'company';
  title: string;
  subtitle: string;
  avatar?: string;
  data: any;
}

interface GlobalSearchProps {
  placeholder?: string;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ 
  placeholder = "Pesquisar oportunidades, criadores..." 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const searchRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const categories = ['Todos', 'Oportunidades', 'Criadores', 'Empresas'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      performSearch();
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [searchTerm]);

  const performSearch = async () => {
    setLoading(true);
    const searchResults: SearchResult[] = [];

    try {
      // Search opportunities
      const { data: opportunities } = await supabase
        .from('opportunities')
        .select('*')
        .or(`title.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .eq('status', 'ativo')
        .limit(5);

      if (opportunities) {
        opportunities.forEach(opp => {
          searchResults.push({
            id: opp.id,
            type: 'opportunity',
            title: opp.title,
            subtitle: `${opp.company} • R$ ${opp.budget_min} - R$ ${opp.budget_max}`,
            data: opp
          });
        });
      }

      // Search creators
      const { data: creators } = await supabase
        .from('profiles')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%,niche.ilike.%${searchTerm}%`)
        .limit(5);

      if (creators) {
        creators.forEach(creator => {
          searchResults.push({
            id: creator.id,
            type: 'creator',
            title: creator.name || creator.email,
            subtitle: creator.bio || creator.email,
            avatar: creator.avatar_url,
            data: creator
          });
        });
      }

      // Search companies (from opportunities)
      const { data: companies } = await supabase
        .from('opportunities')
        .select('company')
        .ilike('company', `%${searchTerm}%`)
        .eq('status', 'ativo');

      if (companies) {
        const uniqueCompanies = [...new Set(companies.map(c => c.company))];
        uniqueCompanies.forEach(company => {
          searchResults.push({
            id: company,
            type: 'company',
            title: company,
            subtitle: 'Empresa',
            data: { company }
          });
        });
      }

      setResults(searchResults);
      setIsOpen(true);
    } catch (error) {
      console.error('Erro na busca:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <Target className="h-5 w-5 text-blue-600" />;
      case 'creator':
        return <Users className="h-5 w-5 text-green-600" />;
      case 'company':
        return <Building className="h-5 w-5 text-purple-600" />;
      default:
        return <Search className="h-5 w-5 text-gray-600" />;
    }
  };

  const getAvatar = (result: SearchResult) => {
    if (result.avatar) {
      return (
        <img
          src={result.avatar}
          alt={result.title}
          className="w-10 h-10 rounded-full object-cover"
        />
      );
    }

    if (result.type === 'creator') {
      return (
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
          {result.title.charAt(0).toUpperCase()}
        </div>
      );
    }

    return (
      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
        {getIcon(result.type)}
      </div>
    );
  };

  const filteredResults = results.filter(result => {
    if (activeCategory === 'Todos') return true;
    if (activeCategory === 'Oportunidades') return result.type === 'opportunity';
    if (activeCategory === 'Criadores') return result.type === 'creator';
    if (activeCategory === 'Empresas') return result.type === 'company';
    return true;
  });

  const groupedResults = {
    opportunities: filteredResults.filter(r => r.type === 'opportunity'),
    creators: filteredResults.filter(r => r.type === 'creator'),
    companies: filteredResults.filter(r => r.type === 'company')
  };

  const clearSearch = () => {
    setSearchTerm('');
    setResults([]);
    setIsOpen(false);
    setActiveCategory('Todos');
  };

  return (
    <div ref={searchRef} className="relative flex-1 max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => searchTerm.length >= 2 && setIsOpen(true)}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Category Filters */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex gap-2 flex-wrap">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    activeCategory === category
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>Nenhum resultado encontrado</p>
              </div>
            ) : (
              <div className="p-2">
                {/* Opportunities */}
                {groupedResults.opportunities.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-500 px-3 py-2">Oportunidades</h3>
                    {groupedResults.opportunities.map(result => (
                      <div
                        key={result.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                      >
                        {getAvatar(result)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{result.title}</p>
                          <p className="text-sm text-gray-600 truncate">{result.subtitle}</p>
                        </div>
                        <Target className="h-4 w-4 text-blue-600" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Creators */}
                {groupedResults.creators.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-500 px-3 py-2">Criadores</h3>
                    {groupedResults.creators.map(result => (
                      <div
                        key={result.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                      >
                        {getAvatar(result)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{result.title}</p>
                          <p className="text-sm text-gray-600 truncate">{result.subtitle}</p>
                        </div>
                        <MessageCircle className="h-4 w-4 text-green-600" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Companies */}
                {groupedResults.companies.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-500 px-3 py-2">Empresas</h3>
                    {groupedResults.companies.map(result => (
                      <div
                        key={result.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                      >
                        {getAvatar(result)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{result.title}</p>
                          <p className="text-sm text-gray-600 truncate">{result.subtitle}</p>
                        </div>
                        <Building className="h-4 w-4 text-purple-600" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;