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

    try {
      // First, get all opportunities that the user has applied to and got approved
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('opportunity_applications')
        .select(`
          opportunity_id,
          status,
          opportunity:opportunities (
            id,
            title,
            company,
            status,
            analyst_id
          )
        `)
        .eq('creator_id', user.id)
        .eq('status', 'approved');

      if (applicationsError) {
        console.error('Erro ao buscar candidaturas:', applicationsError);
        setLoading(false);
        return;
      }

      // For each approved application, get conversation data and analyst info
      const chatsData = await Promise.all(
        (applicationsData || []).map(async (application) => {
          const opportunityId = application.opportunity_id;
          const opportunity = Array.isArray(application.opportunity) 
            ? application.opportunity[0] 
            : application.opportunity;

          // Check if conversation exists
          const { data: conversationData } = await supabase
            .from('conversations')
            .select('id, last_message_at')
            .eq('opportunity_id', opportunityId)
            .eq('creator_id', user.id)
            .maybeSingle();

          // Get analyst info
          const { data: analystData } = await supabase
            .from('analysts')
            .select('name, company')
            .eq('id', opportunity?.analyst_id)
            .maybeSingle();

          // Get last message if conversation exists
          let lastMessage = null;
          let unreadCount = 0;
          if (conversationData) {
            const { data: lastMessageData } = await supabase
              .from('messages')
              .select('content, sender_type, created_at')
              .eq('conversation_id', conversationData.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            // Count unread messages
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conversationData.id)
              .eq('read', false)
              .neq('sender_id', user.id);

            lastMessage = lastMessageData;
            unreadCount = count || 0;
          }

          return {
            opportunity_id: opportunityId,
            opportunity: opportunity,
            analyst: analystData,
            conversation_id: conversationData?.id || null,
            last_message_at: conversationData?.last_message_at || null,
            lastMessage: lastMessage,
            unread_count: unreadCount
          } as ProjectChat;
        })
      );

      // Sort by last message time (most recent first)
      chatsData.sort((a, b) => {
        if (!a.last_message_at && !b.last_message_at) return 0;
        if (!a.last_message_at) return 1;
        if (!b.last_message_at) return -1;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });

      setProjectChats(chatsData);
    } catch (err) {
      console.error('Erro ao buscar chats de projetos:', err);
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
        console.error('Erro ao buscar mensagens:', error);
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
      console.error('Erro ao buscar mensagens:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProjectChats();
    }
  }, [user, fetchProjectChats]);

  // Auto-select project chat if provided via URL
  useEffect(() => {
    if (selectedProjectId && projectChats.length > 0) {
      const projectChat = projectChats.find(chat => chat.opportunity_id === selectedProjectId);
      if (projectChat) {
        setSelectedProject(projectChat);
      }
    }
  }, [selectedProjectId, projectChats]);

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
            setMessages(prev => [...prev, newMessage]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedProject, fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedProject || !user) return;
    
    // If no conversation exists yet, create one
    let conversationId = selectedProject.conversation_id;
    if (!conversationId) {
      const { data: newConversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          opportunity_id: selectedProject.opportunity_id,
          analyst_id: selectedProject.opportunity?.analyst_id,
          creator_id: user.id
        })
        .select()
        .single();

      if (conversationError || !newConversation) {
        console.error('Erro ao criar conversa:', conversationError);
        return;
      }

      conversationId = newConversation.id;
      // Update the selected project with the new conversation ID
      setSelectedProject(prev => prev ? { ...prev, conversation_id: conversationId } : null);
    }

    setSendingMessage(true);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          sender_type: 'creator',
          content: newMessage.trim()
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao enviar mensagem:', error);
      } else {
        // Adicionar a mensagem imediatamente à lista local
        if (data) {
          setMessages(prev => [...prev, data]);
        }
        setNewMessage('');
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
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