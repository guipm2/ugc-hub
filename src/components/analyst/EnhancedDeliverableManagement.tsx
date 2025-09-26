import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Edit3, Trash2, Clock, CheckCircle, AlertCircle, FileText, 
  Calendar, User, Building2, Tag, Link2, Copy, ChevronDown, ChevronRight,
  Search, MoreHorizontal, ArrowUp, ArrowDown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAnalystAuth } from '../../contexts/AnalystAuthContext';

interface ProjectDeliverable {
  id: string;
  application_id: string;
  opportunity_id: string;
  creator_id: string;
  analyst_id: string;
  title: string;
  description: string;
  due_date: string;
  priority: number;
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
  analyst_feedback?: string;
  reviewed_at?: string;
  creator_name?: string;
  opportunity_title?: string;
  company?: string;
  depends_on?: string; // ID of deliverable this one depends on
  template_id?: string; // If created from template
  estimated_hours?: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

interface DeliverableTemplate {
  id: string;
  name: string;
  description: string;
  content_types: string[]; // ['video', 'post', 'story', etc.]
  deliverables: {
    title: string;
    description: string;
    days_from_start: number;
    priority: number;
    estimated_hours?: number;
    depends_on_index?: number; // Index of deliverable in array this depends on
  }[];
  created_at: string;
}

interface Application {
  id: string;
  opportunity_id: string;
  creator_id: string;
  opportunity: {
    id: string;
    title: string;
    company: string;
    content_type: string;
    created_by: string;
  };
  creator: {
    name: string;
  };
}

// Templates padrão por tipo de conteúdo
const DEFAULT_TEMPLATES: Omit<DeliverableTemplate, 'id' | 'created_at'>[] = [
  {
    name: 'Template Genérico',
    description: 'Template básico que funciona para qualquer tipo de projeto',
    content_types: ['generic', 'universal', 'all'],
    deliverables: [
      {
        title: 'Briefing e Alinhamento',
        description: 'Definir objetivos, público-alvo e diretrizes do projeto',
        days_from_start: 1,
        priority: 1,
        estimated_hours: 2
      },
      {
        title: 'Primeira Proposta',
        description: 'Apresentar a primeira versão do trabalho para aprovação',
        days_from_start: 3,
        priority: 2,
        estimated_hours: 4,
        depends_on_index: 0
      },
      {
        title: 'Ajustes e Revisão',
        description: 'Implementar feedback e fazer ajustes necessários',
        days_from_start: 5,
        priority: 3,
        estimated_hours: 3,
        depends_on_index: 1
      },
      {
        title: 'Entrega Final',
        description: 'Versão final aprovada e pronta para publicação',
        days_from_start: 7,
        priority: 4,
        estimated_hours: 1,
        depends_on_index: 2
      }
    ]
  },
  {
    name: 'Post/Carousel Instagram',
    description: 'Template padrão para posts e carousels do Instagram',
    content_types: ['post', 'carousel', 'instagram'],
    deliverables: [
      {
        title: 'Briefing e Conceito',
        description: 'Apresentar conceito criativo, mood board e proposta de copy',
        days_from_start: 1,
        priority: 1,
        estimated_hours: 3
      },
      {
        title: 'Primeira versão do design',
        description: 'Layout inicial com elementos visuais principais',
        days_from_start: 3,
        priority: 2,
        estimated_hours: 4,
        depends_on_index: 0
      },
      {
        title: 'Versão final aprovada',
        description: 'Post/carousel finalizado com copy definitiva',
        days_from_start: 5,
        priority: 3,
        estimated_hours: 2,
        depends_on_index: 1
      }
    ]
  },
  {
    name: 'Vídeo/Reel',
    description: 'Template para conteúdos em vídeo e reels',
    content_types: ['video', 'reel', 'youtube'],
    deliverables: [
      {
        title: 'Roteiro e Conceito',
        description: 'Roteiro detalhado, storyboard e conceito criativo',
        days_from_start: 2,
        priority: 1,
        estimated_hours: 4
      },
      {
        title: 'Pré-produção',
        description: 'Locações, figurino, equipamentos e cronograma de gravação',
        days_from_start: 4,
        priority: 2,
        estimated_hours: 3,
        depends_on_index: 0
      },
      {
        title: 'Material bruto',
        description: 'Arquivos de vídeo gravados para aprovação',
        days_from_start: 7,
        priority: 3,
        estimated_hours: 6,
        depends_on_index: 1
      },
      {
        title: 'Primeira edição',
        description: 'Vídeo editado com cortes, transições e música',
        days_from_start: 10,
        priority: 4,
        estimated_hours: 5,
        depends_on_index: 2
      },
      {
        title: 'Vídeo final',
        description: 'Versão finalizada com ajustes e aprovações',
        days_from_start: 12,
        priority: 5,
        estimated_hours: 2,
        depends_on_index: 3
      }
    ]
  },
  {
    name: 'Campanha Completa',
    description: 'Template para campanhas multi-formato',
    content_types: ['campaign', 'multi'],
    deliverables: [
      {
        title: 'Estratégia e Planejamento',
        description: 'Estratégia geral, cronograma e briefings por formato',
        days_from_start: 2,
        priority: 1,
        estimated_hours: 6
      },
      {
        title: 'Identidade Visual da Campanha',
        description: 'Paleta de cores, tipografia e elementos visuais principais',
        days_from_start: 4,
        priority: 2,
        estimated_hours: 8,
        depends_on_index: 0
      },
      {
        title: 'Conteúdo Principal (Vídeo/Post)',
        description: 'Peça principal da campanha',
        days_from_start: 8,
        priority: 3,
        estimated_hours: 12,
        depends_on_index: 1
      },
      {
        title: 'Materiais Complementares',
        description: 'Stories, posts secundários, adaptações',
        days_from_start: 10,
        priority: 4,
        estimated_hours: 8,
        depends_on_index: 2
      },
      {
        title: 'Entrega Final',
        description: 'Todos os materiais organizados e prontos para veiculação',
        days_from_start: 12,
        priority: 5,
        estimated_hours: 3,
        depends_on_index: 3
      }
    ]
  }
];

const EnhancedDeliverableManagement: React.FC = () => {
  // Estados principais
  const [deliverables, setDeliverables] = useState<ProjectDeliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  
  // Estados de UI
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [selectedDeliverables, setSelectedDeliverables] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Estados de filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'overdue' | 'completed' | 'in_progress'>('all');
  const [creatorFilter, setCreatorFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  
  // Estados de formulário
  const [selectedApplication, setSelectedApplication] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customForm, setCustomForm] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 1,
    estimated_hours: 0,
    tags: '' as string
  });

  const { user } = useAnalystAuth();

  // Fetch deliverables with enhanced data
  const fetchDeliverables = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('project_deliverables')
        .select(`
          *,
          creator:profiles!creator_id(name, email),
          opportunity:opportunities(title, company, content_type),
          depends_on_deliverable:project_deliverables!depends_on(title)
        `)
        .eq('analyst_id', user.id)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar deliverables:', error);
        return;
      }

      const mappedDeliverables = data.map(item => ({
        ...item,
        creator_name: item.creator?.name || 'Desconhecido',
        opportunity_title: item.opportunity?.title || 'Sem título',
        company: item.opportunity?.company || 'Sem empresa',
        tags: item.tags || [],
        estimated_hours: item.estimated_hours || 0
      }));

      setDeliverables(mappedDeliverables);
    } catch (error) {
      console.error('Erro ao buscar deliverables:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch approved applications
  const fetchApprovedApplications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('opportunity_applications')
        .select(`
          *,
          opportunity:opportunities!inner(id, title, company, content_type, created_by),
          creator:profiles!creator_id(name)
        `)
        .eq('status', 'approved')
        .eq('opportunity.created_by', user.id);

      if (error) {
        console.error('Erro ao buscar applications:', error);
        return;
      }

      setApplications(data || []);
    } catch (error) {
      console.error('Erro ao buscar applications:', error);
    }
  }, [user]);

  // Create deliverable from template
  const createDeliverablesFromTemplate = async (applicationId: string, templateName: string) => {
    console.log('🚀 Iniciando criação de deliverables do template:', { applicationId, templateName });
    
    const template = DEFAULT_TEMPLATES.find(t => t.name === templateName);
    if (!template) {
      console.error('❌ Template não encontrado:', templateName);
      alert('Template não encontrado');
      return;
    }

    const application = applications.find(app => app.id === applicationId);
    if (!application) {
      console.error('❌ Application não encontrada:', applicationId);
      alert('Projeto não encontrado');
      return;
    }

    if (!user?.id) {
      console.error('❌ Usuário não identificado');
      alert('Erro de autenticação');
      return;
    }

    try {
      const baseDate = new Date();
      const createdDeliverables: ProjectDeliverable[] = [];

      console.log('📋 Template encontrado:', template);
      console.log('🏢 Application encontrada:', application);

      // Create deliverables in order to handle dependencies
      for (let i = 0; i < template.deliverables.length; i++) {
        const templateDeliverable = template.deliverables[i];
        const dueDate = new Date(baseDate);
        dueDate.setDate(baseDate.getDate() + templateDeliverable.days_from_start);

        let dependsOn = null;
        if (templateDeliverable.depends_on_index !== undefined && templateDeliverable.depends_on_index < createdDeliverables.length) {
          dependsOn = createdDeliverables[templateDeliverable.depends_on_index]?.id;
        }

        console.log(`📝 Criando deliverable ${i + 1}/${template.deliverables.length}:`, {
          title: templateDeliverable.title,
          due_date: dueDate.toISOString().split('T')[0],
          depends_on: dependsOn
        });

        const { data, error } = await supabase
          .from('project_deliverables')
          .insert({
            application_id: applicationId,
            opportunity_id: application.opportunity_id,
            creator_id: application.creator_id,
            analyst_id: user.id,
            title: templateDeliverable.title,
            description: templateDeliverable.description,
            due_date: dueDate.toISOString().split('T')[0],
            priority: templateDeliverable.priority,
            estimated_hours: templateDeliverable.estimated_hours || 0,
            depends_on: dependsOn,
            template_id: template.name,
            tags: [template.name.toLowerCase().replace(/\s+/g, '-')],
            status: 'pending'
          })
          .select()
          .single();

        if (error) {
          console.error(`❌ Erro ao criar deliverable ${i + 1}:`, error);
          throw error;
        }

        console.log(`✅ Deliverable ${i + 1} criado com sucesso:`, data);
        createdDeliverables.push(data);
      }

      console.log('🎉 Todos os deliverables criados com sucesso!');
      
      await fetchDeliverables();
      setShowTemplateModal(false);
      
      // Reset form
      setSelectedApplication('');
      setSelectedTemplate('');
      
      alert(`✅ ${createdDeliverables.length} deliverables criados com sucesso!`);
    } catch (error) {
      console.error('❌ Erro ao criar deliverables do template:', error);
      alert('❌ Erro ao criar deliverables do template: ' + (error as Error).message);
    }
  };

  // Create custom deliverable
  const createCustomDeliverable = async () => {
    console.log('🚀 Iniciando criação de deliverable customizado:', { selectedApplication, customForm });
    
    if (!selectedApplication || !customForm.title || !customForm.due_date) {
      alert('❌ Por favor, preencha todos os campos obrigatórios');
      return;
    }

    const application = applications.find(app => app.id === selectedApplication);
    if (!application) {
      console.error('❌ Application não encontrada:', selectedApplication);
      alert('Projeto não encontrado');
      return;
    }

    if (!user?.id) {
      console.error('❌ Usuário não identificado');
      alert('Erro de autenticação');
      return;
    }

    try {
      const tags = customForm.tags ? customForm.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
      
      console.log('📝 Criando deliverable customizado:', {
        application_id: selectedApplication,
        opportunity_id: application.opportunity_id,
        creator_id: application.creator_id,
        analyst_id: user.id,
        ...customForm,
        tags
      });

      const { data, error } = await supabase
        .from('project_deliverables')
        .insert({
          application_id: selectedApplication,
          opportunity_id: application.opportunity_id,
          creator_id: application.creator_id,
          analyst_id: user.id,
          title: customForm.title,
          description: customForm.description,
          due_date: customForm.due_date,
          priority: customForm.priority,
          estimated_hours: customForm.estimated_hours || 0,
          tags,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar deliverable:', error);
        throw error;
      }

      console.log('✅ Deliverable customizado criado com sucesso:', data);
      
      await fetchDeliverables();
      setShowCustomModal(false);
      
      // Reset form
      setSelectedApplication('');
      setCustomForm({
        title: '',
        description: '',
        due_date: '',
        priority: 1,
        estimated_hours: 0,
        tags: ''
      });
      
      alert('✅ Deliverable criado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao criar deliverable customizado:', error);
      alert('❌ Erro ao criar deliverable: ' + (error as Error).message);
    }
  };

  // Bulk actions
  const handleBulkStatusUpdate = async (status: ProjectDeliverable['status']) => {
    if (selectedDeliverables.size === 0) return;

    try {
      const { error } = await supabase
        .from('project_deliverables')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
          ...(status === 'approved' || status === 'rejected' ? { reviewed_at: new Date().toISOString() } : {})
        })
        .in('id', Array.from(selectedDeliverables));

      if (error) throw error;

      await fetchDeliverables();
      setSelectedDeliverables(new Set());
    } catch (error) {
      console.error('Erro na ação em massa:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDeliverables.size === 0) return;
    if (!confirm(`Tem certeza que deseja deletar ${selectedDeliverables.size} deliverable(s)?`)) return;

    try {
      const { error } = await supabase
        .from('project_deliverables')
        .delete()
        .in('id', Array.from(selectedDeliverables));

      if (error) throw error;

      await fetchDeliverables();
      setSelectedDeliverables(new Set());
    } catch (error) {
      console.error('Erro ao deletar deliverables:', error);
    }
  };

  // Inline editing
  const handleInlineEdit = async (id: string, field: string, value: string | number) => {
    try {
      const { error } = await supabase
        .from('project_deliverables')
        .update({ 
          [field]: value,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      await fetchDeliverables();
    } catch (error) {
      console.error('Erro ao atualizar deliverable:', error);
    }
  };

  // Priority management
  const handlePriorityChange = async (id: string, direction: 'up' | 'down') => {
    const deliverable = deliverables.find(d => d.id === id);
    if (!deliverable) return;

    const newPriority = direction === 'up' 
      ? Math.max(1, deliverable.priority - 1)
      : Math.min(5, deliverable.priority + 1);

    await handleInlineEdit(id, 'priority', newPriority);
  };

  // Filtered deliverables
  const filteredDeliverables = deliverables.filter(deliverable => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (
        !deliverable.title.toLowerCase().includes(searchLower) &&
        !deliverable.creator_name?.toLowerCase().includes(searchLower) &&
        !deliverable.opportunity_title?.toLowerCase().includes(searchLower) &&
        !deliverable.company?.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        const isOverdue = new Date(deliverable.due_date) < new Date() && deliverable.status !== 'approved';
        if (!isOverdue) return false;
      } else if (statusFilter === 'completed') {
        if (deliverable.status !== 'approved') return false;
      } else {
        if (deliverable.status !== statusFilter) return false;
      }
    }

    // Creator filter
    if (creatorFilter !== 'all' && deliverable.creator_id !== creatorFilter) {
      return false;
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      if (priorityFilter === 'high' && deliverable.priority > 2) return false;
      if (priorityFilter === 'medium' && (deliverable.priority < 2 || deliverable.priority > 3)) return false;
      if (priorityFilter === 'low' && deliverable.priority < 4) return false;
    }

    return true;
  });

  // Get unique creators for filter
  const uniqueCreators = Array.from(new Set(deliverables.map(d => ({ id: d.creator_id, name: d.creator_name }))))
    .filter(creator => creator.name && creator.id);

  // Status styling
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'submitted': return 'bg-purple-100 text-purple-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityStyle = (priority: number) => {
    if (priority <= 2) return 'text-red-600 bg-red-50';
    if (priority <= 3) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const isOverdue = (dueDate: string, status: string) => {
    return new Date(dueDate) < new Date() && status !== 'approved';
  };

  useEffect(() => {
    fetchDeliverables();
    fetchApprovedApplications();
  }, [fetchDeliverables, fetchApprovedApplications]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Deliverables</h1>
            <p className="text-gray-600">Organize e acompanhe entregas de projetos</p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setShowTemplateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Copy className="h-4 w-4" />
              <span>Usar Template</span>
            </button>
            
            <button
              onClick={() => setShowCustomModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Deliverable</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{deliverables.length}</p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {deliverables.filter(d => d.status === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Atrasados</p>
                <p className="text-2xl font-bold text-red-600">
                  {deliverables.filter(d => isOverdue(d.due_date, d.status)).length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Aprovados</p>
                <p className="text-2xl font-bold text-green-600">
                  {deliverables.filter(d => d.status === 'approved').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar deliverables..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">Todos os Status</option>
              <option value="pending">Pendente</option>
              <option value="in_progress">Em Andamento</option>
              <option value="submitted">Enviado</option>
              <option value="approved">Aprovado</option>
              <option value="rejected">Rejeitado</option>
              <option value="overdue">Atrasados</option>
              <option value="completed">Concluídos</option>
            </select>

            {/* Creator Filter */}
            <select
              value={creatorFilter}
              onChange={(e) => setCreatorFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">Todos os Creators</option>
              {uniqueCreators.map((creator) => (
                <option key={creator.id} value={creator.id}>
                  {creator.name}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">Todas as Prioridades</option>
              <option value="high">Alta (1-2)</option>
              <option value="medium">Média (3)</option>
              <option value="low">Baixa (4-5)</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedDeliverables.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-blue-800">
                  {selectedDeliverables.size} deliverable(s) selecionado(s)
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleBulkStatusUpdate('approved')}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Aprovar
                </button>
                <button
                  onClick={() => handleBulkStatusUpdate('rejected')}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  Rejeitar
                </button>
                <button
                  onClick={() => handleBulkStatusUpdate('pending')}
                  className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                >
                  Pendente
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                >
                  Deletar
                </button>
                <button
                  onClick={() => setSelectedDeliverables(new Set())}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Deliverables Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedDeliverables.size === filteredDeliverables.length && filteredDeliverables.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDeliverables(new Set(filteredDeliverables.map(d => d.id)));
                        } else {
                          setSelectedDeliverables(new Set());
                        }
                      }}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deliverable
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Creator/Projeto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data/Prazo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prioridade
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDeliverables.map((deliverable) => (
                  <React.Fragment key={deliverable.id}>
                    <tr className={`hover:bg-gray-50 ${isOverdue(deliverable.due_date, deliverable.status) ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedDeliverables.has(deliverable.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedDeliverables);
                            if (e.target.checked) {
                              newSelected.add(deliverable.id);
                            } else {
                              newSelected.delete(deliverable.id);
                            }
                            setSelectedDeliverables(newSelected);
                          }}
                          className="rounded"
                        />
                      </td>
                      
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedRows);
                              if (expandedRows.has(deliverable.id)) {
                                newExpanded.delete(deliverable.id);
                              } else {
                                newExpanded.add(deliverable.id);
                              }
                              setExpandedRows(newExpanded);
                            }}
                            className="mr-2 p-1 hover:bg-gray-200 rounded"
                          >
                            {expandedRows.has(deliverable.id) ? 
                              <ChevronDown className="h-4 w-4" /> : 
                              <ChevronRight className="h-4 w-4" />
                            }
                          </button>
                          
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {deliverable.title}
                            </div>
                            <div className="text-sm text-gray-500 line-clamp-2">
                              {deliverable.description}
                            </div>
                            {deliverable.tags && deliverable.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {deliverable.tags.map((tag, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                                  >
                                    <Tag className="h-3 w-3 mr-1" />
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-4 py-4">
                        <div className="text-sm">
                          <div className="flex items-center text-gray-900 font-medium">
                            <User className="h-4 w-4 mr-1" />
                            {deliverable.creator_name}
                          </div>
                          <div className="flex items-center text-gray-500 mt-1">
                            <Building2 className="h-4 w-4 mr-1" />
                            {deliverable.company}
                          </div>
                          <div className="text-gray-600 text-xs mt-1">
                            {deliverable.opportunity_title}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-4 py-4">
                        <div className="text-sm">
                          <div className={`flex items-center ${isOverdue(deliverable.due_date, deliverable.status) ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(deliverable.due_date).toLocaleDateString('pt-BR')}
                          </div>
                          {(deliverable.estimated_hours || 0) > 0 && (
                            <div className="text-gray-500 text-xs mt-1">
                              <Clock className="h-3 w-3 mr-1 inline" />
                              {deliverable.estimated_hours || 0}h estimadas
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-4 py-4">
                        <select
                          value={deliverable.status}
                          onChange={(e) => handleInlineEdit(deliverable.id, 'status', e.target.value)}
                          className={`text-xs px-2 py-1 rounded-full border-0 ${getStatusStyle(deliverable.status)}`}
                        >
                          <option value="pending">Pendente</option>
                          <option value="in_progress">Em Andamento</option>
                          <option value="submitted">Enviado</option>
                          <option value="approved">Aprovado</option>
                          <option value="rejected">Rejeitado</option>
                        </select>
                      </td>
                      
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handlePriorityChange(deliverable.id, 'up')}
                            className="p-1 hover:bg-gray-200 rounded"
                            disabled={deliverable.priority <= 1}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityStyle(deliverable.priority)}`}>
                            {deliverable.priority}
                          </span>
                          
                          <button
                            onClick={() => handlePriorityChange(deliverable.id, 'down')}
                            className="p-1 hover:bg-gray-200 rounded"
                            disabled={deliverable.priority >= 5}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              // TODO: Implement edit modal
                              alert('Funcionalidade de edição em desenvolvimento');
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={async () => {
                              if (confirm('Tem certeza que deseja deletar este deliverable?')) {
                                const { error } = await supabase
                                  .from('project_deliverables')
                                  .delete()
                                  .eq('id', deliverable.id);
                                
                                if (!error) {
                                  await fetchDeliverables();
                                }
                              }
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          
                          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Row */}
                    {expandedRows.has(deliverable.id) && (
                      <tr>
                        <td></td>
                        <td colSpan={6} className="px-4 py-4 bg-gray-50">
                          <div className="space-y-3">
                            {/* Dependencies */}
                            {deliverable.depends_on && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Link2 className="h-4 w-4 mr-2" />
                                <span>Depende de: </span>
                                <span className="font-medium">
                                  {deliverables.find(d => d.id === deliverable.depends_on)?.title || 'Deliverable não encontrado'}
                                </span>
                              </div>
                            )}
                            
                            {/* Feedback */}
                            {deliverable.analyst_feedback && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Feedback do Analista:
                                </label>
                                <p className="text-sm text-gray-600 bg-white p-3 rounded border">
                                  {deliverable.analyst_feedback}
                                </p>
                              </div>
                            )}
                            
                            {/* Quick feedback input */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Adicionar/Atualizar Feedback:
                              </label>
                              <div className="flex space-x-2">
                                <textarea
                                  placeholder="Escreva seu feedback..."
                                  className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
                                  rows={2}
                                  defaultValue={deliverable.analyst_feedback || ''}
                                  onBlur={(e) => {
                                    if (e.target.value !== deliverable.analyst_feedback) {
                                      handleInlineEdit(deliverable.id, 'analyst_feedback', e.target.value);
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredDeliverables.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum deliverable encontrado</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' || creatorFilter !== 'all' || priorityFilter !== 'all'
                  ? 'Tente ajustar os filtros para encontrar deliverables.'
                  : 'Comece criando um novo deliverable ou usando um template.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Criar Deliverables com Template</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecionar Projeto Aprovado
                </label>
                <select
                  value={selectedApplication}
                  onChange={(e) => setSelectedApplication(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Selecione um projeto...</option>
                  {applications.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.creator.name} - {app.opportunity.title} ({app.opportunity.company})
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedApplication && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecionar Template
                  </label>
                  <div className="space-y-3">
                    {DEFAULT_TEMPLATES.map((template) => {
                      const selectedApp = applications.find(app => app.id === selectedApplication);
                      // Sempre permitir template genérico, ou verificar compatibilidade
                      const isCompatible = template.name === 'Template Genérico' || !selectedApp || 
                        template.content_types.some(type => 
                          selectedApp.opportunity.content_type.toLowerCase().includes(type)
                        ) ||
                        template.content_types.includes('multi') || 
                        template.content_types.includes('campaign');
                      
                      return (
                        <div
                          key={template.name}
                          className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                            selectedTemplate === template.name
                              ? 'border-purple-500 bg-purple-50'
                              : isCompatible
                              ? 'border-gray-300 hover:border-purple-300'
                              : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                          }`}
                          onClick={() => isCompatible && setSelectedTemplate(template.name)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{template.name}</h4>
                              <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {template.content_types.map((type) => (
                                  <span
                                    key={type}
                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                  >
                                    {type}
                                  </span>
                                ))}
                              </div>
                              
                              {/* Preview deliverables */}
                              <div className="mt-3">
                                <p className="text-xs text-gray-500 mb-2">
                                  {template.deliverables.length} deliverable(s):
                                </p>
                                <div className="space-y-1">
                                  {template.deliverables.map((deliverable, index) => (
                                    <div key={index} className="text-xs text-gray-600 flex items-center">
                                      <span className="w-4 h-4 bg-purple-100 text-purple-600 rounded-full text-center text-xs font-medium mr-2">
                                        {deliverable.priority}
                                      </span>
                                      <span>{deliverable.title}</span>
                                      <span className="ml-auto text-gray-400">
                                        +{deliverable.days_from_start}d
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            <input
                              type="radio"
                              name="template"
                              checked={selectedTemplate === template.name}
                              onChange={() => setSelectedTemplate(template.name)}
                              className="mt-1 ml-3"
                              disabled={!isCompatible}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setSelectedApplication('');
                  setSelectedTemplate('');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => createDeliverablesFromTemplate(selectedApplication, selectedTemplate)}
                disabled={!selectedApplication || !selectedTemplate}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Criar Deliverables
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Deliverable Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Criar Deliverable Personalizado</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecionar Projeto Aprovado *
                </label>
                <select
                  value={selectedApplication}
                  onChange={(e) => setSelectedApplication(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Selecione um projeto...</option>
                  {applications.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.creator.name} - {app.opportunity.title} ({app.opportunity.company})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título do Deliverable *
                </label>
                <input
                  type="text"
                  value={customForm.title}
                  onChange={(e) => setCustomForm({...customForm, title: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Ex: Briefing e Conceito Creative"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  value={customForm.description}
                  onChange={(e) => setCustomForm({...customForm, description: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Descreva o que deve ser entregue..."
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Entrega *
                  </label>
                  <input
                    type="date"
                    value={customForm.due_date}
                    onChange={(e) => setCustomForm({...customForm, due_date: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prioridade
                  </label>
                  <select
                    value={customForm.priority}
                    onChange={(e) => setCustomForm({...customForm, priority: parseInt(e.target.value)})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value={1}>1 - Mais Alta</option>
                    <option value={2}>2 - Alta</option>
                    <option value={3}>3 - Média</option>
                    <option value={4}>4 - Baixa</option>
                    <option value={5}>5 - Mais Baixa</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horas Estimadas
                  </label>
                  <input
                    type="number"
                    value={customForm.estimated_hours}
                    onChange={(e) => setCustomForm({...customForm, estimated_hours: parseInt(e.target.value) || 0})}
                    min="0"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={customForm.tags}
                    onChange={(e) => setCustomForm({...customForm, tags: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="design, conceito, briefing"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCustomModal(false);
                  setSelectedApplication('');
                  setCustomForm({
                    title: '',
                    description: '',
                    due_date: '',
                    priority: 1,
                    estimated_hours: 0,
                    tags: ''
                  });
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={createCustomDeliverable}
                disabled={!selectedApplication || !customForm.title || !customForm.due_date}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Criar Deliverable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedDeliverableManagement;