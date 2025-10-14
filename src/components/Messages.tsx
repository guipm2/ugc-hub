import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Search, MoreVertical, Send, ArrowLeft, ArrowRight, ExternalLink, AlertTriangle, Trash2, PencilLine, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import ModalPortal from './common/ModalPortal';

interface ProjectChat {
  project_id: string;
  opportunity_id: string;
  opportunity: {
    title: string;
    company: string;
    status: string; // To check if project was deleted
    analyst_id: string; // Added analyst_id
    created_by: string; // Added created_by
  } | null;
  analyst: {
    name: string;
    company: string;
  } | null;
  conversation_id: string | null; // Conversation ID if exists
  last_message_at: string | null;
  lastMessage?: {
    content: string;
    sender_type: string;
    created_at: string;
  };
  unread_count: number;
  custom_title?: string | null;
  tags?: string[] | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'analyst' | 'creator';
  content: string;
  read: boolean;
  created_at: string;
}

interface MessagesProps {
  selectedProjectId?: string | null; // Changed from selectedConversationId
  onBackToList?: () => void;
}

const Messages: React.FC<MessagesProps> = ({ selectedProjectId, onBackToList }) => {
  const [projectChats, setProjectChats] = useState<ProjectChat[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectChat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingChatDetails, setIsEditingChatDetails] = useState(false);
  const [chatTitleInput, setChatTitleInput] = useState('');
  const [chatTagsInput, setChatTagsInput] = useState('');
  const [savingChatDetails, setSavingChatDetails] = useState(false);
  const [chatDetailsStatus, setChatDetailsStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { user } = useAuth();
  const { navigate } = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchProjectChats = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    try {
      // Step 1: Get all conversations for this creator (replicando padrão do analista)
      const { data: conversationData, error: convError } = await supabase
        .from('conversations')
        .select(`
          id,
          analyst_id,
          creator_id,
          opportunity_id,
          created_at,
          last_message_at,
          custom_title,
          tags
        `)
        .eq('creator_id', user.id)
        .order('last_message_at', { ascending: false });

      if (convError) {
        console.error('❌ [MESSAGES] Erro ao buscar conversas:', convError);
        setLoading(false);
        return;
      }

      
      // Step 2: Group conversations by analyst and collect conversation IDs
      const analystConversations = new Map();
      const allConversationsByAnalyst = new Map();
      
      for (const conv of conversationData || []) {
        if (!analystConversations.has(conv.analyst_id)) {
          analystConversations.set(conv.analyst_id, {
            id: conv.id, // Use the first conversation ID as the unified conversation ID
            analyst_id: conv.analyst_id,
            creator_id: conv.creator_id,
            created_at: conv.created_at,
            last_message_at: conv.last_message_at,
            projects: [],
            unread_count: 0,
            custom_title: conv.custom_title,
            tags: conv.tags
          });
          allConversationsByAnalyst.set(conv.analyst_id, []);
        } else {
          // Update last_message_at if this conversation is more recent
          const existing = analystConversations.get(conv.analyst_id);
          const existingDate = existing.last_message_at ? new Date(existing.last_message_at) : null;
          const currentDate = conv.last_message_at ? new Date(conv.last_message_at) : null;
          if (currentDate && (!existingDate || currentDate > existingDate)) {
            existing.id = conv.id;
            existing.last_message_at = conv.last_message_at;
            existing.custom_title = conv.custom_title;
            existing.tags = conv.tags;
          }
        }
        
        // Add conversation ID to the analyst's list
        allConversationsByAnalyst.get(conv.analyst_id).push(conv.id);
      }

      // Step 3: Get all projects (opportunity_applications) for each analyst
      const unifiedConversations = await Promise.all(
        Array.from(analystConversations.values()).map(async (conv) => {
          // Get analyst info
          const { data: analystData } = await supabase
            .from('analyst')
            .select('name, email')
            .eq('user_id', conv.analyst_id)
            .single();

          // Fallback to profiles if not found in analyst table
          let analystInfo = analystData;
          if (!analystData) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', conv.analyst_id)
              .single();
            analystInfo = profileData ? {
              name: profileData.full_name,
              email: profileData.email
            } : { name: 'Analista', email: '' };
          }

          // Get all approved projects between this creator and analyst
          const { data: applications } = await supabase
            .from('opportunity_applications')
            .select('id, opportunity_id, status, applied_at')
            .eq('creator_id', user.id)
            .eq('status', 'approved');

          // Get opportunity details for each application
          const projectPromises = (applications || []).map(async (app) => {
            const { data: opportunity } = await supabase
              .from('opportunities')
              .select('id, title, company, analyst_id')
              .eq('id', app.opportunity_id)
              .eq('analyst_id', conv.analyst_id)
              .maybeSingle();

            if (opportunity) {
              return {
                id: app.id,
                opportunity_id: app.opportunity_id,
                title: opportunity.title,
                company: opportunity.company,
                status: 'active' as const,
                analyst_id: opportunity.analyst_id,
                created_by: opportunity.analyst_id
              };
            }
            return null;
          });

          const projectResults = await Promise.all(projectPromises);
          const formattedProjects = projectResults.filter(Boolean);

          // Get conversation IDs for this analyst
          const conversationIds = allConversationsByAnalyst.get(conv.analyst_id) || [];

          // Get last message across all conversations with this analyst
          let lastMessage = null;
          if (conversationIds.length > 0) {
            const { data } = await supabase
              .from('messages')
              .select('content, sender_type, created_at')
              .in('conversation_id', conversationIds)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            lastMessage = data;
          }

          // Count unread messages
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact' })
            .in('conversation_id', conversationIds)
            .eq('read', false)
            .neq('sender_id', user.id);

          // Convert to the ProjectChat format
          return formattedProjects.map(project => {
            if (!project) return null;
            
            return {
              project_id: project.id,
              opportunity_id: project.opportunity_id,
              opportunity: {
                id: project.opportunity_id,
                title: project.title,
                company: project.company,
                status: 'active',
                analyst_id: project.analyst_id,
                created_by: project.created_by
              },
              analyst: analystInfo,
              conversation_id: conv.id,
              last_message_at: conv.last_message_at,
              lastMessage: lastMessage,
              unread_count: unreadCount || 0,
              custom_title: conv.custom_title || null,
              tags: conv.tags || []
            } as ProjectChat;
          }).filter(Boolean);
        })
      );

      // Flatten the array of arrays and filter out nulls
      const allChats = unifiedConversations.flat().filter((chat): chat is ProjectChat => chat !== null);
            setProjectChats(allChats);
    } catch (err) {
      console.error('❌ [MESSAGES] Erro ao buscar chats:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchMessages = useCallback(async (conversationId: string) => {
        try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ [MESSAGES] Erro ao buscar mensagens:', error);
      } else {
                setMessages(data || []);
        
        // Mark messages as read
        await supabase
          .from('messages')
          .update({ read: true })
          .eq('conversation_id', conversationId)
          .neq('sender_id', user?.id);
      }
    } catch (err) {
      console.error('❌ [MESSAGES] Erro ao buscar mensagens:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProjectChats();
    }
  }, [user, fetchProjectChats]);

  useAutoRefresh(fetchProjectChats, 20000, Boolean(user));

  const createConversationForProject = useCallback(async (projectId: string) => {
    try {
      // First, get project details
      const { data: projectData, error: projectError } = await supabase
        .from('opportunities')
        .select('id, title, analyst_id')
        .eq('id', projectId)
        .single();

      if (projectError || !projectData) {
        console.error('❌ [MESSAGES] Projeto não encontrado:', projectError);
        return;
      }

      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('*')
        .eq('opportunity_id', projectId)
        .eq('creator_id', user?.id)
        .maybeSingle();

      if (existingConv) {
        // Refresh the chats list to include this conversation
        fetchProjectChats();
        return;
      }

      // Create new conversation
      const { error: convError } = await supabase
        .from('conversations')
        .insert({
          opportunity_id: projectId,
          analyst_id: projectData.analyst_id,
          creator_id: user?.id
        })
        .select()
        .single();

      if (convError) {
        console.error('❌ [MESSAGES] Erro ao criar conversa:', convError);
        
        // If conversation already exists (unique constraint violation), just refresh
        if (convError.code === '23505') {
          fetchProjectChats();
          return;
        }
        return;
      }

            
      // Refresh the chats list
      fetchProjectChats();
      
    } catch (error) {
      console.error('❌ [MESSAGES] Erro geral ao criar conversa:', error);
    }
  }, [user, fetchProjectChats]);

  // Auto-select project chat if provided via URL
  useEffect(() => {
    if (selectedProjectId && projectChats.length > 0) {
      const projectChat = projectChats.find(
        chat => chat.project_id === selectedProjectId || chat.opportunity_id === selectedProjectId
      );

      if (projectChat) {
        setSelectedProject(projectChat);
      }
    } else if (selectedProjectId && projectChats.length === 0) {
      // If we have a projectId but no chats yet, try to create/find conversation for this project
      createConversationForProject(selectedProjectId);
    } else if (!selectedProjectId) {
      setSelectedProject(null);
    }
  }, [selectedProjectId, projectChats, createConversationForProject]);

  useEffect(() => {
            
    if (selectedProject && selectedProject.conversation_id) {
            fetchMessages(selectedProject.conversation_id);
      
      // Subscribe to new messages
            const channel = supabase
        .channel(`messages_${selectedProject.conversation_id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${selectedProject.conversation_id}`
          },
          (payload) => {
                        const newMessage = payload.new as Message;
            // Evitar duplicação - só adicionar se não for do usuário atual
            if (newMessage.sender_id !== user?.id) {
              setMessages(prev => {
                // Verificar se a mensagem já existe
                const exists = prev.find(m => m.id === newMessage.id);
                if (exists) return prev;
                return [...prev, newMessage];
              });
            }
          }
        )
        .subscribe();

      return () => {
                supabase.removeChannel(channel);
      };
    } else if (selectedProject && !selectedProject.conversation_id) {
            setMessages([]); // Limpar mensagens se não há conversa
    }
  }, [selectedProject, fetchMessages, user]);

        useAutoRefresh(
          () => {
            if (selectedProject?.conversation_id) {
              return fetchMessages(selectedProject.conversation_id);
            }
            return undefined;
          },
          12000,
          Boolean(selectedProject?.conversation_id)
        );

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedProject) {
      setChatTitleInput(selectedProject.custom_title || '');
      setChatTagsInput((selectedProject.tags || []).join(', '));
      setChatDetailsStatus(null);
      setIsEditingChatDetails(false);
    } else {
      setChatTitleInput('');
      setChatTagsInput('');
      setIsEditingChatDetails(false);
      setChatDetailsStatus(null);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (!chatDetailsStatus) return;

    const timeout = window.setTimeout(() => setChatDetailsStatus(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [chatDetailsStatus]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedProject || !user) return;
    
        setSendingMessage(true);

    try {
      let conversationId = selectedProject.conversation_id;
      
      // If no conversation exists, create one
      if (!conversationId) {
        const analystId = selectedProject.opportunity?.analyst_id || selectedProject.opportunity?.created_by;
        
        const { data: newConversation, error: conversationError } = await supabase
          .from('conversations')
          .insert({
            opportunity_id: selectedProject.opportunity_id,
            analyst_id: analystId,
            creator_id: user.id
          })
          .select()
          .single();

        if (conversationError) {
          console.error('❌ [MESSAGES] Erro ao criar conversa:', conversationError);
          return;
        }

        conversationId = newConversation.id;
        setSelectedProject(prev => prev ? { ...prev, conversation_id: conversationId } : null);
      }

      // Send the message
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          sender_type: 'creator',
          content: newMessage.trim()
        });

      if (error) {
        console.error('❌ [MESSAGES] Erro ao enviar mensagem:', error);
        return;
      }

      // Clear the input and refresh messages
      setNewMessage('');
      if (conversationId) {
        await fetchMessages(conversationId);
      }
      
    } catch (err) {
      console.error('❌ [MESSAGES] Erro ao enviar mensagem:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  const deleteChat = async () => {
    if (!selectedProject || !selectedProject.conversation_id) {
      setShowDeleteConfirm(false);
      navigate('/creators/messages');
      return;
    }

    try {
      const { error: conversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', selectedProject.conversation_id);

      if (conversationError) {
        console.error('Erro ao deletar conversa:', conversationError);
        return;
      }

      // Navigate back to messages list and refresh
      setShowDeleteConfirm(false);
      setSelectedProject(null);
      setMessages([]);
      navigate('/creators/messages');
      fetchProjectChats(); // Refresh the list
    } catch (err) {
      console.error('Erro ao deletar chat:', err);
    }
  };

  const getChatDisplayTitle = (chat: ProjectChat) => {
    if (chat.custom_title && chat.custom_title.trim().length > 0) {
      return chat.custom_title.trim();
    }

    if (chat.opportunity?.title) {
      return chat.opportunity.title;
    }

    if (chat.analyst?.name) {
      return `Conversa com ${chat.analyst.name}`;
    }

    if (chat.analyst?.company) {
      return `Conversa com ${chat.analyst.company}`;
    }

    return 'Chat';
  };

  const parseTagsInput = (value: string) => {
    return Array.from(
      new Set(
        value
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      )
    ).slice(0, 10);
  };

  const handleSaveChatDetails = async () => {
    if (!selectedProject?.conversation_id || savingChatDetails) {
      return;
    }

    const trimmedTitle = chatTitleInput.trim();
    const tagsArray = parseTagsInput(chatTagsInput);

    try {
      setSavingChatDetails(true);
      setChatDetailsStatus(null);

      const { error } = await supabase
        .from('conversations')
        .update({
          custom_title: trimmedTitle.length > 0 ? trimmedTitle : null,
          tags: tagsArray
        })
        .eq('id', selectedProject.conversation_id);

      if (error) {
        throw error;
      }

      setProjectChats((prev) =>
        prev.map((chat) =>
          chat.conversation_id === selectedProject.conversation_id
            ? { ...chat, custom_title: trimmedTitle || null, tags: tagsArray }
            : chat
        )
      );

      setSelectedProject((prev) =>
        prev
          ? {
              ...prev,
              custom_title: trimmedTitle || null,
              tags: tagsArray
            }
          : prev
      );

      setIsEditingChatDetails(false);
      setChatDetailsStatus({ type: 'success', message: 'Detalhes do chat atualizados com sucesso.' });
    } catch (error) {
      console.error('Erro ao atualizar detalhes do chat:', error);
      setChatDetailsStatus({ type: 'error', message: 'Não foi possível salvar as alterações. Tente novamente.' });
    } finally {
      setSavingChatDetails(false);
    }
  };

  const handleCancelChatDetails = () => {
    if (selectedProject) {
      setChatTitleInput(selectedProject.custom_title || '');
      setChatTagsInput((selectedProject.tags || []).join(', '));
    } else {
      setChatTitleInput('');
      setChatTagsInput('');
    }
    setChatDetailsStatus(null);
    setIsEditingChatDetails(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  const formatMessageTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="glass-card p-6">
          <div className="glass-section-title mb-0">
            <div className="icon-wrap">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h1>Mensagens</h1>
              <p className="text-sm text-gray-400 mt-1">Carregando conversas...</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-16 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/15 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (selectedProject) {
    // Check if project was deleted
    const isProjectDeleted = !selectedProject.opportunity || selectedProject.opportunity.status === 'deleted' || selectedProject.opportunity.status === 'inativo';
    const chatTitle = getChatDisplayTitle(selectedProject);
    const chatTags = (selectedProject.tags || []) as string[];
    
    return (
      <div className="space-y-6">
        {/* Chat Header */}
        <div className="glass-card sticky top-24 z-40 flex w-full flex-wrap items-center gap-5 px-6 py-5">
          <button
            onClick={() => {
              navigate('/creators/messages');
              if (onBackToList) {
                onBackToList();
              }
            }}
            className="btn-ghost-glass px-3 py-2 rounded-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-[220px] space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-white truncate">{chatTitle}</h1>
              {chatTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {chatTags.slice(0, 2).map((tag) => (
                    <span key={tag} className="glass-chip text-xs uppercase tracking-[0.22em]">
                      #{tag}
                    </span>
                  ))}
                  {chatTags.length > 2 && (
                    <span className="glass-chip text-xs">+{chatTags.length - 2}</span>
                  )}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-300">
              {selectedProject.analyst?.name || 'Analista'} • {selectedProject.analyst?.company || 'Empresa'}
            </p>
            {selectedProject.opportunity?.title && (
              <p className="text-xs text-gray-500">
                {selectedProject.opportunity.title}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!isProjectDeleted && (
              <button
                onClick={() => {
                  if (selectedProject.project_id) {
                    navigate(`/creators/projects/${selectedProject.project_id}`);
                  } else {
                    navigate(`/creators/opportunities/${selectedProject.opportunity_id}`);
                  }
                }}
                className="btn-primary-glow"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Ver Projeto</span>
              </button>
            )}
            <button
              onClick={() => setIsEditingChatDetails((prev) => !prev)}
              className="btn-ghost-glass px-4 py-2 rounded-xl"
            >
              <PencilLine className="h-4 w-4" />
              <span>{isEditingChatDetails ? 'Fechar edição' : 'Editar detalhes'}</span>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-ghost-glass px-4 py-2 rounded-xl border border-red-400/40 text-red-300 hover:border-red-300 hover:text-red-200"
            >
              <Trash2 className="h-4 w-4" />
              <span>Apagar chat</span>
            </button>
          </div>
        </div>

        {chatDetailsStatus && (
          <div
            className={`glass-card border px-5 py-4 text-sm flex items-center gap-3 ${
              chatDetailsStatus.type === 'success'
                ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                : 'border-rose-400/40 bg-rose-500/10 text-rose-200'
            }`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                chatDetailsStatus.type === 'success'
                  ? 'border-emerald-300/30 bg-emerald-400/15 text-emerald-200'
                  : 'border-rose-300/30 bg-rose-400/15 text-rose-200'
              }`}
            >
              {chatDetailsStatus.type === 'success' ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            </div>
            <p>{chatDetailsStatus.message}</p>
          </div>
        )}

        {isEditingChatDetails && (
          <div className="glass-card border px-6 py-6">
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-200">
                  Título personalizado
                </label>
                <input
                  type="text"
                  value={chatTitleInput}
                  onChange={(event) => setChatTitleInput(event.target.value)}
                  placeholder="Digite um título descritivo para este chat"
                  className="mt-2 w-full rounded-xl border border-transparent bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:border-indigo-400/70 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                />
                <p className="mt-2 text-xs text-gray-400">
                  Deixe em branco para usar automaticamente o título da oportunidade.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200">
                  Tags (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={chatTagsInput}
                  onChange={(event) => setChatTagsInput(event.target.value)}
                  placeholder="ex: briefing, entrega, revisão"
                  className="mt-2 w-full rounded-xl border border-transparent bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:border-indigo-400/70 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                />
                <p className="mt-2 text-xs text-gray-400">
                  Máximo de 10 tags. Use palavras-chave curtas para facilitar futuras buscas.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancelChatDetails}
                  className="btn-ghost-glass px-4 py-2"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveChatDetails}
                  disabled={savingChatDetails}
                  className="btn-primary-glow flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingChatDetails ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-transparent"></span>
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span>Salvar alterações</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Project Deleted Warning */}
        {isProjectDeleted && (
          <div className="glass-card border border-rose-400/40 bg-rose-500/10 px-5 py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-300/40 bg-rose-400/15 text-rose-200">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-rose-100">Projeto Encerrado</h3>
                <p className="text-xs text-rose-200/90">
                  Este projeto foi encerrado ou removido. Você não pode mais enviar mensagens.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Chat Container */}
        <div className="glass-card h-[620px] flex flex-col overflow-hidden border">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_type === 'creator' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md rounded-2xl px-4 py-3 shadow-[0_18px_40px_-24px_rgba(16,40,120,0.55)] ${
                    message.sender_type === 'creator'
                      ? 'bg-gradient-to-br from-indigo-500/85 via-sky-500/75 to-violet-500/80 text-white'
                      : 'bg-white/7 border border-white/12 text-gray-100 backdrop-blur-xl'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <p
                    className={`text-xs mt-2 uppercase tracking-[0.22em] ${
                      message.sender_type === 'creator'
                        ? 'text-white/70'
                        : 'text-gray-300/70'
                    }`}
                  >
                    {formatMessageTime(message.created_at)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t border-white/10 bg-white/4 px-5 py-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isProjectDeleted && sendMessage()}
                placeholder={isProjectDeleted ? 'Projeto encerrado - não é possível enviar mensagens' : 'Digite sua mensagem...'}
                disabled={isProjectDeleted}
                className="flex-1 rounded-xl border border-transparent bg-white/10 px-4 py-3 text-sm text-white placeholder:text-gray-400 focus:border-indigo-400/70 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 disabled:bg-white/5 disabled:text-gray-500/70"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sendingMessage || isProjectDeleted}
                className="btn-primary-glow px-4 py-3 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingMessage ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-transparent"></div>
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Delete Chat Confirmation Modal */}
        {showDeleteConfirm && (
          <ModalPortal>
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
              <div className="glass-card w-full max-w-md border px-6 py-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-400/40 bg-rose-500/15 text-rose-200">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Confirmar Exclusão</h3>
                </div>
                <p className="text-sm text-gray-300 mb-6 leading-relaxed">
                  Tem certeza que deseja apagar este chat? Esta ação não pode ser desfeita e todas as mensagens serão permanentemente removidas.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="btn-ghost-glass px-4 py-2"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={deleteChat}
                    className="btn-ghost-glass px-4 py-2 border border-rose-400/60 bg-rose-500/20 text-rose-100 hover:border-rose-300 hover:text-rose-50"
                  >
                    Apagar Chat
                  </button>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="glass-card px-6 py-5">
        <div className="glass-section-title mb-0">
          <div className="icon-wrap">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <h1>Mensagens</h1>
            <p className="text-sm text-gray-300 mt-1">Converse com empresas sobre oportunidades</p>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden border">
        {/* Search */}
        <div className="px-6 py-5 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar conversas..."
              className="w-full rounded-xl border border-transparent bg-white/8 px-10 py-3 text-sm text-white placeholder:text-gray-400 focus:border-indigo-400/70 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
            />
          </div>
        </div>

        {/* Conversations List */}
  <div className="divide-y divide-white/10">
          {projectChats.map((projectChat) => {
            const displayTitle = getChatDisplayTitle(projectChat);
            const tags = (projectChat.tags || []) as string[];
            const targetPathId = projectChat.opportunity_id || projectChat.project_id || projectChat.conversation_id;

            return (
              <div
                key={projectChat.conversation_id || projectChat.opportunity_id}
                className="group cursor-pointer px-6 py-5 transition-colors hover:bg-white/6"
                onClick={() => {
                  if (targetPathId) {
                    navigate(`/creators/messages/${targetPathId}`);
                  } else {
                    navigate('/creators/messages');
                  }
                }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/12 bg-white/10">
                      <img
                        src="https://images.pexels.com/photos/3762800/pexels-photo-3762800.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&fit=crop"
                        alt={projectChat.analyst?.company || 'Empresa'}
                        className="h-full w-full object-cover opacity-90"
                      />
                      <div className="absolute inset-0 rounded-2xl border border-white/15 opacity-50" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-white truncate">{displayTitle}</h3>
                        {projectChat.unread_count > 0 && (
                          <span className="glass-chip !px-3 !py-1 text-xs font-semibold">
                            {projectChat.unread_count} novas
                          </span>
                        )}
                        <span
                          className={`inline-flex h-2 w-2 rounded-full ${
                            projectChat.opportunity?.status === 'inativo' || projectChat.opportunity?.status === 'deleted'
                              ? 'bg-rose-400'
                              : 'bg-emerald-400'
                          }`}
                          title={projectChat.opportunity?.status === 'inativo' || projectChat.opportunity?.status === 'deleted' ? 'Projeto encerrado' : 'Projeto ativo'}
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
                        <span>{projectChat.analyst?.company || 'Empresa'}</span>
                        {projectChat.opportunity?.title && (
                          <span className="text-gray-400">• {projectChat.opportunity.title}</span>
                        )}
                      </div>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <span key={tag} className="glass-chip !px-3 !py-1 text-[11px] uppercase tracking-[0.2em]">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {projectChat.lastMessage && (
                        <p className="text-sm text-gray-300/90 line-clamp-1">
                          {projectChat.lastMessage.sender_type === 'creator' ? 'Você: ' : ''}
                          {projectChat.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3 text-right text-xs text-gray-400">
                    {projectChat.lastMessage && (
                      <span>{formatTime(projectChat.lastMessage.created_at)}</span>
                    )}
                    <button className="btn-ghost-glass px-3 py-2">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {projectChats.length === 0 && (
          <div className="glass-card text-center py-16 px-8 flex flex-col items-center gap-6">
            <div className="relative flex items-center justify-center h-16 w-16 rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/25 via-sky-400/25 to-purple-500/25 shadow-[0_22px_45px_-20px_rgba(46,180,255,0.45)]">
              <div className="absolute inset-0 rounded-2xl border border-white/20 opacity-60" />
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <div className="space-y-2 max-w-lg">
              <h3 className="text-lg font-semibold text-white">Nenhuma conversa ainda</h3>
              <p className="text-sm text-gray-300">
                Suas conversas com analistas aparecerão aqui quando suas candidaturas forem aprovadas.
              </p>
            </div>
            <button
              onClick={() => navigate('/creators/opportunities')}
              className="btn-primary-glow inline-flex items-center gap-2"
            >
              <ArrowRight className="h-4 w-4" /> Explorar oportunidades
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;