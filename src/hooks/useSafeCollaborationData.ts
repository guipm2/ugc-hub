import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAnalystAuth } from '../contexts/AnalystAuthContext';

interface SafeActivityItem {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  priority: number;
  activityType?: string;
}

interface SafeOnlineUser {
  id: string;
  name: string;
  status: string;
  activity?: string;
}

export const useSafeCollaborationData = () => {
  // Estados locais seguros
  const [activities, setActivities] = useState<SafeActivityItem[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<SafeOnlineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Usar apenas AnalystAuth context para simplicidade
  const { profile: analyst } = useAnalystAuth();
  
  // Função segura para obter ID do usuário atual
  const getCurrentUserId = useCallback(() => {
    try {
      if (analyst?.id) return analyst.id;
      return null;
    } catch (err) {
      console.warn('Error getting current user ID:', err);
      return null;
    }
  }, [analyst]);

  // Helper function para formatar tempo
  const formatTimeAgo = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

      if (diffInMinutes < 1) return 'Agora mesmo';
      if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h atrás`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d atrás`;
    } catch {
      return 'Recente';
    }
  }, []);

  // Função para buscar atividades
  const fetchActivities = useCallback(async () => {
    const currentUserId = getCurrentUserId();
    
    if (!currentUserId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('activity_feed')
        .select('id, title, description, created_at, read, priority, activity_type')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching activities:', error);
        setError('Erro ao carregar atividades');
        setActivities([]);
        return;
      }

      const realActivities = (data || []).map(item => ({
        id: item.id,
        title: item.title || 'Atividade',
        description: item.description || '',
        time: formatTimeAgo(item.created_at),
        read: Boolean(item.read),
        priority: item.priority || 3,
        activityType: item.activity_type
      }));
      
      setActivities(realActivities);
            
    } catch (err) {
      console.error('Failed to fetch activities:', err);
      setError('Erro ao carregar atividades');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [getCurrentUserId, formatTimeAgo]);

  // Função para buscar usuários online
  const fetchOnlineUsers = useCallback(async () => {
    try {
      // Buscar presenças ativas (últimos 15 minutos) - sem join automático
      const { data: presenceData, error: presenceError } = await supabase
        .from('user_presence')
        .select('user_id, status, current_activity, last_seen')
        .eq('status', 'online')
        .gte('last_seen', new Date(Date.now() - 15 * 60 * 1000).toISOString());

      if (presenceError) {
        console.error('Error fetching online users:', presenceError);
        setOnlineUsers([]);
        return;
      }

      if (presenceData && presenceData.length > 0) {
        // Buscar os perfis separadamente
        const userIds = presenceData.map(p => p.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          setOnlineUsers([]);
          return;
        }

        // Combinar dados de presença com perfis
        const realUsers = presenceData.map(presence => {
          const profile = profilesData?.find(p => p.id === presence.user_id);
          return {
            id: presence.user_id,
            name: profile?.name || profile?.email?.split('@')[0] || `Usuário ${presence.user_id.slice(0, 8)}`,
            status: presence.status,
            activity: presence.current_activity || undefined
          };
        });
        
        setOnlineUsers(realUsers);
              } else {
        setOnlineUsers([]);
        console.log('📝 No users currently online');
      }
      
    } catch (err) {
      console.error('Failed to fetch online users:', err);
      setOnlineUsers([]);
    }
  }, []);

  // Função para marcar como lida
  const markActivityAsRead = useCallback(async (activityId: string) => {
    const currentUserId = getCurrentUserId();
    
    if (!currentUserId) {
      console.warn('No current user, cannot mark as read');
      return;
    }

    // Atualizar estado local imediatamente
    setActivities(prev => prev.map(activity => 
      activity.id === activityId ? { ...activity, read: true } : activity
    ));

    try {
      const { error } = await supabase
        .from('activity_feed')
        .update({ read: true })
        .eq('id', activityId)
        .eq('user_id', currentUserId);

      if (error) {
        console.error('Failed to mark as read:', error);
        // Reverter mudança local em caso de erro
        setActivities(prev => prev.map(activity => 
          activity.id === activityId ? { ...activity, read: false } : activity
        ));
      } else {
              }
    } catch (err) {
      console.error('Error marking as read:', err);
      // Reverter mudança local em caso de erro
      setActivities(prev => prev.map(activity => 
        activity.id === activityId ? { ...activity, read: false } : activity
      ));
    }
  }, [getCurrentUserId]);

  // Função para marcar todas como lidas
  const markAllAsRead = useCallback(async () => {
    const currentUserId = getCurrentUserId();
    
    if (!currentUserId) {
      console.warn('No current user, cannot mark all as read');
      return;
    }

    const unreadActivities = activities.filter(a => !a.read);
    if (unreadActivities.length === 0) {
      console.log('No unread activities to mark');
      return;
    }

    // Atualizar estado local imediatamente
    setActivities(prev => prev.map(activity => ({ ...activity, read: true })));

    try {
      const { error } = await supabase
        .from('activity_feed')
        .update({ read: true })
        .eq('user_id', currentUserId)
        .eq('read', false);

      if (error) {
        console.error('Failed to mark all as read:', error);
        // Reverter mudanças locais
        setActivities(prev => prev.map(activity => {
          const wasUnread = unreadActivities.some(ua => ua.id === activity.id);
          return wasUnread ? { ...activity, read: false } : activity;
        }));
      } else {
              }
    } catch (err) {
      console.error('Error marking all as read:', err);
      // Reverter mudanças locais
      setActivities(prev => prev.map(activity => {
        const wasUnread = unreadActivities.some(ua => ua.id === activity.id);
        return wasUnread ? { ...activity, read: false } : activity;
      }));
    }
  }, [getCurrentUserId, activities]);

  // Inicializar dados na montagem do componente
  useEffect(() => {
    let mounted = true;
    
    const initializeData = async () => {
      if (!mounted) return;
      
      await fetchActivities();
      if (mounted) await fetchOnlineUsers();
    };

    initializeData();

    return () => {
      mounted = false;
    };
  }, [fetchActivities, fetchOnlineUsers]);

  // Real-time subscription para atividades
  useEffect(() => {
    const currentUserId = getCurrentUserId();
    
    if (!currentUserId) return;

    
    const subscription = supabase
      .channel('activity_feed_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'activity_feed',
          filter: `user_id=eq.${currentUserId}`
        }, 
        (payload) => {
                    
          if (payload.eventType === 'INSERT') {
            const newActivity = {
              id: payload.new.id,
              title: payload.new.title || 'Nova Atividade',
              description: payload.new.description || '',
              time: formatTimeAgo(payload.new.created_at),
              read: Boolean(payload.new.read),
              priority: payload.new.priority || 3,
              activityType: payload.new.activity_type
            };
            
            setActivities(prev => [newActivity, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setActivities(prev => prev.map(activity => 
              activity.id === payload.new.id 
                ? {
                    ...activity,
                    title: payload.new.title || activity.title,
                    description: payload.new.description || activity.description,
                    read: Boolean(payload.new.read),
                    priority: payload.new.priority || activity.priority
                  }
                : activity
            ));
          } else if (payload.eventType === 'DELETE') {
            setActivities(prev => prev.filter(activity => activity.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
            subscription.unsubscribe();
    };
  }, [getCurrentUserId, formatTimeAgo]);

  // Calcular estatísticas
  const unreadCount = activities.filter(a => !a.read).length;

  return {
    // Estados
    activities,
    onlineUsers,
    loading,
    error,
    unreadCount,
    
    // Ações
    markActivityAsRead,
    markAllAsRead,
    refetchActivities: fetchActivities,
    refetchOnlineUsers: fetchOnlineUsers
  };
};