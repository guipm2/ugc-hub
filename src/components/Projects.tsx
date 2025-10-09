import React, { useState, useEffect, useCallback } from 'react';
import { Folder, Calendar, Upload, MessageCircle, CheckCircle, Clock, AlertCircle, FileText, Eye, X, Grid3X3, List, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import ProjectInfo from './ProjectInfo';
import { router } from '../utils/router';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

// Helper function to navigate to project
const navigateToProject = (projectId: string) => {
  router.navigate(`/creators/projects/${projectId}`);
};

interface Project {
  id: string;
  opportunity_id: string;
  title: string;
  company: string;
  description: string;
  deadline: string;
  status: 'em_andamento' | 'entregue' | 'aprovado' | 'atrasado';
  content_type: string;
  budget: string;
  conversation_id: string;
  deliverables: Deliverable[];
  created_at: string;
  opportunity?: {
    company_link?: string;
    briefing?: string;
  };
}

interface ProjectsProps {
  onOpenConversation: (conversationId: string) => void;
  selectedProjectId?: string; // Add support for URL-based project selection
}

interface Deliverable {
  id: string;
  project_id?: string;
  application_id?: string;
  title: string;
  description: string;
  briefing?: string;
  due_date: string;
  priority?: number;
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected' | 'pendente' | 'entregue' | 'aprovado';
  analyst_feedback?: string;
  reviewed_at?: string;
  files: ProjectFile[];
  feedback?: string;
  created_at?: string;
  updated_at?: string;
}

interface ProjectFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploaded_at: string;
}

