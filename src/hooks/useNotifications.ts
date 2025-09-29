import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export interface Notification {
  id: string;
  type: 'new_opportunity' | 'new_application' | 'application_approved' | 'application_rejected' | 'new_message' | 'new_deliverable';
  title: string;
  message: string;
  data: {
    conversation_id?: string;
    message_id?: string;
    opportunity_id?: string;
    opportunity_title?: string;
    sender_type?: 'analyst' | 'creator';
    deliverable_id?: string;
    deliverable_title?: string;
    due_date?: string;
    priority?: number;
    company?: string;
    analyst_id?: string;
    [key: string]: unknown;
  };
  read: boolean;
  created_at: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    console.log('🔔 [CREATOR] Fetching notifications for creator:', user.id);

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ [CREATOR] Erro ao buscar notificações:', error);
        setNotifications([]);
        setUnreadCount(0);
      } else {
        console.log('📊 [CREATOR] Notificações encontradas:', data?.length || 0);
        console.log('🔍 [CREATOR] Primeira notificação para debug:', data?.[0]);
        setNotifications(data || []);
        setUnreadCount(data?.filter(n => !n.read).length || 0);
      }
    } catch (err) {
      console.error('❌ [CREATOR] Erro geral ao buscar notificações:', err);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    console.log('📖 [CREATOR] Marking notification as read:', notificationId);

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id); // ✅ Garantir que só modifica notificações do criador

      if (error) {
        console.error('❌ [CREATOR] Erro ao marcar notificação como lida:', error);
      } else {
        console.log('✅ [CREATOR] Notificação marcada como lida');
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('❌ [CREATOR] Erro ao marcar notificação como lida:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    console.log('📖 [CREATOR] Marking all notifications as read for user:', user.id);
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('❌ [CREATOR] Erro ao marcar todas as notificações como lidas:', error);
        return;
      }

      console.log('✅ [CREATOR] Todas as notificações marcadas como lidas');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('❌ [CREATOR] Erro ao marcar todas as notificações como lidas:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();

      // Escutar por novas notificações em tempo real
      console.log('🔔 [CREATOR] Setting up real-time notifications for user:', user.id);
      
      const channel = supabase
        .channel('creator_notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('🔔 [CREATOR] Nova notificação real-time:', payload);
            const newNotification = payload.new as Notification;
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('📝 [CREATOR] Notificação atualizada real-time:', payload);
            const updatedNotification = payload.new as Notification;
            setNotifications(prev => 
              prev.map(n => 
                n.id === updatedNotification.id ? updatedNotification : n
              )
            );
            if (updatedNotification.read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          }
        )
        .subscribe();

      return () => {
        console.log('🔄 [CREATOR] Cleaning up real-time subscription');
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications
  };
};