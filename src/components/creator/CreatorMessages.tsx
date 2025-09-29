import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageCircle, 
  Search, 
  Send, 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  Circle,
  MoreVertical,
  Pin,
  Star,
  Paperclip,
  Smile
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from '../../hooks/useRouter';

interface CreatorProjectChat {
  opportunity_id: string;
  opportunity: {
    title: string;
    company: string;
    status: string;
    analyst_id: string;
  } | null;
  analyst: {
    name: string;
    company: string;
    avatar?: string;
  } | null;
  conversation_id: string | null;
  last_message_at: string | null;
  lastMessage?: {
    content: string;
    sender_type: string;
    created_at: string;
  };
  unread_count: number;
  priority: 'high' | 'medium' | 'low';
  is_pinned: boolean;
  is_archived: boolean;
}

interface CreatorMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'analyst' | 'creator';
  content: string;
  read: boolean;
  created_at: string;
  message_type?: 'text' | 'file' | 'system';
  metadata?: {
    file_name?: string;
    file_url?: string;
    system_action?: string;
  };
}

interface CreatorMessagesProps {
  selectedProjectId?: string | null;
  onBackToList?: () => void;
  variant?: 'full' | 'compact';
  className?: string;
}

const CreatorMessages: React.FC<CreatorMessagesProps> = ({ 
  selectedProjectId, 
  onBackToList,
  variant = 'full',
  className = '' 
}) => {
  const [projectChats, setProjectChats] = useState<CreatorProjectChat[]>([]);
  const [filteredChats, setFilteredChats] = useState<CreatorProjectChat[]>([]);
  const [selectedProject, setSelectedProject] = useState<CreatorProjectChat | null>(null);
  const [messages, setMessages] = useState<CreatorMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'pinned' | 'archived'>('all');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const { user } = useAuth();
  const { navigate } = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchProjectChats = useCallback(async () => {
    if (!user) return;

    try {
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

      const chatsData = await Promise.all(
        (applicationsData || []).map(async (application) => {
          const opportunityId = application.opportunity_id;
          const opportunity = Array.isArray(application.opportunity) 
            ? application.opportunity[0] 
            : application.opportunity;

          // Get conversation data
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

          // Get last message and unread count
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

            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conversationData.id)
              .eq('read', false)
              .neq('sender_id', user.id);

            lastMessage = lastMessageData;
            unreadCount = count || 0;
          }

          // Calculate priority based on last message time and unread count
          const priority = unreadCount > 3 ? 'high' : unreadCount > 0 ? 'medium' : 'low';

          return {
            opportunity_id: opportunityId,
            opportunity: opportunity,
            analyst: analystData,
            conversation_id: conversationData?.id || null,
            last_message_at: conversationData?.last_message_at || null,
            lastMessage: lastMessage,
            unread_count: unreadCount,
            priority,
            is_pinned: false, // This would come from user preferences
            is_archived: false
          } as CreatorProjectChat;
        })
      );

      // Sort by priority and last message time
      chatsData.sort((a, b) => {
        // Pinned conversations first
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        
        // Then by priority
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // Finally by last message time
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

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedProject?.conversation_id || sendingMessage) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedProject.conversation_id,
          sender_id: user?.id,
          sender_type: 'creator',
          content: newMessage.trim(),
          read: true
        });

      if (error) {
        console.error('Erro ao enviar mensagem:', error);
      } else {
        setNewMessage('');
        await fetchMessages(selectedProject.conversation_id);
        await fetchProjectChats(); // Refresh chat list
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  // Filter chats based on search and filter
  useEffect(() => {
    let filtered = projectChats;

    // Apply text search
    if (searchTerm) {
      filtered = filtered.filter(chat => 
        chat.opportunity?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chat.opportunity?.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chat.analyst?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    switch (filter) {
      case 'unread':
        filtered = filtered.filter(chat => chat.unread_count > 0);
        break;
      case 'pinned':
        filtered = filtered.filter(chat => chat.is_pinned);
        break;
      case 'archived':
        filtered = filtered.filter(chat => chat.is_archived);
        break;
      default:
        filtered = filtered.filter(chat => !chat.is_archived);
    }

    setFilteredChats(filtered);
  }, [projectChats, searchTerm, filter]);

  useEffect(() => {
    if (user) {
      fetchProjectChats();
    }
  }, [user, fetchProjectChats]);

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
    }
  }, [selectedProject, fetchMessages]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d`;
    return date.toLocaleDateString('pt-BR');
  };

  const getPriorityIndicator = (priority: string) => {
    switch (priority) {
      case 'high':
        return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
      case 'medium':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>;
      default:
        return <div className="w-2 h-2 bg-gray-300 rounded-full"></div>;
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-2 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Compact variant for dashboard
  if (variant === 'compact') {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Mensagens Recentes</h3>
          <button 
            onClick={() => navigate('/creators/messages')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Ver todas →
          </button>
        </div>
        
        {filteredChats.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Nenhuma conversa ativa</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredChats.slice(0, 3).map((chat) => (
              <div
                key={chat.opportunity_id}
                onClick={() => navigate(`/creators/messages/${chat.opportunity_id}`)}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="relative">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-blue-600" />
                  </div>
                  {chat.unread_count > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-white">{chat.unread_count}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {chat.opportunity?.title}
                    </h4>
                    {getPriorityIndicator(chat.priority)}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {chat.analyst?.name} • {chat.opportunity?.company}
                  </p>
                  {chat.lastMessage && (
                    <p className="text-xs text-gray-400 truncate mt-1">
                      {chat.lastMessage.content}
                    </p>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {chat.last_message_at && formatTime(chat.last_message_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className={`bg-white rounded-xl border border-gray-200 h-full flex ${className}`}>
      {/* Chat List */}
      <div className={`border-r border-gray-200 ${selectedProject ? 'w-80' : 'flex-1'} flex flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Mensagens</h2>
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Todas' },
              { key: 'unread', label: 'Não Lidas' },
              { key: 'pinned', label: 'Fixadas' },
              { key: 'archived', label: 'Arquivadas' }
            ].map(filterOption => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key as 'all' | 'unread' | 'pinned' | 'archived')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filter === filterOption.key
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filterOption.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">
                {filter === 'all' ? 'Nenhuma conversa encontrada' : `Nenhuma conversa ${filter}`}
              </p>
            </div>
          ) : (
            <div className="p-2">
              {filteredChats.map((chat) => (
                <div
                  key={chat.opportunity_id}
                  onClick={() => setSelectedProject(chat)}
                  className={`p-3 rounded-lg mb-2 cursor-pointer transition-all ${
                    selectedProject?.opportunity_id === chat.opportunity_id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <MessageCircle className="h-5 w-5 text-blue-600" />
                      </div>
                      {chat.unread_count > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-white">
                            {chat.unread_count > 9 ? '9+' : chat.unread_count}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {chat.opportunity?.title}
                          </h3>
                          {getPriorityIndicator(chat.priority)}
                          {chat.is_pinned && <Pin className="h-3 w-3 text-gray-400" />}
                        </div>
                        <span className="text-xs text-gray-400">
                          {chat.last_message_at && formatTime(chat.last_message_at)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">
                        {chat.analyst?.name} • {chat.opportunity?.company}
                      </p>
                      {chat.lastMessage && (
                        <p className="text-xs text-gray-400 truncate">
                          {chat.lastMessage.sender_type === 'creator' ? 'Você: ' : ''}
                          {chat.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      {selectedProject ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedProject(null);
                    onBackToList?.();
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 lg:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <h3 className="font-medium text-gray-900">{selectedProject.opportunity?.title}</h3>
                  <p className="text-sm text-gray-500">
                    {selectedProject.analyst?.name} • {selectedProject.opportunity?.company}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  <Star className="h-4 w-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_type === 'creator' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender_type === 'creator'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm">{message.content}</p>
                  <div className={`flex items-center justify-between mt-1 text-xs ${
                    message.sender_type === 'creator' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    <span>{formatTime(message.created_at)}</span>
                    {message.sender_type === 'creator' && (
                      <div className="ml-2">
                        {message.read ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <Circle className="h-3 w-3" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <Paperclip className="h-4 w-4" />
              </button>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Digite sua mensagem..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <Smile className="h-4 w-4" />
              </button>
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sendingMessage}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors"
              >
                {sendingMessage ? (
                  <Clock className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Selecione uma conversa</h3>
            <p className="text-gray-500">Escolha uma conversa para começar a trocar mensagens</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatorMessages;