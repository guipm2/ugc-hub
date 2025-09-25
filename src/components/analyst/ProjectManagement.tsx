import React, { useState, useEffect, useCallback } from 'react';
import { Folder, Calendar, User, CheckCircle, Clock, AlertCircle, MessageCircle, Filter, Eye, FileText, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAnalystAuth } from '../../contexts/AnalystAuthContext';
import { useRouter } from '../../hooks/useRouter';

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

interface ProjectManagementProps {
  onOpenConversation?: (conversationId: string) => void;
}

const ProjectManagement: React.FC<ProjectManagementProps> = ({ onOpenConversation }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'overdue'>('all');
  const [showCreateDeliverableModal, setShowCreateDeliverableModal] = useState(false);
  const [deliverableForm, setDeliverableForm] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 1
  });
  const { user } = useAnalystAuth();
  const { navigate } = useRouter();
  
  const createCustomDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProject || !user || !deliverableForm.title || !deliverableForm.due_date) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      const { error } = await supabase
        .from('project_deliverables')
        .insert({
          application_id: selectedProject.id,
          opportunity_id: selectedProject.opportunity_id,
          creator_id: selectedProject.creator_id,
          analyst_id: user.id,
          title: deliverableForm.title,
          description: deliverableForm.description,
          due_date: deliverableForm.due_date,
          priority: deliverableForm.priority,
          status: 'pending'
        });

      if (error) {
        console.error('Erro ao criar deliverable:', error);
        alert('Erro ao criar deliverable');
        return;
      }

      // Fechar modal e resetar form
      setShowCreateDeliverableModal(false);
      setDeliverableForm({ title: '', description: '', due_date: '', priority: 1 });
      
      // Recarregar projetos para atualizar a lista
      fetchProjects();
      
      alert('Deliverable criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar deliverable:', error);
      alert('Erro ao criar deliverable');
    }
  };
  const openConversation = async (project: Project) => {
    console.log('🚀 Iniciando openConversation para projeto:', project);
    console.log('📋 Dados do projeto:', {
      id: project.id,
      opportunity_id: project.opportunity_id,
      creator_id: project.creator_id,
      opportunity_title: project.opportunity_title
    });
    
    try {
      // Buscar conversa única entre analista e criador (independente do projeto)
      console.log('🔍 Buscando conversa única entre analista e criador...');
      const { data: existingConversation, error: searchError } = await supabase
        .from('conversations')
        .select('id')
        .eq('creator_id', project.creator_id)
        .eq('analyst_id', user?.id)
        .maybeSingle();

      console.log('📊 Resultado da busca (conversa única):', existingConversation);
      console.log('❌ Erro da busca:', searchError);

      if (searchError && searchError.code !== 'PGRST116') {
        console.error('Erro ao buscar conversa única:', searchError);
        return;
      }

      let conversationId = existingConversation?.id;

      // Se não existe conversa única, cria uma nova
      if (!conversationId) {
        console.log('🆕 Criando nova conversa única entre analista e criador...');
        const { data: newConversation, error: createError } = await supabase
          .from('conversations')
          .insert({
            opportunity_id: null, // Conversa geral, não específica de projeto
            creator_id: project.creator_id,
            analyst_id: user?.id,
            last_message_at: new Date().toISOString()
          })
          .select('id')
          .single();

        console.log('📊 Nova conversa única criada:', newConversation);
        console.log('❌ Erro ao criar:', createError);

        if (createError) {
          console.error('Erro ao criar conversa única:', createError);
          return;
        }

        conversationId = newConversation.id;
      }

      console.log('💬 ID da conversa única final:', conversationId);
      console.log('🧭 Navegando para messages...');
      
      // Navega para a página de mensagens
      navigate('/analysts/messages');
      
      // Chama o callback para abrir a conversa única específica
      console.log('📞 Chamando onOpenConversation com ID da conversa única:', conversationId);
      if (onOpenConversation) {
        onOpenConversation(conversationId);
      }
    } catch (error) {
      console.error('❌ Erro geral ao gerenciar conversa única:', error);
    }
  };

  const fetchProjects = useCallback(async () => {
    if (!user) {
      console.log('❌ Usuário não encontrado');
      return;
    }

    console.log('🔍 Iniciando busca de projetos para o analista:', user.id);

    try {
      // Buscar candidaturas aprovadas para oportunidades do analista
      const { data: applications, error } = await supabase
        .from('opportunity_applications')
        .select(`
          id,
          opportunity_id,
          creator_id,
          status,
          opportunity:opportunities (
            id,
            title,
            company,
            description,
            deadline,
            content_type,
            budget_min,
            budget_max,
            created_by
          ),
          creator:profiles!creator_id (
            name,
            email
          )
        `)
        .eq('status', 'approved');

      console.log('✅ Todas as candidaturas aprovadas:', applications);

      if (error) {
        console.error('❌ Erro ao buscar candidaturas:', error);
        setProjects([]);
        return;
      }

      if (!applications || applications.length === 0) {
        console.log('📭 Nenhuma candidatura aprovada encontrada');
        setProjects([]);
        return;
      }

      // Filtrar apenas as oportunidades criadas pelo analista atual
      const filteredApplications = applications.filter(app => {
        const opportunity = Array.isArray(app.opportunity) ? app.opportunity[0] : app.opportunity;
        const isFromAnalyst = opportunity && opportunity.created_by === user.id;
        console.log(`🔍 Verificando oportunidade ${opportunity?.title}: criada por ${opportunity?.created_by}, analista atual: ${user.id}, match: ${isFromAnalyst}`);
        return isFromAnalyst;
      });

      console.log('🎯 Candidaturas filtradas para o analista:', filteredApplications);

      // Processar cada candidatura aprovada
      const projectsData: Project[] = [];
      
      for (const app of filteredApplications) {
        const opportunity = Array.isArray(app.opportunity) ? app.opportunity[0] : app.opportunity;
        const creator = Array.isArray(app.creator) ? app.creator[0] : app.creator;
        
        if (!opportunity || !creator) {
          console.warn('⚠️ Dados incompletos para a candidatura:', app.id);
          continue;
        }

        console.log('🔄 Processando projeto:', opportunity.title, 'para', creator.name);

        // Gerar deliverables padrão
        const standardDeliverables = generateStandardDeliverables(opportunity.content_type, opportunity.deadline, app.id);

        // Buscar deliverables customizados do banco de dados
        const { data: customDeliverablesData } = await supabase
          .from('project_deliverables')
          .select('*')
          .eq('application_id', app.id)
          .eq('analyst_id', user.id);

        const customDeliverables: ProjectDeliverable[] = (customDeliverablesData || []).map(d => ({
          id: d.id,
          title: d.title,
          description: d.description,
          due_date: d.due_date,
          priority: d.priority,
          status: d.status,
          analyst_feedback: d.analyst_feedback,
          reviewed_at: d.reviewed_at,
          files: [],
          created_at: d.created_at,
          updated_at: d.updated_at
        }));

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
          customDeliverables,
          conversation_id: undefined,
          created_at: new Date().toISOString() // Usar data atual como fallback
        });
      }

      console.log('📦 Projetos finais processados:', projectsData);
      setProjects(projectsData);
    } catch (error) {
      console.error('❌ Erro ao buscar projetos:', error);
      setProjects([]);
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
              onClick={() => setShowCreateDeliverableModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Nova Entrega
            </button>
            <button
              onClick={() => openConversation(selectedProject)}
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
            <div className="mt-4 text-left bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">🔍 Debug Information:</p>
              <p className="text-xs text-gray-500">Total de projetos carregados: {projects.length}</p>
              <p className="text-xs text-gray-500">Usuário analista ID: {user?.id}</p>
              <p className="text-xs text-gray-500">Filtro atual: {statusFilter}</p>
            </div>
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
                          openConversation(project);
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

      {/* Modal para Criar Deliverable */}
      {showCreateDeliverableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold">Criar Nova Entrega</h3>
              <button
                onClick={() => setShowCreateDeliverableModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={createCustomDeliverable} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título da Entrega
                </label>
                <input
                  type="text"
                  value={deliverableForm.title}
                  onChange={(e) => setDeliverableForm(prev => ({
                    ...prev,
                    title: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Arte para Instagram"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  value={deliverableForm.description}
                  onChange={(e) => setDeliverableForm(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Descreva a entrega esperada..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Entrega
                </label>
                <input
                  type="date"
                  value={deliverableForm.due_date}
                  onChange={(e) => setDeliverableForm(prev => ({
                    ...prev,
                    due_date: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateDeliverableModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  Criar Entrega
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManagement;