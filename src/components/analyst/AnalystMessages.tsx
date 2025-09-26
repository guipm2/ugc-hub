import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Search, MoreVertical, Send, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAnalystAuth } from '../../contexts/AnalystAuthContext';

// Unified conversation - one per analyst-creator pair
interface UnifiedConversation {
  id: string;
  analyst_id: string;
  creator_id: string;
  last_message_at: string;
  created_at: string;
  creator: {
    name: string;
    email: string;
  };
  // All projects between this analyst and creator
  projects: {
    id: string;
    opportunity_id: string;
    opportunity_title: string;
    opportunity_company: string;
    status: 'active' | 'completed' | 'paused';
    started_at: string;
  }[];
  lastMessage?: {
    content: string;
    sender_type: string;
    created_at: string;
    project_context?: string; // Which project this message is about
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
  message_type: 'general' | 'project' | 'system';
  project_context?: string; // opportunity_id if message is about specific project
  project_title?: string; // For display purposes
}

interface AnalystMessagesProps {
  selectedConversationId?: string | null;
  onBackToList?: () => void;
}

const AnalystMessages: React.FC<AnalystMessagesProps> = ({ 
  selectedConversationId 
}) => {
  const { analyst } = useAnalystAuth();
  const [conversations, setConversations] = useState<UnifiedConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<UnifiedConversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch unified conversations
  const fetchConversations = useCallback(async () => {
    if (!analyst) return;

    try {
      // Step 1: Get all unique analyst-creator pairs who have conversations
      const { data: conversationData, error: convError } = await supabase
        .from('conversations')
        .select(`
          id,
          analyst_id,
          creator_id,
          created_at,
          last_message_at,
          creator:profiles!creator_id (
            name,
            email
          )
        `)
        .eq('analyst_id', analyst.id)
        .order('last_message_at', { ascending: false });

      if (convError) {
        console.error('Erro ao buscar conversas:', convError);
        return;
      }

      // Step 2: Group conversations by creator and collect all conversation IDs
      const creatorConversations = new Map();
      const allConversationsByCreator = new Map();
      
      for (const conv of conversationData || []) {
        if (!creatorConversations.has(conv.creator_id)) {
          creatorConversations.set(conv.creator_id, {
            id: conv.id, // Use the first conversation ID as the unified conversation ID
            analyst_id: conv.analyst_id,
            creator_id: conv.creator_id,
            creator: conv.creator,
            created_at: conv.created_at,
            last_message_at: conv.last_message_at,
            projects: [],
            unread_count: 0
          });
          allConversationsByCreator.set(conv.creator_id, []);
        } else {
          // Update last_message_at if this conversation is more recent
          const existing = creatorConversations.get(conv.creator_id);
          if (new Date(conv.last_message_at) > new Date(existing.last_message_at)) {
            existing.last_message_at = conv.last_message_at;
          }
        }
        
        // Add conversation ID to the creator's list
        allConversationsByCreator.get(conv.creator_id).push(conv.id);
      }

      // Step 3: Get all projects (opportunity_applications) for each creator
      const unifiedConversations = await Promise.all(
        Array.from(creatorConversations.values()).map(async (conv) => {
          // Get all approved projects between this analyst and creator
          const { data: applications } = await supabase
            .from('opportunity_applications')
            .select('id, opportunity_id, status, applied_at')
            .eq('creator_id', conv.creator_id)
            .eq('status', 'approved');

          // Get opportunity details for each application
          const projectPromises = (applications || []).map(async (app) => {
            const { data: opportunity } = await supabase
              .from('opportunities')
              .select('id, title, company, analyst_id')
              .eq('id', app.opportunity_id)
              .eq('analyst_id', analyst.id)
              .maybeSingle();

            if (opportunity) {
              return {
                id: app.id,
                opportunity_id: app.opportunity_id,
                opportunity_title: opportunity.title,
                opportunity_company: opportunity.company,
                status: 'active' as const,
                started_at: app.applied_at
              };
            }
            return null;
          });

          const projectResults = await Promise.all(projectPromises);
          const formattedProjects = projectResults.filter(Boolean);

          // Get conversation IDs for this creator (already collected above)
          const conversationIds = allConversationsByCreator.get(conv.creator_id) || [];

          // Get last message across all conversations with this creator
          let lastMessage = null;
          if (conversationIds.length > 0) {
            const { data } = await supabase
              .from('messages')
              .select(`
                content, 
                sender_type, 
                created_at,
                message_type,
                project_context
              `)
              .in('conversation_id', conversationIds)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            lastMessage = data;
          }

          return {
            ...conv,
            projects: formattedProjects,
            lastMessage: lastMessage ? {
              content: lastMessage.content,
              sender_type: lastMessage.sender_type,
              created_at: lastMessage.created_at,
              project_context: lastMessage.project_context
            } : undefined
          };
        })
      );

      setConversations(unifiedConversations);
    } catch (err) {
      console.error('Erro ao buscar conversas:', err);
    } finally {
      setLoading(false);
    }
  }, [analyst]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao buscar mensagens:', error);
        return;
      }

      setMessages(data || []);
    } catch (err) {
      console.error('Erro ao buscar mensagens:', err);
    }
  }, []);

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !analyst) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: analyst.id,
          sender_type: 'analyst',
          content: newMessage.trim(),
          read: true,
          message_type: 'general'
        });

      if (error) {
        console.error('Erro ao enviar mensagem:', error);
        return;
      }

      setNewMessage('');
      await fetchMessages(selectedConversation.id);
      await fetchConversations();
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    }
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'agora';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else {
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      conv.creator?.name?.toLowerCase().includes(searchTermLower) ||
      conv.creator?.email?.toLowerCase().includes(searchTermLower) ||
      conv.projects.some(project => 
        project.opportunity_title.toLowerCase().includes(searchTermLower) ||
        project.opportunity_company.toLowerCase().includes(searchTermLower)
      ) ||
      conv.lastMessage?.content?.toLowerCase().includes(searchTermLower)
    );
  });

  // Effects
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedConversationId) {
      const conversation = conversations.find(c => c.id === selectedConversationId);
      if (conversation) {
        setSelectedConversation(conversation);
        fetchMessages(conversation.id);
      }
    }
  }, [selectedConversationId, conversations, fetchMessages]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Conversations List */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Mensagens</h2>
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <MessageCircle className="h-12 w-12 mb-4" />
              <p className="text-center px-4">
                Nenhuma conversa encontrada
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedConversation?.id === conversation.id ? 'bg-purple-50' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-medium text-sm">
                      {conversation.creator?.name?.[0] || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {conversation.creator?.name || 'Usuário'}
                      </h3>
                      {conversation.lastMessage && (
                        <span className="text-xs text-gray-500">
                          {formatTime(conversation.lastMessage.created_at)}
                        </span>
                      )}
                    </div>
                    
                    {/* Project titles */}
                    {conversation.projects.length > 0 && (
                      <div className="mt-1">
                        {conversation.projects.slice(0, 2).map((project) => (
                          <p key={project.id} className="text-xs text-purple-600 font-medium truncate">
                            📁 {project.opportunity_title}
                          </p>
                        ))}
                        {conversation.projects.length > 2 && (
                          <p className="text-xs text-gray-500">
                            +{conversation.projects.length - 2} outros projetos
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Last message preview */}
                    {conversation.lastMessage && (
                      <p className="text-xs text-gray-600 truncate mt-1">
                        {conversation.lastMessage.sender_type === 'analyst' ? 'Você: ' : ''}
                        {conversation.lastMessage.content}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Messages View */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSelectedConversation(null)}
                className="p-2 text-gray-400 hover:text-gray-600 lg:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-medium text-sm">
                  {selectedConversation.creator?.name?.[0] || 'U'}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedConversation.creator?.name || 'Usuário'}
                </h3>
                {selectedConversation.projects.length > 0 && (
                  <p className="text-sm text-gray-500">
                    {selectedConversation.projects.length} projeto(s) ativo(s)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender_type === 'analyst' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender_type === 'analyst'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {/* Project context indicator */}
                  {message.project_context && (
                    <p className={`text-xs mb-1 opacity-75 ${
                      message.sender_type === 'analyst' ? 'text-purple-100' : 'text-gray-500'
                    }`}>
                      📁 {message.project_title || 'Projeto'}
                    </p>
                  )}
                  
                  <p>{message.content}</p>
                  
                  <p
                    className={`text-xs mt-1 ${
                      message.sender_type === 'analyst' ? 'text-purple-100' : 'text-gray-500'
                    }`}
                  >
                    {new Date(message.created_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center text-gray-500">
            <MessageCircle className="h-16 w-16 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Selecione uma conversa</h3>
            <p>Escolha uma conversa para começar a trocar mensagens</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalystMessages;