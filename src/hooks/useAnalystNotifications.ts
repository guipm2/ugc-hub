import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAnalystAuth } from '../contexts/AnalystAuthContext';

export interface AnalystNotification {
  id: string;
  type: 'new_opportunity' | 'new_application' | 'application_approved' | 'application_rejected';
  title: string;
  message: string;
  data: any;
  read: boolean;
  created_at: string;
}

export const useAnalystNotifications = () => {
  const [notifications, setNotifications] = useState<AnalystNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAnalystAuth();

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Erro ao buscar notificações:', error);
      } else {
        setNotifications(data || []);
        setUnreadCount(data?.filter(n => !n.read).length || 0);
      }
    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.rpc('mark_notification_as_read', {
        notification_id: notificationId
      });

      if (error) {
        console.error('Erro ao marcar notificação como lida:', error);
      } else {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Erro ao marcar notificação como lida:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();

      // Escutar por novas notificações em tempo real
      const channel = supabase
        .channel('analyst_notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const newNotification = payload.new as AnalystNotification;
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    refetch: fetchNotifications
  };
};