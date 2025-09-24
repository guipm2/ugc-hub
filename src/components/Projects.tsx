import React, { useState, useEffect, useCallback } from 'react';
import { Folder, Calendar, Upload, MessageCircle, CheckCircle, Clock, AlertCircle, FileText, Eye, X, Grid3X3, List, Filter, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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
  deliverables: Deliverable[]; // Deliverables padrão baseados no tipo de conteúdo
  customDeliverables?: Deliverable[]; // Deliverables customizados criados pelo analista
  created_at: string;
}

interface ProjectsProps {
  onOpenConversation: (conversationId: string) => void;
}

interface Deliverable {
  id: string;
  project_id?: string; // Para compatibilidade com deliverables locais
  application_id?: string; // ID da candidatura para deliverables do banco
  title: string;
  description: string;
  due_date: string;
  priority?: number;
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected' | 'pendente' | 'entregue';
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

const Projects: React.FC<ProjectsProps> = ({ onOpenConversation }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState<string | null>(null);
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [hideCompleted, setHideCompleted] = useState(false);
  const { user } = useAuth();

  const fetchProjects = useCallback(async () => {
    if (!user) return;

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
            created_by
          )
        `)
        .eq('creator_id', user.id)
        .eq('status', 'approved');

      if (error) {
        console.error('Erro ao buscar projetos:', error);
        return;
      }

      // Buscar conversas e deliverables para cada candidatura aprovada
      const projectsData = [];
      
      for (const app of applications || []) {
        const opportunity = Array.isArray(app.opportunity) ? app.opportunity[0] : app.opportunity;
        
        // Buscar conversa relacionada
        const { data: conversation } = await supabase
          .from('conversations')
          .select('id')
          .eq('opportunity_id', app.opportunity_id)
          .eq('creator_id', user.id)
          .eq('analyst_id', opportunity.created_by)
          .single();

        // Buscar deliverables customizados do banco para esta candidatura
        const { data: customDeliverables, error: deliverablesError } = await supabase
          .from('project_deliverables')
          .select('*')
          .eq('application_id', app.id)
          .order('priority', { ascending: true });

        if (deliverablesError) {
          console.error('Erro ao buscar deliverables:', deliverablesError);
        }

        // Sempre gerar deliverables padrão baseados no tipo de conteúdo
        const standardDeliverables = generateDeliverables(opportunity.content_type, opportunity.deadline, app.id);
        
        // Mapear deliverables customizados para a interface local
        const mappedCustomDeliverables: Deliverable[] = customDeliverables ? customDeliverables.map(d => ({
          id: d.id,
          application_id: d.application_id,
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
          title: opportunity.title,
          company: opportunity.company,
          description: opportunity.description,
          deadline: opportunity.deadline,
          status: getProjectStatus(opportunity.deadline),
          content_type: opportunity.content_type,
          budget: `R$ ${opportunity.budget_min} - R$ ${opportunity.budget_max}`,
          conversation_id: conversation?.id || '',
          deliverables: standardDeliverables, // Sempre usar deliverables padrão
          customDeliverables: mappedCustomDeliverables, // Adicionar deliverables customizados separadamente
          created_at: new Date().toISOString()
        });
      }

      setProjects(projectsData);
    } catch (err) {
      console.error('Erro ao buscar projetos:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user, fetchProjects]);

  const getProjectStatus = (deadline: string): 'em_andamento' | 'entregue' | 'aprovado' | 'atrasado' => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    
    if (today > deadlineDate) {
      return 'atrasado';
    }
    return 'em_andamento';
  };

  const generateDeliverables = (contentType: string, deadline: string, applicationId?: string): Deliverable[] => {
    const baseDeliverables = [
      {
        id: `std_1_${applicationId || Date.now()}`,
        project_id: '',
        application_id: applicationId,
        title: 'Briefing e Conceito',
        description: 'Apresentar o conceito criativo e briefing do conteúdo',
        due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 1,
        status: 'pendente' as const,
        files: []
      }
    ];

    if (contentType.toLowerCase().includes('reel') || contentType.toLowerCase().includes('video')) {
      baseDeliverables.push({
        id: `std_2_${applicationId || Date.now()}`,
        project_id: '',
        application_id: applicationId,
        title: 'Roteiro e Storyboard',
        description: 'Roteiro detalhado e storyboard do vídeo',
        due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 2,
        status: 'pendente' as const,
        files: []
      });
    }

    baseDeliverables.push({
      id: `std_3_${applicationId || Date.now()}`,
      project_id: '',
      application_id: applicationId,
      title: 'Conteúdo Final',
      description: `Entrega do ${contentType} finalizado`,
      due_date: deadline,
      priority: 3,
      status: 'pendente' as const,
      files: []
    });

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

    // Simular upload de arquivos
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
    alert('Arquivos enviados com sucesso!');
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

  const openConversation = (conversationId: string) => {
    if (conversationId) {
      onOpenConversation(conversationId);
    } else {
      alert('Conversa não encontrada para este projeto');
    }
  };

  const filteredProjects = projects.filter(project => {
    // Filtro por status
    if (statusFilter !== 'todos' && project.status !== statusFilter) {
      return false;
    }
    
    // Ocultar projetos finalizados
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

  if (selectedProject) {
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
              <h1 className="text-2xl font-semibold text-gray-900">{selectedProject.title}</h1>
              <p className="text-gray-600">{selectedProject.company}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(selectedProject.status)}
            <button
              onClick={() => openConversation(selectedProject.conversation_id)}
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

        {/* Entregas */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Cronograma de Entregas</h3>
          
          {/* Deliverables Padrão */}
          <div className="mb-8">
            <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Entregas Padrão do Projeto
            </h4>
            <div className="space-y-4">
              {selectedProject.deliverables.map((deliverable) => (
                <div key={deliverable.id} className="border border-gray-200 rounded-lg p-4 bg-blue-50/30">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h5 className="font-medium text-gray-900">{deliverable.title}</h5>
                      <p className="text-sm text-gray-600">{deliverable.description}</p>
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

                  {/* Botão de Upload */}
                  {(deliverable.status === 'pendente' || deliverable.status === 'pending') && (
                    <button
                      onClick={() => setShowUploadModal(deliverable.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Enviar Arquivos
                    </button>
                  )}

                  {/* Feedback */}
                  {deliverable.feedback && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-sm font-medium text-yellow-800">Feedback do Analista:</p>
                      <p className="text-sm text-yellow-700">{deliverable.feedback}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Deliverables Customizados */}
          {selectedProject.customDeliverables && selectedProject.customDeliverables.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-purple-600" />
                Entregas Específicas do Analista
              </h4>
              <div className="space-y-4">
                {selectedProject.customDeliverables.map((deliverable) => (
                  <div key={deliverable.id} className="border border-purple-200 rounded-lg p-4 bg-purple-50/30">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h5 className="font-medium text-gray-900">{deliverable.title}</h5>
                        <p className="text-sm text-gray-600">{deliverable.description}</p>
                        {deliverable.priority && (
                          <span className="inline-block mt-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                            Prioridade: {deliverable.priority}
                          </span>
                        )}
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

                    {/* Botão de Upload */}
                    {(deliverable.status === 'pending') && (
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
                ))}
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Projetos</h1>
        <p className="text-gray-600 mt-1">{filteredProjects.length} de {projects.length} projetos</p>
      </div>

      {/* Filters and View Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
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

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="todos">Todos os status</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="entregue">Entregue</option>
            <option value="aprovado">Aprovado</option>
            <option value="atrasado">Atrasado</option>
          </select>
        </div>

        {/* Hide Completed Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHideCompleted(!hideCompleted)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              hideCompleted
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <EyeOff className="h-4 w-4" />
            Ocultar Finalizados
          </button>
        </div>
      </div>

      {/* Lista de Projetos */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'space-y-4'}>
        {filteredProjects.map((project) => (
          <div
            key={project.id}
            className={`bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-200 cursor-pointer ${
              viewMode === 'list' ? 'p-4' : 'p-6'
            }`}
            onClick={() => setSelectedProject(project)}
          >
            {viewMode === 'list' ? (
              /* List View */
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Folder className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{project.title}</h3>
                      {getStatusBadge(project.status)}
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{project.company}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Prazo: {formatDate(project.deadline)}
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {project.content_type}
                      </div>
                      <span className="text-sm text-gray-600">{project.budget}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 ml-4">
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">Progresso</div>
                    <div className="text-sm font-medium text-gray-900">
                      {(() => {
                        const standardCompleted = project.deliverables.filter(d => d.status === 'submitted' || d.status === 'approved').length;
                        const customCompleted = (project.customDeliverables || []).filter(d => d.status === 'submitted' || d.status === 'approved').length;
                        const totalDeliverables = project.deliverables.length + (project.customDeliverables?.length || 0);
                        return `${standardCompleted + customCompleted}/${totalDeliverables}`;
                      })()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openConversation(project.conversation_id);
                    }}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors text-sm"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Conversar
                  </button>
                </div>
              </div>
            ) : (
              /* Grid View (existing layout) */
              <>
                {/* Header do Card */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Folder className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{project.title}</h3>
                      <p className="text-gray-600 text-sm">{project.company}</p>
                    </div>
                  </div>
                  {getStatusBadge(project.status)}
                </div>

                {/* Informações */}
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

                {/* Progresso */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Progresso</span>
                    <span className="text-gray-900 font-medium">
                      {(() => {
                        const standardCompleted = project.deliverables.filter(d => d.status === 'submitted' || d.status === 'approved').length;
                        const customCompleted = (project.customDeliverables || []).filter(d => d.status === 'submitted' || d.status === 'approved').length;
                        const totalDeliverables = project.deliverables.length + (project.customDeliverables?.length || 0);
                        return `${standardCompleted + customCompleted}/${totalDeliverables}`;
                      })()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(() => {
                          const standardCompleted = project.deliverables.filter(d => d.status === 'submitted' || d.status === 'approved').length;
                          const customCompleted = (project.customDeliverables || []).filter(d => d.status === 'submitted' || d.status === 'approved').length;
                          const totalDeliverables = project.deliverables.length + (project.customDeliverables?.length || 0);
                          return totalDeliverables > 0 ? ((standardCompleted + customCompleted) / totalDeliverables) * 100 : 0;
                        })()}%`
                      }}
                    ></div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-sm text-gray-600">{project.budget}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openConversation(project.conversation_id);
                    }}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors text-sm"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Conversar
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 && projects.length > 0 && (
        <div className="text-center py-12">
          <Filter className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">Nenhum projeto encontrado</h3>
          <p className="text-gray-600">
            Tente ajustar os filtros para ver mais projetos
          </p>
        </div>
      )}

      {projects.length === 0 && (
        <div className="text-center py-12">
          <Folder className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">Nenhum projeto ainda</h3>
          <p className="text-gray-600">
            Seus projetos aparecerão aqui quando suas candidaturas forem aprovadas
          </p>
        </div>
      )}
    </div>
  );
};

export default Projects;