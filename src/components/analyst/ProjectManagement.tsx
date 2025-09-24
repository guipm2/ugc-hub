import React, { useState, useEffect, useCallback } from 'react';
import { Folder, Calendar, User, CheckCircle, Clock, AlertCircle, MessageCircle, Filter, Eye, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAnalystAuth } from '../../contexts/AnalystAuthContext';

interface Project {
  id: string;
  opportunity_id: string;
  opportunity_title: string;
  company: string;
  content_type: string;
  deadline: string;
  budget: string;
  creator_id: string;
  creator_name: string;
  creator_email: string;
  standardDeliverables: ProjectDeliverable[];
  customDeliverables: ProjectDeliverable[];
  conversation_id?: string;
  created_at: string;
}

interface ProjectDeliverable {
  id: string;
  title: string;
  description: string;
  due_date: string;
  priority?: number;
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
  analyst_feedback?: string;
  reviewed_at?: string;
  files?: DeliverableFile[];
  created_at: string;
  updated_at: string;
}

interface DeliverableFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploaded_at: string;
}

interface DeliverableUpdate {
  status: string;
  updated_at: string;
  analyst_feedback?: string;
  reviewed_at?: string;
}

const ProjectManagement: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'overdue'>('all');
  const { user } = useAnalystAuth();

  const fetchProjects = useCallback(async () => {
    if (!user) return;

    try {
      // Buscar candidaturas aprovadas para oportunidades do analista
      const { data: applications, error } = await supabase
        .from('opportunity_applications')
        .select(`
          id,
          opportunity_id,
          creator_id,
          created_at,
          opportunity:opportunities (
            id,
            title,
            company,
            description,
            deadline,
            content_type,
            budget_min,
            budget_max
          ),
          creator:profiles!creator_id (
            name,
            email
          )
        `)
        .eq('status', 'approved')
        .eq('opportunity.created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar projetos:', error);
        return;
      }

      // Processar cada candidatura aprovada
      const projectsData: Project[] = [];
      
      for (const app of applications || []) {
        const opportunity = Array.isArray(app.opportunity) ? app.opportunity[0] : app.opportunity;
        const creator = Array.isArray(app.creator) ? app.creator[0] : app.creator;
        
        if (!opportunity || !creator) continue;

        // Buscar deliverables customizados
        const { data: customDeliverables, error: deliverablesError } = await supabase
          .from('project_deliverables')
          .select('*')
          .eq('application_id', app.id)
          .order('priority', { ascending: true });

        if (deliverablesError) {
          console.error('Erro ao buscar deliverables customizados:', deliverablesError);
        }

        // Buscar conversa relacionada
        const { data: conversation } = await supabase
          .from('conversations')
          .select('id')
          .eq('opportunity_id', app.opportunity_id)
          .eq('creator_id', app.creator_id)
          .eq('analyst_id', user.id)
          .single();

        // Gerar deliverables padrão
        const standardDeliverables = generateStandardDeliverables(opportunity.content_type, opportunity.deadline, app.id);
        
        // Mapear deliverables customizados
        const mappedCustomDeliverables: ProjectDeliverable[] = customDeliverables ? customDeliverables.map(d => ({
          id: d.id,
          title: d.title,
          description: d.description || '',
          due_date: d.due_date,
          priority: d.priority,
          status: d.status,
          analyst_feedback: d.analyst_feedback,
          reviewed_at: d.reviewed_at,
          files: [], // TODO: Implementar arquivos se necessário
          created_at: d.created_at,
          updated_at: d.updated_at
        })) : [];

        projectsData.push({
          id: app.id,
          opportunity_id: app.opportunity_id,
          opportunity_title: opportunity.title,
          company: opportunity.company,
          content_type: opportunity.content_type,
          deadline: opportunity.deadline,
          budget: `R$ ${opportunity.budget_min} - R$ ${opportunity.budget_max}`,
          creator_id: app.creator_id,
          creator_name: creator.name || 'Nome não informado',
          creator_email: creator.email || '',
          standardDeliverables,
          customDeliverables: mappedCustomDeliverables,
          conversation_id: conversation?.id,
          created_at: app.created_at
        });
      }

      setProjects(projectsData);
    } catch (error) {
      console.error('Erro ao buscar projetos:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const generateStandardDeliverables = (contentType: string, deadline: string, applicationId: string): ProjectDeliverable[] => {
    const baseDeliverables = [
      {
        id: `std_1_${applicationId}`,
        title: 'Briefing e Conceito',
        description: 'Apresentar o conceito criativo e briefing do conteúdo',
        due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 1,
        status: 'pending' as const,
        files: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    if (contentType.toLowerCase().includes('reel') || contentType.toLowerCase().includes('video')) {
      baseDeliverables.push({
        id: `std_2_${applicationId}`,
        title: 'Roteiro e Storyboard',
        description: 'Roteiro detalhado e storyboard do vídeo',
        due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 2,
        status: 'pending' as const,
        files: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    baseDeliverables.push({
      id: `std_3_${applicationId}`,
      title: 'Conteúdo Final',
      description: `Entrega do ${contentType} finalizado`,
      due_date: deadline,
      priority: 3,
      status: 'pending' as const,
      files: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    return baseDeliverables;
  };

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user, fetchProjects]);

  const getStatusBadge = (status: string, dueDate: string) => {
    const isOverdue = new Date(dueDate) < new Date() && status !== 'approved';
    
    const configs = {
      pending: { 
        label: isOverdue ? 'Atrasado' : 'Pendente', 
        color: isOverdue ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800',
        icon: isOverdue ? AlertCircle : Clock
      },
      in_progress: { 
        label: isOverdue ? 'Atrasado (Em andamento)' : 'Em andamento', 
        color: isOverdue ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800',
        icon: isOverdue ? AlertCircle : Clock
      },
      submitted: { 
        label: 'Aguardando Revisão', 
        color: 'bg-purple-100 text-purple-800',
        icon: Eye
      },
      approved: { 
        label: 'Aprovado', 
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle
      },
      rejected: { 
        label: 'Rejeitado', 
        color: 'bg-red-100 text-red-800',
        icon: AlertCircle
      }
    };

    const config = configs[status as keyof typeof configs] || configs.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  const getProjectProgress = (project: Project) => {
    const allDeliverables = [...project.standardDeliverables, ...project.customDeliverables];
    const completed = allDeliverables.filter(d => d.status === 'approved').length;
    return { completed, total: allDeliverables.length };
  };

  const getProjectStatus = (project: Project) => {
    const allDeliverables = [...project.standardDeliverables, ...project.customDeliverables];
    const hasOverdue = allDeliverables.some(d => new Date(d.due_date) < new Date() && d.status !== 'approved');
    const allCompleted = allDeliverables.every(d => d.status === 'approved');
    const hasSubmitted = allDeliverables.some(d => d.status === 'submitted');
    
    if (allCompleted) return 'completed';
    if (hasOverdue) return 'overdue';
    if (hasSubmitted) return 'review';
    return 'active';
  };

  const updateDeliverableStatus = async (deliverableId: string, status: string, feedback?: string) => {
    try {
      const updateData: DeliverableUpdate = { 
        status, 
        updated_at: new Date().toISOString() 
      };
      
      if (feedback !== undefined) {
        updateData.analyst_feedback = feedback;
        updateData.reviewed_at = new Date().toISOString();
      }

      // Se for um deliverable customizado (do banco), atualizar no banco
      if (deliverableId.startsWith('std_')) {
        // Para deliverables padrão, apenas atualizar localmente por enquanto
        // TODO: Implementar sistema de arquivos para deliverables padrão
        alert('Funcionalidade de aprovação para deliverables padrão será implementada em breve');
        return;
      }

      const { error } = await supabase
        .from('project_deliverables')
        .update(updateData)
        .eq('id', deliverableId);

      if (error) {
        console.error('Erro ao atualizar status:', error);
        alert('Erro ao atualizar status');
        return;
      }

      // Recarregar projetos
      fetchProjects();
      alert(status === 'approved' ? 'Deliverable aprovado!' : 'Deliverable rejeitado!');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status');
    }
  };

  const filteredProjects = projects.filter(project => {
    const projectStatus = getProjectStatus(project);
    
    switch (statusFilter) {
      case 'active':
        return projectStatus === 'active' || projectStatus === 'review';
      case 'completed':
        return projectStatus === 'completed';
      case 'overdue':
        return projectStatus === 'overdue';
      default:
        return true;
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const openConversation = (conversationId?: string) => {
    if (conversationId) {
      // TODO: Implementar abertura da conversa
      alert('Funcionalidade de conversa será implementada');
    } else {
      alert('Conversa não encontrada para este projeto');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Administração de Projetos</h1>
          <p className="text-gray-600 mt-1">Carregando projetos...</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (selectedProject) {
    const progress = getProjectProgress(selectedProject);
    const allDeliverables = [...selectedProject.standardDeliverables, ...selectedProject.customDeliverables];
    
    return (
      <div className="space-y-6">
        {/* Header do Projeto */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedProject(null)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ←
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{selectedProject.opportunity_title}</h1>
              <p className="text-gray-600">{selectedProject.company} • {selectedProject.creator_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              Progresso: {progress.completed}/{progress.total}
            </span>
            <button
              onClick={() => openConversation(selectedProject.conversation_id)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Conversar
            </button>
          </div>
        </div>

        {/* Informações do Projeto */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalhes do Projeto</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-700">Creator</p>
              <p className="text-gray-900">{selectedProject.creator_name}</p>
              <p className="text-sm text-gray-500">{selectedProject.creator_email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Prazo Final</p>
              <p className="text-gray-900">{formatDate(selectedProject.deadline)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Tipo de Conteúdo</p>
              <p className="text-gray-900">{selectedProject.content_type}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Orçamento</p>
              <p className="text-gray-900">{selectedProject.budget}</p>
            </div>
          </div>
        </div>

        {/* Deliverables */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Status das Entregas</h3>
          
          <div className="space-y-6">
            {/* Deliverables Padrão */}
            {selectedProject.standardDeliverables.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  Entregas Padrão ({selectedProject.standardDeliverables.length})
                </h4>
                <div className="space-y-3">
                  {selectedProject.standardDeliverables.map((deliverable) => (
                    <div key={deliverable.id} className="border border-gray-200 rounded-lg p-4 bg-blue-50/30">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h5 className="font-medium text-gray-900">{deliverable.title}</h5>
                            {getStatusBadge(deliverable.status, deliverable.due_date)}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{deliverable.description}</p>
                          <p className="text-xs text-gray-500">Prazo: {formatDate(deliverable.due_date)}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {deliverable.status === 'submitted' && (
                            <>
                              <button
                                onClick={() => updateDeliverableStatus(deliverable.id, 'approved', 'Aprovado pelo analista')}
                                className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition-colors"
                              >
                                Aprovar
                              </button>
                              <button
                                onClick={() => {
                                  const feedback = prompt('Feedback para rejeição:');
                                  if (feedback !== null) {
                                    updateDeliverableStatus(deliverable.id, 'rejected', feedback);
                                  }
                                }}
                                className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors"
                              >
                                Rejeitar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {deliverable.analyst_feedback && (
                        <div className="mt-3 p-3 bg-gray-50 rounded">
                          <p className="text-sm font-medium text-gray-700">Seu Feedback:</p>
                          <p className="text-sm text-gray-600">{deliverable.analyst_feedback}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deliverables Customizados */}
            {selectedProject.customDeliverables.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-purple-600" />
                  Entregas Específicas ({selectedProject.customDeliverables.length})
                </h4>
                <div className="space-y-3">
                  {selectedProject.customDeliverables.map((deliverable) => (
                    <div key={deliverable.id} className="border border-purple-200 rounded-lg p-4 bg-purple-50/30">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h5 className="font-medium text-gray-900">{deliverable.title}</h5>
                            {getStatusBadge(deliverable.status, deliverable.due_date)}
                            {deliverable.priority && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                Prioridade: {deliverable.priority}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{deliverable.description}</p>
                          <p className="text-xs text-gray-500">Prazo: {formatDate(deliverable.due_date)}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {deliverable.status === 'submitted' && (
                            <>
                              <button
                                onClick={() => updateDeliverableStatus(deliverable.id, 'approved', 'Aprovado pelo analista')}
                                className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition-colors"
                              >
                                Aprovar
                              </button>
                              <button
                                onClick={() => {
                                  const feedback = prompt('Feedback para rejeição:');
                                  if (feedback !== null) {
                                    updateDeliverableStatus(deliverable.id, 'rejected', feedback);
                                  }
                                }}
                                className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors"
                              >
                                Rejeitar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {deliverable.analyst_feedback && (
                        <div className="mt-3 p-3 bg-gray-50 rounded">
                          <p className="text-sm font-medium text-gray-700">Seu Feedback:</p>
                          <p className="text-sm text-gray-600">{deliverable.analyst_feedback}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {allDeliverables.length === 0 && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum deliverable encontrado</p>
                <p className="text-gray-400 text-sm">Este projeto ainda não possui entregas definidas</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Administração de Projetos</h1>
        <p className="text-gray-600 mt-1">Gerencie o progresso de todos os seus projetos aprovados</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtrar por:
          </span>
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Todos' },
              { key: 'active', label: 'Ativos' },
              { key: 'overdue', label: 'Atrasados' },
              { key: 'completed', label: 'Concluídos' }
            ].map(option => (
              <button
                key={option.key}
                onClick={() => setStatusFilter(option.key as 'all' | 'active' | 'completed' | 'overdue')}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  statusFilter === option.key
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de Projetos */}
      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Folder className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum projeto encontrado</p>
            <p className="text-gray-400 text-sm mt-1">
              {statusFilter === 'all' 
                ? 'Você ainda não possui projetos aprovados'
                : 'Nenhum projeto corresponde ao filtro selecionado'
              }
            </p>
          </div>
        ) : (
          filteredProjects.map((project) => {
            const progress = getProjectProgress(project);
            const projectStatus = getProjectStatus(project);
            const totalDeliverables = project.standardDeliverables.length + project.customDeliverables.length;
            
            return (
              <div
                key={project.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 cursor-pointer"
                onClick={() => setSelectedProject(project)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Folder className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{project.opportunity_title}</h3>
                      <p className="text-gray-600 text-sm">{project.company}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {project.creator_name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(project.deadline)}
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {totalDeliverables} {totalDeliverables === 1 ? 'entrega' : 'entregas'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">Progresso</div>
                    <div className="text-lg font-semibold text-gray-900 mb-2">
                      {progress.completed}/{progress.total}
                    </div>
                    <div className="w-32 bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          projectStatus === 'completed' 
                            ? 'bg-green-600' 
                            : projectStatus === 'overdue'
                            ? 'bg-red-600'
                            : 'bg-blue-600'
                        }`}
                        style={{
                          width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%`
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {projectStatus === 'completed' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3" />
                          Concluído
                        </span>
                      )}
                      {projectStatus === 'overdue' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          <AlertCircle className="h-3 w-3" />
                          Atrasado
                        </span>
                      )}
                      {projectStatus === 'review' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                          <Eye className="h-3 w-3" />
                          Revisar
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openConversation(project.conversation_id);
                        }}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors text-sm"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Chat
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ProjectManagement;