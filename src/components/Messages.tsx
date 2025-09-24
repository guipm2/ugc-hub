import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Search, MoreVertical, Send, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Conversation {
  id: string;
  opportunity_id: string;
  analyst_id: string;
  creator_id: string;
  last_message_at: string;
  created_at: string;
  opportunity: {
    title: string;
    company: string;
  };
  analyst: {
    name: string;
    company: string;
  } | null;
  lastMessage?: {
    content: string;
    sender_type: string;
    created_at: string;
  };
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
  selectedConversationId?: string | null;
  onBackToList?: () => void;
}

const Messages: React.FC<MessagesProps> = ({ selectedConversationId, onBackToList }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          opportunity_id,
          analyst_id,
          creator_id,
          last_message_at,
          created_at,
          opportunity:opportunities (
            title,
            company
          ),
          analyst:analysts!analyst_id (
            name,
            company
          )
        `)
        .eq('creator_id', user.id)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar conversas:', error);
      } else {
        // Fetch last message for each conversation
        const conversationsWithLastMessage = await Promise.all(
          (data || []).map(async (conv) => {
            const { data: lastMessage } = await supabase
              .from('messages')
              .select('content, sender_type, created_at')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            return {
              ...conv,
              opportunity: Array.isArray(conv.opportunity) ? conv.opportunity[0] : conv.opportunity,
              analyst: Array.isArray(conv.analyst) ? conv.analyst[0] : conv.analyst,
              lastMessage: lastMessage || undefined
            };
          })
        );

        setConversations(conversationsWithLastMessage);
      }
    } catch (err) {
      console.error('Erro ao buscar conversas:', err);
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
      fetchConversations();
    }
  }, [user, fetchConversations]);

  // Auto-select conversation if provided
  useEffect(() => {
    if (selectedConversationId && conversations.length > 0) {
      const conversation = conversations.find(c => c.id === selectedConversationId);
      if (conversation) {
        setSelectedConversation(conversation);
      }
    }
  }, [selectedConversationId, conversations]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      
      // Subscribe to new messages
      const channel = supabase
        .channel(`messages_${selectedConversation.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${selectedConversation.id}`
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
  }, [selectedConversation, fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    setSendingMessage(true);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          sender_type: 'creator',
          content: newMessage.trim()
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao enviar mensagem:', error);
        alert('Erro ao enviar mensagem');
      } else {
        // Adicionar a mensagem imediatamente à lista local
        if (data) {
          setMessages(prev => [...prev, data]);
        }
        setNewMessage('');
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      alert('Erro ao enviar mensagem');
    } finally {
      setSendingMessage(false);
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

  if (selectedConversation) {
    return (
      <div className="space-y-6">
        {/* Chat Header */}
        <div className="flex items-center gap-4 sticky top-16 bg-gray-50 z-50 py-4">
          <button
            onClick={() => {
              setSelectedConversation(null);
              if (onBackToList) {
                onBackToList();
              }
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {selectedConversation.analyst?.name || 'Analista'}
            </h1>
            <p className="text-gray-600">
              {selectedConversation.analyst?.company || 'Empresa'} • {selectedConversation.opportunity.title}
            </p>
          </div>
        </div>

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
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Digite sua mensagem..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sendingMessage}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-2 rounded-lg transition-colors"
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
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => setSelectedConversation(conversation)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img
                    src="https://images.pexels.com/photos/3762800/pexels-photo-3762800.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&fit=crop"
                    alt={conversation.analyst?.company || 'Empresa'}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-900">{conversation.analyst?.company || 'Empresa'}</h3>
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    </div>
                    <p className="text-gray-500 text-xs mb-1">{conversation.opportunity.title}</p>
                    {conversation.lastMessage && (
                      <p className="text-gray-600 text-sm truncate max-w-xs">
                        {conversation.lastMessage.sender_type === 'creator' ? 'Você: ' : ''}
                        {conversation.lastMessage.content}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {conversation.lastMessage && (
                    <span className="text-xs text-gray-500">
                      {formatTime(conversation.lastMessage.created_at)}
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
        {conversations.length === 0 && (
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