const Projects: React.FC<ProjectsProps> = ({ onOpenConversation, selectedProjectId }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState<string | null>(null);
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [hideCompleted, setHideCompleted] = useState(false);
  const { user } = useAuth();

  // Auto-select project based on URL parameter
  useEffect(() => {
    if (selectedProjectId && projects.length > 0) {
      const project = projects.find(p => p.id === selectedProjectId);
      if (project) {
        setSelectedProject(project);
      }
    }
  }, [selectedProjectId, projects]);

  const fetchProjects = useCallback(async () => {
    if (!user || fetching) return;

    setFetching(true);
    try {
      // Buscar candidaturas aprovadas
      const { data: applications, error } = await supabase
        .from('opportunity_applications')
        .select(`
          id,
          opportunity_id,
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
            created_by,
            company_link,
            briefing,
            created_at
          )
        `)
        .eq('creator_id', user.id)
        .eq('status', 'approved');

      if (error) {
        console.error('❌ [PROJECTS] Erro ao buscar projetos:', error);
        return;
      }

      const projectsData = [];
      
      for (const app of applications || []) {
        const opportunity = Array.isArray(app.opportunity) ? app.opportunity[0] : app.opportunity;
        
        if (!opportunity) continue;

        // Buscar conversa relacionada
        const { data: conversation, error: conversationError } = await supabase
          .from('conversations')
          .select('id')
          .eq('opportunity_id', app.opportunity_id)
          .eq('creator_id', user.id)
          .eq('analyst_id', opportunity.created_by)
          .maybeSingle();

        if (conversationError) {
          console.error('❌ [PROJECTS] Erro ao buscar conversa:', conversationError);
        }

        // Buscar deliverables customizados do banco para esta candidatura
        const { data: customDeliverables, error: deliverablesError } = await supabase
          .from('project_deliverables')
          .select('*')
          .eq('application_id', app.id)
          .order('priority', { ascending: true });

        if (deliverablesError) {
          console.error('❌ [PROJECTS] Erro ao buscar deliverables:', deliverablesError);
        }

        // Gerar deliverables padrão baseados no tipo de conteúdo
        const standardDeliverables = generateDeliverables(opportunity.content_type, app.id);
        
        // Mapear deliverables customizados para a interface local
        const mappedCustomDeliverables: Deliverable[] = customDeliverables ? customDeliverables.map(d => ({
          id: d.id,
          application_id: d.application_id,
          title: d.title,
          description: d.description || '',
          briefing: d.briefing || '',
          due_date: d.due_date,
          priority: d.priority,
          status: d.status,
          analyst_feedback: d.analyst_feedback,
          reviewed_at: d.reviewed_at,
          files: [],
          created_at: d.created_at,
          updated_at: d.updated_at
        })) : [];

        // ✅ Combinar deliverables padrão e customizados em uma lista unificada
        const allDeliverables = [
          ...standardDeliverables,
          ...mappedCustomDeliverables
        ].sort((a, b) => (a.priority || 999) - (b.priority || 999));

        projectsData.push({
          id: app.id,
          opportunity_id: app.opportunity_id,
          title: opportunity.title,
          company: opportunity.company,
          description: opportunity.description,
          deadline: opportunity.deadline,
          status: getProjectStatus(opportunity.deadline, allDeliverables),
          content_type: opportunity.content_type,
          budget: `R$ ${opportunity.budget_min} - R$ ${opportunity.budget_max}`,
          conversation_id: conversation?.id || '',
          deliverables: allDeliverables,
          created_at: new Date().toISOString(),
          opportunity: {
            company_link: opportunity.company_link,
            briefing: opportunity.briefing
          }
        });
      }

      setProjects(projectsData);
    } catch (err) {
      console.error('❌ [PROJECTS] Erro geral ao buscar projetos:', err);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [user, fetching]);

  useEffect(() => {
    let mounted = true;
    
    if (user && !fetching) {
      fetchProjects().then(() => {
        if (!mounted) return;
        // Execução completa
      });
    }

    return () => {
      mounted = false;
    };
  }, [user, fetchProjects, fetching]);

  useAutoRefresh(fetchProjects, 25000, Boolean(user));

  const getProjectStatus = (deadline: string, deliverables?: Deliverable[]): 'em_andamento' | 'entregue' | 'aprovado' | 'atrasado' => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    
    if (deliverables) {
      const allApproved = deliverables.every(d => d.status === 'approved' || d.status === 'aprovado');
      const allSubmitted = deliverables.every(d => 
        d.status === 'submitted' || d.status === 'entregue' || 
        d.status === 'approved' || d.status === 'aprovado'
      );
      
      if (allApproved) return 'aprovado';
      if (allSubmitted) return 'entregue';
    }
    
    if (today > deadlineDate) {
      return 'atrasado';
    }
    return 'em_andamento';
  };

  const generateDeliverables = (contentType: string, applicationId?: string): Deliverable[] => {
    const baseDeliverables = [];

    if (contentType.toLowerCase().includes('reel') || contentType.toLowerCase().includes('video')) {
      baseDeliverables.push({
        id: `std_2_${applicationId || Date.now()}`,
        project_id: '',
        application_id: applicationId,
        title: 'Roteiro e Storyboard',
        description: 'Roteiro detalhado e storyboard do vídeo',
        briefing: 'O briefing para desenvolvimento do roteiro será fornecido após aprovação do conceito inicial. Incluirá direcionamentos sobre narrativa, duração, elementos visuais e chamadas para ação.',
        due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 2,
        status: 'pendente' as const,
        files: []
      });
    }

    return baseDeliverables;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      em_andamento: { color: 'bg-blue-100 text-blue-700', label: 'Em Andamento', icon: Clock },
      entregue: { color: 'bg-yellow-100 text-yellow-700', label: 'Entregue', icon: Upload },
      aprovado: { color: 'bg-green-100 text-green-700', label: 'Aprovado', icon: CheckCircle },
      atrasado: { color: 'bg-red-100 text-red-700', label: 'Atrasado', icon: AlertCircle },
      pending: { color: 'bg-gray-100 text-gray-700', label: 'Pendente', icon: Clock },
      pendente: { color: 'bg-gray-100 text-gray-700', label: 'Pendente', icon: Clock },
      in_progress: { color: 'bg-blue-100 text-blue-700', label: 'Em Progresso', icon: Clock },
      submitted: { color: 'bg-yellow-100 text-yellow-700', label: 'Enviado', icon: Upload },
      approved: { color: 'bg-green-100 text-green-700', label: 'Aprovado', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-700', label: 'Rejeitado', icon: X },
      rejeitado: { color: 'bg-red-100 text-red-700', label: 'Rejeitado', icon: X }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  const handleFileUpload = async (deliverableId: string) => {
    if (!uploadFiles || uploadFiles.length === 0) return;

    
    // Simular upload de arquivos (TODO: Implementar upload real para Supabase Storage)
    const newFiles: ProjectFile[] = Array.from(uploadFiles).map((file, index) => ({
      id: `file_${Date.now()}_${index}`,
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type,
      size: file.size,
      uploaded_at: new Date().toISOString()
    }));

    // Atualizar o projeto com os novos arquivos
    if (selectedProject) {
      const updatedProject = {
        ...selectedProject,
        deliverables: selectedProject.deliverables.map(d =>
          d.id === deliverableId
            ? { ...d, files: [...d.files, ...newFiles], status: 'submitted' as const }
            : d
        )
      };

      setSelectedProject(updatedProject);
      setProjects(projects.map(p => p.id === selectedProject.id ? updatedProject : p));
    }

    setShowUploadModal(null);
    setUploadFiles(null);
      };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const openConversation = (project: Project) => {
    // Usar o opportunity_id para navegar para o chat (não o ID da aplicação)
        onOpenConversation(project.opportunity_id);
  };

  const filteredProjects = projects.filter(project => {
    if (statusFilter !== 'todos' && project.status !== statusFilter) {
      return false;
    }
    
    if (hideCompleted && (project.status === 'aprovado' || project.status === 'entregue')) {
      return false;
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Meus Projetos</h1>
          <p className="text-gray-600 mt-1">Carregando projetos...</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Se projeto selecionado, mostrar detalhes
  if (selectedProject) {
    return (
      <div className="space-y-6">
        {/* Header do Projeto */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setSelectedProject(null);
                router.navigate('/creators/projects');
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ←
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{selectedProject.title}</h1>
              <p className="text-gray-600">{selectedProject.company}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(selectedProject.status)}
            <button
              onClick={() => openConversation(selectedProject)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Conversar com Analista
            </button>
          </div>
        </div>

        {/* Informações do Projeto */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalhes do Projeto</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-700">Prazo de Entrega</p>
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
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Descrição</p>
            <p className="text-gray-600">{selectedProject.description}</p>
          </div>
        </div>

        {/* Informações do Projeto (Briefing e Empresa) */}
        <ProjectInfo 
          project={{
            title: selectedProject.title,
            company: selectedProject.company,
            description: selectedProject.description,
            company_link: selectedProject.opportunity?.company_link,
            created_at: selectedProject.created_at
          }}
          briefing={selectedProject.opportunity?.briefing}
        />

        {/* Entregas Unificadas */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Cronograma de Entregas</h3>
          
          {selectedProject.deliverables.length > 0 ? (
            <div className="space-y-4">
              {selectedProject.deliverables.map((deliverable) => {
                const isCustom = deliverable.application_id && deliverable.id.startsWith('std_') === false;
                return (
                  <div 
                    key={deliverable.id} 
                    className={`border rounded-lg p-4 ${
                      isCustom 
                        ? 'border-purple-200 bg-purple-50/30' 
                        : 'border-blue-200 bg-blue-50/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-gray-900">{deliverable.title}</h5>
                          {isCustom && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                              Específica
                            </span>
                          )}
                          {deliverable.priority && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                              Prioridade {deliverable.priority}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{deliverable.description}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">
                          Prazo: {formatDate(deliverable.due_date)}
                        </span>
                        {getStatusBadge(deliverable.status)}
                      </div>
                    </div>

                    {/* Arquivos */}
                    {deliverable.files.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Arquivos Enviados:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {deliverable.files.map((file) => (
                            <div key={file.id} className="flex items-center gap-2 p-2 bg-white rounded border">
                              <FileText className="h-4 w-4 text-gray-400" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                              </div>
                              <button className="p-1 hover:bg-gray-200 rounded">
                                <Eye className="h-4 w-4 text-gray-400" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Botão de Upload - Apenas para deliverables customizados */}
                    {(deliverable.status === 'pending' || deliverable.status === 'pendente') && 
                     isCustom && (
                      <button
                        onClick={() => setShowUploadModal(deliverable.id)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Enviar Arquivos
                      </button>
                    )}

                    {/* Feedback do Analista */}
                    {deliverable.analyst_feedback && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm font-medium text-yellow-800">Feedback do Analista:</p>
                        <p className="text-sm text-yellow-700">{deliverable.analyst_feedback}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-6 bg-gray-50/20 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <h5 className="font-medium text-gray-900 mb-1">Nenhuma entrega definida</h5>
                  <p className="text-sm text-gray-600 max-w-md">
                    As entregas deste projeto ainda não foram definidas. 
                    Entre em contato com o analista para mais informações.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal de Upload */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Enviar Arquivos</h3>
                <button
                  onClick={() => setShowUploadModal(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecionar Arquivos
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setUploadFiles(e.target.files)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowUploadModal(null)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleFileUpload(showUploadModal)}
                    disabled={!uploadFiles || uploadFiles.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Lista de projetos
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Meus Projetos</h1>
          <p className="text-gray-600 mt-1">{filteredProjects.length} de {projects.length} projetos</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Filtros */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="todos">Todos os Status</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="entregue">Entregue</option>
            <option value="aprovado">Aprovado</option>
            <option value="atrasado">Atrasado</option>
          </select>

          <button
            onClick={() => setHideCompleted(!hideCompleted)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              hideCompleted 
                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {hideCompleted ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {hideCompleted ? 'Mostrar Concluídos' : 'Ocultar Concluídos'}
          </button>

          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Projetos */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Folder className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum projeto encontrado</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            {statusFilter !== 'todos' || hideCompleted
              ? 'Tente ajustar os filtros para ver mais projetos.'
              : 'Você ainda não tem projetos aprovados. Continue aplicando para oportunidades!'}
          </p>
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
          : 'space-y-4'
        }>
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => {
                setSelectedProject(project);
                navigateToProject(project.id);
              }}
              className={`bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer ${
                viewMode === 'list' ? 'flex items-center justify-between' : ''
              }`}
            >
              {viewMode === 'grid' ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 truncate">{project.title}</h3>
                    {getStatusBadge(project.status)}
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      Prazo: {formatDate(project.deadline)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FileText className="h-4 w-4" />
                      {project.content_type}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Entregas: {project.deliverables.filter(d => 
                        d.status === 'submitted' || d.status === 'approved' || 
                        d.status === 'entregue' || d.status === 'aprovado'
                      ).length}/{project.deliverables.length}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openConversation(project);
                      }}
                      className="text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="font-semibold text-gray-900">{project.title}</h3>
                      {getStatusBadge(project.status)}
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(project.deadline)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {project.content_type}
                      </span>
                      <span>
                        {project.deliverables.filter(d => 
                          d.status === 'submitted' || d.status === 'approved' || 
                          d.status === 'entregue' || d.status === 'aprovado'
                        ).length}/{project.deliverables.length} entregas
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openConversation(project);
                    }}
                    className="text-blue-600 hover:text-blue-700 transition-colors p-2"
                  >
                    <MessageCircle className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;