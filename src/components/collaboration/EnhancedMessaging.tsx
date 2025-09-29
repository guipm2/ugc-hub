import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, Paperclip, Reply, Edit,
  Check, CheckCheck, Clock, X, MessageCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useAnalystAuth } from '../../contexts/AnalystAuthContext';
import { useRealTimeCollaboration } from '../../hooks/useRealTimeCollaboration';

interface EnhancedMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'analyst' | 'creator';
  content: string;
  message_type: 'text' | 'file' | 'image' | 'video' | 'system';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  reply_to_id?: string;
  edited: boolean;
  edited_at?: string;
  status: 'sent' | 'delivered' | 'read';
  delivered_at?: string;
  read_at?: string;
  created_at: string;
  sender?: {
    name: string;
    avatar_url?: string;
  };
  reply_to?: EnhancedMessage;
}

interface EnhancedMessagingProps {
  conversationId: string;
  currentUserType: 'analyst' | 'creator';
  onClose?: () => void;
  className?: string;
}

const EnhancedMessaging: React.FC<EnhancedMessagingProps> = ({
  conversationId,
  currentUserType,
  onClose,
  className = ''
}) => {
  const { user } = useAuth();
  const { analyst } = useAnalystAuth();
  const currentUser = user || analyst;

  const {
    updateMessageStatus,
    updatePresence,
    uploadSharedFile
  } = useRealTimeCollaboration({
    enableMessageStatus: true
  });

  const [messages, setMessages] = useState<EnhancedMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<EnhancedMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id (
            name,
            avatar_url
          ),
          reply_to:messages!reply_to_id (
            id,
            content,
            sender_type,
            message_type,
            created_at
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao buscar mensagens:', error);
        return;
      }

      const typedMessages = (data || []).map(msg => ({
        ...msg,
        sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender,
        reply_to: Array.isArray(msg.reply_to) ? msg.reply_to[0] : msg.reply_to
      })) as EnhancedMessage[];

      setMessages(typedMessages);

      // Mark unread messages as read
      const unreadMessages = typedMessages.filter(
        msg => msg.sender_id !== currentUser?.id && msg.status !== 'read'
      );

      for (const msg of unreadMessages) {
        await updateMessageStatus(msg.id, 'read');
      }

    } catch (err) {
      console.error('Erro ao buscar mensagens:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId, currentUser, updateMessageStatus]);

  // Send message
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() && !replyingTo || !currentUser) return;

    setSending(true);

    try {
      const messageData = {
        conversation_id: conversationId,
        sender_id: currentUser.id,
        sender_type: currentUserType,
        content: newMessage.trim(),
        message_type: 'text' as const,
        reply_to_id: replyingTo?.id
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select(`
          *,
          sender:profiles!sender_id (
            name,
            avatar_url
          )
        `)
        .single();

      if (error) {
        console.error('Erro ao enviar mensagem:', error);
        return;
      }

      const newMsg: EnhancedMessage = {
        ...data,
        sender: Array.isArray(data.sender) ? data.sender[0] : data.sender
      };

      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      setReplyingTo(null);

      // Update presence
      updatePresence('online', 'messaging', { conversation_id: conversationId });

    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    } finally {
      setSending(false);
    }
  }, [newMessage, replyingTo, currentUser, conversationId, currentUserType, updatePresence]);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!currentUser) return;

    try {
      setSending(true);

      const uploadedFile = await uploadSharedFile(file, {
        entityType: 'conversation',
        entityId: conversationId,
        accessLevel: 'shared'
      });

      if (!uploadedFile) return;

      const messageData = {
        conversation_id: conversationId,
        sender_id: currentUser.id,
        sender_type: currentUserType,
        content: `Arquivo compartilhado: ${file.name}`,
        message_type: file.type.startsWith('image/') ? 'image' : 
                     file.type.startsWith('video/') ? 'video' : 'file',
        file_url: uploadedFile.file_url,
        file_name: uploadedFile.file_name,
        file_size: uploadedFile.file_size
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select(`
          *,
          sender:profiles!sender_id (
            name,
            avatar_url
          )
        `)
        .single();

      if (error) {
        console.error('Erro ao enviar arquivo:', error);
        return;
      }

      const newMsg: EnhancedMessage = {
        ...data,
        sender: Array.isArray(data.sender) ? data.sender[0] : data.sender
      };

      setMessages(prev => [...prev, newMsg]);

    } catch (err) {
      console.error('Erro ao fazer upload:', err);
    } finally {
      setSending(false);
    }
  };

  // Edit message
  const editMessage = async (messageId: string, newContent: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          content: newContent,
          edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) {
        console.error('Erro ao editar mensagem:', error);
        return;
      }

      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: newContent, edited: true, edited_at: new Date().toISOString() }
          : msg
      ));

      setEditingMessage(null);
    } catch (err) {
      console.error('Erro ao editar mensagem:', err);
    }
  };

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    
    // Auto-resize
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  // Get message status icon
  const getStatusIcon = (message: EnhancedMessage) => {
    if (message.sender_id !== currentUser?.id) return null;

    switch (message.status) {
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      default:
        return <Clock className="h-3 w-3 text-gray-400" />;
    }
  };

  // Format timestamp
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Real-time subscription
  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`enhanced_messages_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMessage = payload.new as EnhancedMessage;
          if (newMessage.sender_id !== currentUser?.id) {
            setMessages(prev => [...prev, newMessage]);
            // Mark as read if window is active
            if (!document.hidden) {
              setTimeout(() => updateMessageStatus(newMessage.id, 'read'), 1000);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const updatedMessage = payload.new as EnhancedMessage;
          setMessages(prev => prev.map(msg => 
            msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUser, fetchMessages, updateMessageStatus]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !sending) {
        e.preventDefault();
        sendMessage();
      }
      if (e.key === 'Escape') {
        setReplyingTo(null);
        setEditingMessage(null);
      }
    };

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('keydown', handleKeyDown);
      return () => textarea.removeEventListener('keydown', handleKeyDown);
    }
  }, [sending, sendMessage]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <MessageCircle className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Conversa</h3>
            <p className="text-sm text-gray-500">{messages.length} mensagens</p>
          </div>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isOwn = message.sender_id === currentUser?.id;
          const isEditing = editingMessage === message.id;

          return (
            <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                isOwn 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                {/* Reply indicator */}
                {message.reply_to && (
                  <div className={`text-xs mb-2 p-2 rounded border-l-2 ${
                    isOwn 
                      ? 'bg-purple-500 border-purple-400 text-purple-100'
                      : 'bg-gray-50 border-gray-300 text-gray-600'
                  }`}>
                    <Reply className="h-3 w-3 inline mr-1" />
                    {message.reply_to.content.substring(0, 50)}...
                  </div>
                )}

                {/* Message content */}
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      defaultValue={message.content}
                      className="w-full p-2 text-sm border rounded resize-none text-gray-900"
                      onBlur={(e) => {
                        if (e.target.value.trim() !== message.content) {
                          editMessage(message.id, e.target.value.trim());
                        } else {
                          setEditingMessage(null);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          const target = e.target as HTMLTextAreaElement;
                          editMessage(message.id, target.value.trim());
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingMessage(null)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* File preview */}
                    {message.message_type === 'image' && message.file_url && (
                      <div className="mb-2">
                        <img
                          src={message.file_url}
                          alt={message.file_name || 'Imagem'}
                          className="max-w-full h-auto rounded"
                        />
                      </div>
                    )}
                    
                    {message.message_type === 'file' && (
                      <div className="flex items-center space-x-2 mb-2">
                        <Paperclip className="h-4 w-4" />
                        <a
                          href={message.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm underline"
                        >
                          {message.file_name}
                        </a>
                      </div>
                    )}

                    <p className="text-sm">{message.content}</p>
                  </div>
                )}

                {/* Message footer */}
                <div className="flex items-center justify-between mt-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className={isOwn ? 'text-purple-100' : 'text-gray-500'}>
                      {formatTime(message.created_at)}
                    </span>
                    {message.edited && (
                      <span className={isOwn ? 'text-purple-200' : 'text-gray-400'}>
                        (editada)
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(message)}
                    
                    {isOwn && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setReplyingTo(message)}
                          className="p-1 hover:bg-purple-500 rounded"
                        >
                          <Reply className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => setEditingMessage(message.id)}
                          className="p-1 hover:bg-purple-500 rounded"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyingTo && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <Reply className="h-4 w-4 inline mr-1" />
              Respondendo: {replyingTo.content.substring(0, 50)}...
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-end space-x-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={handleTextareaChange}
              placeholder="Digite sua mensagem..."
              rows={1}
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={sending}
            />
          </div>

          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFileUpload(file);
          }
        }}
        className="hidden"
        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
      />
    </div>
  );
};

export default EnhancedMessaging;