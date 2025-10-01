import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Search, MoreVertical, Send, ArrowLeft, ExternalLink, AlertTriangle, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from '../hooks/useRouter';

interface ProjectChat {
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
          last_message_at
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
            unread_count: 0
          });
          allConversationsByAnalyst.set(conv.analyst_id, []);
        } else {
          // Update last_message_at if this conversation is more recent
          const existing = analystConversations.get(conv.analyst_id);
          if (new Date(conv.last_message_at) > new Date(existing.last_message_at)) {
            existing.last_message_at = conv.last_message_at;
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
              unread_count: unreadCount || 0
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
      const { data: newConv, error: convError } = await supabase
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
      const projectChat = projectChats.find(chat => chat.opportunity_id === selectedProjectId);
            if (projectChat) {
                setSelectedProject(projectChat);
      } else {
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

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      // Delete all messages first
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', selectedProject.conversation_id);

      if (messagesError) {
        console.error('Erro ao deletar mensagens:', messagesError);
        return;
      }

      // Delete the conversation
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
      navigate('/creators/messages');
      fetchProjectChats(); // Refresh the list
    } catch (err) {
      console.error('Erro ao deletar chat:', err);
      console.error('Erro ao deletar chat:', err);
    }
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Mensagens</h1>
          <p className="text-gray-600 mt-1">Carregando conversas...</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (selectedProject) {
    // Check if project was deleted
    const isProjectDeleted = !selectedProject.opportunity || selectedProject.opportunity.status === 'deleted' || selectedProject.opportunity.status === 'inativo';
    
    return (
      <div className="space-y-6">
        {/* Chat Header */}
        <div className="flex items-center gap-4 sticky top-16 bg-gray-50 z-50 py-4">
          <button
            onClick={() => {
                            navigate('/creators/messages');
              if (onBackToList) {
                                onBackToList();
              }
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-gray-900">
              {selectedProject.analyst?.name || 'Analista'}
            </h1>
            <p className="text-gray-600">
              {selectedProject.analyst?.company || 'Empresa'} • {selectedProject.opportunity?.title || 'Oportunidade'}
            </p>
          </div>
          
          {/* Project Details Button - Hide if project deleted */}
          {!isProjectDeleted && (
            <button
              onClick={() => navigate(`/creators/opportunities/${selectedProject.opportunity_id}`)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Ver Projeto</span>
            </button>
          )}
        </div>

        {/* Project Deleted Warning */}
        {isProjectDeleted && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div className="flex-1">
                <h3 className="text-red-800 font-medium">Projeto Encerrado</h3>
                <p className="text-red-700 text-sm">
                  Este projeto foi encerrado ou removido. Você não pode mais enviar mensagens.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 text-red-600 hover:text-red-800 px-3 py-1 rounded border border-red-300 hover:border-red-400 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>Apagar Chat</span>
              </button>
            </div>
          </div>
        )}

        {/* Chat Container */}
        <div className="bg-white rounded-xl border border-gray-200 h-[600px] flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_type === 'creator' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender_type === 'creator'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.sender_type === 'creator' ? 'text-blue-100' : 'text-gray-500'
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
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isProjectDeleted && sendMessage()}
                placeholder={isProjectDeleted ? "Projeto encerrado - não é possível enviar mensagens" : "Digite sua mensagem..."}
                disabled={isProjectDeleted}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sendingMessage || isProjectDeleted}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-2 rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                {sendingMessage ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Delete Chat Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-mx">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">Confirmar Exclusão</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Tem certeza que deseja apagar este chat? Esta ação não pode ser desfeita e todas as mensagens serão permanentemente removidas.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={deleteChat}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Apagar Chat
                </button>
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
        <h1 className="text-2xl font-semibold text-gray-900">Mensagens</h1>
        <p className="text-gray-600 mt-1">Converse com empresas sobre oportunidades</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar conversas..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="divide-y divide-gray-200">
          {projectChats.map((projectChat) => (
            <div
              key={projectChat.opportunity_id}
              className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => navigate(`/creators/messages/${projectChat.opportunity_id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img
                    src="https://images.pexels.com/photos/3762800/pexels-photo-3762800.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&fit=crop"
                    alt={projectChat.analyst?.company || 'Empresa'}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-900">{projectChat.analyst?.company || 'Empresa'}</h3>
                      {projectChat.unread_count > 0 && (
                        <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {projectChat.unread_count}
                        </span>
                      )}
                      {/* Project status indicator */}
                      {projectChat.opportunity?.status === 'inativo' || projectChat.opportunity?.status === 'deleted' ? (
                        <div className="w-2 h-2 bg-red-500 rounded-full" title="Projeto encerrado"></div>
                      ) : (
                        <div className="w-2 h-2 bg-green-500 rounded-full" title="Projeto ativo"></div>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs mb-1">{projectChat.opportunity?.title || 'Oportunidade'}</p>
                    {projectChat.lastMessage && (
                      <p className="text-gray-600 text-sm truncate max-w-xs">
                        {projectChat.lastMessage.sender_type === 'creator' ? 'Você: ' : ''}
                        {projectChat.lastMessage.content}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {projectChat.lastMessage && (
                    <span className="text-xs text-gray-500">
                      {formatTime(projectChat.lastMessage.created_at)}
                    </span>
                  )}
                  <button className="p-1 hover:bg-gray-200 rounded">
                    <MoreVertical className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {projectChats.length === 0 && (
          <div className="text-center py-12">
            <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma conversa ainda</h3>
            <p className="text-gray-600">
              Suas conversas com analistas aparecerão aqui quando suas candidaturas forem aprovadas
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;