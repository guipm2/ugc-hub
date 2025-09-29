import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, AlertCircle, Play, Pause, ArrowRight, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface Deliverable {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: 1 | 2 | 3 | 4 | 5;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  created_at: string;
  opportunity: {
    title: string;
    company: string;
  } | null;
}

interface CreatorDeliverablesProps {
  variant?: 'full' | 'compact';
  className?: string;
  onOpenProject?: (projectId: string) => void;
}

const CreatorDeliverables: React.FC<CreatorDeliverablesProps> = ({ 
  variant = 'full', 
  className = '',
  onOpenProject
}) => {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'overdue' | 'completed'>('all');
  const { user } = useAuth();

  useEffect(() => {
    const fetchDeliverables = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('project_deliverables')
          .select(`
            id,
            title,
            description,
            due_date,
            priority,
            status,
            created_at,
            opportunity:opportunities(
              title,
              company
            )
          `)
          .eq('creator_id', user.id)
          .order('due_date', { ascending: true });

        if (error) {
          console.error('Erro ao buscar deliverables:', error);
          setDeliverables([]);
        } else {
          // Update status based on due date
          const today = new Date();
          const updatedDeliverables = data?.map(deliverable => {
            const dueDate = new Date(deliverable.due_date);
            let status = deliverable.status;
            
            // Auto-mark as overdue if past due date and not completed
            if (dueDate < today && status !== 'completed') {
              status = 'overdue';
            }
            
            const opportunity = Array.isArray(deliverable.opportunity) 
              ? deliverable.opportunity[0] 
              : deliverable.opportunity;

            return {
              ...deliverable,
              status,
              opportunity: opportunity || { title: 'Projeto', company: 'Empresa' }
            };
          }) as Deliverable[];

          setDeliverables(updatedDeliverables || []);
        }
      } catch (error) {
        console.error('Erro ao carregar deliverables:', error);
        setDeliverables([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDeliverables();
  }, [user]);

  const getPriorityLabel = (priority: number) => {
    const labels = { 1: 'Baixa', 2: 'Normal', 3: 'Alta', 4: 'Urgente', 5: 'Crítica' };
    return labels[priority as keyof typeof labels] || 'Normal';
  };

  const getPriorityColor = (priority: number) => {
    const colors = {
      1: 'text-gray-600 bg-gray-100',
      2: 'text-blue-600 bg-blue-100',
      3: 'text-yellow-600 bg-yellow-100',
      4: 'text-orange-600 bg-orange-100',
      5: 'text-red-600 bg-red-100'
    };
    return colors[priority as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Play className="h-4 w-4 text-blue-600" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Pause className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'in_progress':
        return 'border-blue-200 bg-blue-50';
      case 'overdue':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluído';
      case 'in_progress':
        return 'Em Andamento';
      case 'overdue':
        return 'Em Atraso';
      case 'pending':
        return 'Pendente';
      default:
        return 'Pendente';
    }
  };

  const getDaysLeft = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)} dias em atraso`;
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Amanhã';
    return `${diffDays} dias`;
  };

  const filteredDeliverables = deliverables.filter(deliverable => {
    if (filter === 'all') return true;
    return deliverable.status === filter;
  });

  const displayDeliverables = variant === 'compact' 
    ? filteredDeliverables.slice(0, 3)
    : filteredDeliverables;

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          {variant === 'compact' ? 'Próximas Entregas' : 'Meus Deliverables'}
        </h3>
        <div className="flex items-center gap-3">
          {variant === 'full' && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'pending' | 'in_progress' | 'overdue' | 'completed')}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos</option>
                <option value="pending">Pendentes</option>
                <option value="in_progress">Em Andamento</option>
                <option value="overdue">Em Atraso</option>
                <option value="completed">Concluídos</option>
              </select>
            </div>
          )}
          {variant === 'compact' && deliverables.length > 3 && (
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              Ver todos <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {displayDeliverables.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">
            {filter === 'all' 
              ? 'Nenhum deliverable encontrado' 
              : `Nenhum deliverable ${getStatusLabel(filter).toLowerCase()} encontrado`
            }
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Deliverables aparecerão aqui quando forem atribuídos a você
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayDeliverables.map((deliverable) => (
            <div
              key={deliverable.id}
              className={`border rounded-lg p-4 transition-all hover:shadow-md cursor-pointer ${getStatusColor(deliverable.status)}`}
              onClick={() => onOpenProject?.(deliverable.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(deliverable.status)}
                    <h4 className="text-sm font-semibold text-gray-900 truncate">
                      {deliverable.title}
                    </h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(deliverable.priority)}`}>
                      {getPriorityLabel(deliverable.priority)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{deliverable.opportunity?.company}</p>
                  
                  {deliverable.description && (
                    <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                      {deliverable.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(deliverable.due_date).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span className={
                          deliverable.status === 'overdue' ? 'text-red-600 font-medium' :
                          getDaysLeft(deliverable.due_date).includes('Hoje') || getDaysLeft(deliverable.due_date).includes('Amanhã') ? 'text-orange-600 font-medium' :
                          'text-gray-500'
                        }>
                          {getDaysLeft(deliverable.due_date)}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      deliverable.status === 'completed' ? 'bg-green-100 text-green-700' :
                      deliverable.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      deliverable.status === 'overdue' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {getStatusLabel(deliverable.status)}
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 ml-3 flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      )}

      {variant === 'full' && filteredDeliverables.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">
                {deliverables.filter(d => d.status === 'completed').length}
              </div>
              <div className="text-xs text-gray-500">Concluídos</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600">
                {deliverables.filter(d => d.status === 'in_progress').length}
              </div>
              <div className="text-xs text-gray-500">Em Andamento</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-600">
                {deliverables.filter(d => d.status === 'pending').length}
              </div>
              <div className="text-xs text-gray-500">Pendentes</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-600">
                {deliverables.filter(d => d.status === 'overdue').length}
              </div>
              <div className="text-xs text-gray-500">Em Atraso</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatorDeliverables;