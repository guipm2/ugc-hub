import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAnalystAuth } from '../contexts/AnalystAuthContext';

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  priority: number;
  activity_type: string;
  created_at: string;
}

interface OnlineUser {
  id: string;
  name: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  activity?: string;
  last_seen: string;
}

export const useCollaborationData = () => {
  const { user } = useAuth();
  const { profile: analyst } = useAnalystAuth();
  const currentUser = user || analyst;

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch activities from activity_feed table
  const fetchActivities = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('activity_feed')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching activities:', error);
        // Don't set error state for now, use mock data as fallback
        setActivities(getMockActivities());
        return;
      }

      if (data && data.length > 0) {
        const formattedActivities = data.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description || '',
          time: formatTimeAgo(item.created_at),
          read: item.read,
          priority: item.priority,
          activity_type: item.activity_type,
          created_at: item.created_at
        }));
        setActivities(formattedActivities);
      } else {
        // Use mock data if no real data available
        setActivities(getMockActivities());
      }
    } catch (err) {
      console.error('Error in fetchActivities:', err);
      setActivities(getMockActivities());
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  // Fetch online users from user_presence table
  const fetchOnlineUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select(`
          user_id,
          status,
          current_activity,
          last_seen
        `)
        .eq('status', 'online')
        .gte('last_seen', new Date(Date.now() - 15 * 60 * 1000).toISOString()); // Last 15 minutes

      if (error) {
        console.error('Error fetching online users:', error);
        setOnlineUsers(getMockOnlineUsers());
        return;
      }

      if (data && data.length > 0) {
        const formattedUsers = data.map(user => ({
          id: user.user_id,
          name: `Usuário ${user.user_id.slice(0, 8)}...`,
          status: user.status as 'online',
          activity: user.current_activity || 'Online',
          last_seen: user.last_seen
        }));
        setOnlineUsers(formattedUsers);
      } else {
        setOnlineUsers(getMockOnlineUsers());
      }
    } catch (err) {
      console.error('Error in fetchOnlineUsers:', err);
      setOnlineUsers(getMockOnlineUsers());
    }
  }, []);

  // Mark activity as read
  const markActivityAsRead = useCallback(async (activityId: string) => {
    if (!currentUser?.id) return;

    try {
      const { error } = await supabase
        .from('activity_feed')
        .update({ read: true })
        .eq('id', activityId)
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('Error marking activity as read:', error);
        return;
      }

      // Update local state
      setActivities(prev => prev.map(activity => 
        activity.id === activityId ? { ...activity, read: true } : activity
      ));
    } catch (err) {
      console.error('Error in markActivityAsRead:', err);
    }
  }, [currentUser?.id]);

  // Mark all activities as read
  const markAllAsRead = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      const { error } = await supabase
        .from('activity_feed')
        .update({ read: true })
        .eq('user_id', currentUser.id)
        .eq('read', false);

      if (error) {
        console.error('Error marking all as read:', error);
        return;
      }

      // Update local state
      setActivities(prev => prev.map(activity => ({ ...activity, read: true })));
    } catch (err) {
      console.error('Error in markAllAsRead:', err);
    }
  }, [currentUser?.id]);

  // Helper functions
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Agora mesmo';
    if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d atrás`;
  };

  const getMockActivities = (): ActivityItem[] => [
    {
      id: 'mock-1',
      title: 'Novo deliverable criado',
      description: 'Marketing Campaign - Logo Design',
      time: '2 min atrás',
      read: false,
      priority: 2,
      activity_type: 'deliverable_created',
      created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString()
    },
    {
      id: 'mock-2', 
      title: 'Mensagem recebida',
      description: 'Creator enviou uma nova mensagem',
      time: '5 min atrás',
      read: false,
      priority: 3,
      activity_type: 'message_sent',
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
    },
    {
      id: 'mock-3',
      title: 'Projeto atualizado',
      description: 'Status alterado para "Em andamento"',
      time: '1 hora atrás',
      read: true,
      priority: 4,
      activity_type: 'project_updated',
      created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString()
    }
  ];

  const getMockOnlineUsers = (): OnlineUser[] => [
    { 
      id: 'mock-user-1', 
      name: 'João Silva', 
      status: 'online', 
      activity: 'Editando deliverable',
      last_seen: new Date().toISOString()
    },
    { 
      id: 'mock-user-2', 
      name: 'Maria Santos', 
      status: 'online', 
      activity: 'Visualizando projeto',
      last_seen: new Date().toISOString()
    }
  ];

  // Initialize data on mount
  useEffect(() => {
    if (currentUser?.id) {
      fetchActivities();
      fetchOnlineUsers();
    }
  }, [currentUser?.id, fetchActivities, fetchOnlineUsers]);

  const unreadCount = activities.filter(a => !a.read).length;

  return {
    activities,
    onlineUsers,
    loading,
    error,
    unreadCount,
    markActivityAsRead,
    markAllAsRead,
    refetchActivities: fetchActivities,
    refetchOnlineUsers: fetchOnlineUsers
  };
};