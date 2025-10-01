import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAnalystAuth } from '../contexts/AnalystAuthContext';

export interface AnalystNotification {
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

export const useAnalystNotifications = () => {
  const [notifications, setNotifications] = useState<AnalystNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAnalystAuth();

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id) // ✅ Usar user_id temporariamente até migration ser aplicada
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ Erro ao buscar notificações:', error);
        setNotifications([]);
        setUnreadCount(0);
      } else {
                setNotifications(data || []);
        setUnreadCount(data?.filter(n => !n.read).length || 0);
      }
    } catch (err) {
      console.error('❌ Erro geral ao buscar notificações:', err);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('analyst_id', user.id); // ✅ Garantir que só modifica notificações do analista

      if (error) {
        console.error('❌ Erro ao marcar notificação como lida:', error);
      } else {
                // Atualizar estado local
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('❌ Erro geral ao marcar notificação:', err);
    }
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('analyst_id', user.id) // ✅ Só marcar notificações do analista
        .eq('read', false);

      if (error) {
        console.error('❌ Erro ao marcar todas as notificações como lidas:', error);
      } else {
                // Atualizar estado local
        setNotifications(prev => 
          prev.map(n => ({ ...n, read: true }))
        );
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('❌ Erro geral ao marcar todas as notificações:', err);
    }
  }, [user]);

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
            filter: `analyst_id=eq.${user.id}` // ✅ Corrigido: analyst_id ao invés de user_id
          },
          (payload) => {
                        const newNotification = payload.new as AnalystNotification;
            setNotifications(prev => [newNotification, ...prev]);
            if (!newNotification.read) {
              setUnreadCount(prev => prev + 1);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `analyst_id=eq.${user.id}` // ✅ Filtro para updates também
          },
          (payload) => {
                        const updatedNotification = payload.new as AnalystNotification;
            setNotifications(prev => 
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            );
            
            // Atualizar contador se mudou de não lida para lida
            if (payload.old && !(payload.old as AnalystNotification).read && updatedNotification.read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          }
        )
        .subscribe();

      return () => {
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