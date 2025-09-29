import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useAnalystAuth } from '../contexts/AnalystAuthContext';

// Simplified types for collaboration
interface ActivityFeedItem {
  id: string;
  user_id: string;
  actor_id: string;
  activity_type: string;
  title: string;
  description?: string;
  metadata: Record<string, unknown>;
  entity_type?: string;
  entity_id?: string;
  read: boolean;
  priority: number;
  created_at: string;
}

interface UserPresence {
  user_id: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  last_seen: string;
  current_activity?: string;
  activity_context: Record<string, unknown>;
  updated_at: string;
}

interface UseRealTimeCollaborationOptions {
  enableActivityFeed?: boolean;
  enablePresence?: boolean;
  enableMessageStatus?: boolean;
  activityFeedLimit?: number;
}

export const useRealTimeCollaboration = (options: UseRealTimeCollaborationOptions = {}) => {
  const { user } = useAuth();
  const { profile: analystProfile } = useAnalystAuth();
  
  // Current user - can be either creator or analyst
  const currentUser = user || analystProfile;
  const currentUserId = currentUser?.id;

  // Simplified state management
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);
  const [userPresence, setUserPresence] = useState<Map<string, UserPresence>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===========================
  // ACTIVITY FEED FUNCTIONS
  // ===========================

  const fetchActivityFeed = useCallback(async () => {
    if (!currentUserId || !options.enableActivityFeed) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('activity_feed')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(options.activityFeedLimit || 20);

      if (error) {
        console.error('Error fetching activity feed:', error);
        setError('Erro ao carregar feed de atividades');
        return;
      }

      setActivityFeed(data || []);
    } catch (err) {
      console.error('Error in fetchActivityFeed:', err);
      setError('Erro ao carregar feed de atividades');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, options.enableActivityFeed, options.activityFeedLimit]);

  const markActivityAsRead = useCallback(async (activityId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from('activity_feed')
        .update({ read: true })
        .eq('id', activityId)
        .eq('user_id', currentUserId);

      if (error) {
        console.error('Error marking activity as read:', error);
        return;
      }

      // Update local state
      setActivityFeed(prev => prev.map(item => 
        item.id === activityId ? { ...item, read: true } : item
      ));
    } catch (err) {
      console.error('Error in markActivityAsRead:', err);
    }
  }, [currentUserId]);

  const getUnreadActivityCount = useCallback(() => {
    return activityFeed.filter(item => !item.read).length;
  }, [activityFeed]);

  const getHighPriorityActivities = useCallback(() => {
    return activityFeed.filter(item => item.priority <= 2);
  }, [activityFeed]);

  const clearActivityFeed = useCallback(() => {
    setActivityFeed([]);
  }, []);

  // ===========================
  // PRESENCE FUNCTIONS
  // ===========================

  const updatePresence = useCallback(async (
    status: UserPresence['status'] = 'online',
    activity?: string,
    context: Record<string, unknown> = {}
  ) => {
    if (!currentUserId || !options.enablePresence) return;

    try {
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: currentUserId,
          status,
          current_activity: activity,
          activity_context: context,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error updating presence:', error);
      }
    } catch (err) {
      console.error('Error in updatePresence:', err);
    }
  }, [currentUserId, options.enablePresence]);

  const fetchPresence = useCallback(async () => {
    if (!options.enablePresence) return;

    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('*')
        .gte('last_seen', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      if (error) {
        console.error('Error fetching presence:', error);
        return;
      }

      const presenceMap = new Map();
      data?.forEach(presence => {
        presenceMap.set(presence.user_id, presence);
      });
      
      setUserPresence(presenceMap);
    } catch (err) {
      console.error('Error in fetchPresence:', err);
    }
  }, [options.enablePresence]);

  const getOnlineUsers = useCallback(() => {
    const onlineUsers: UserPresence[] = [];
    userPresence.forEach(presence => {
      if (presence.status === 'online') {
        onlineUsers.push(presence);
      }
    });
    return onlineUsers;
  }, [userPresence]);

  // ===========================
  // PLACEHOLDER FUNCTIONS
  // ===========================
  
  // These are placeholder functions for features that will be implemented later
  const createCollaborativeSession = useCallback(async () => {
    console.log('createCollaborativeSession: Not implemented yet');
    return null;
  }, []);

  const joinCollaborativeSession = useCallback(async () => {
    console.log('joinCollaborativeSession: Not implemented yet');
    return false;
  }, []);

  const leaveCollaborativeSession = useCallback(async () => {
    console.log('leaveCollaborativeSession: Not implemented yet');
    return false;
  }, []);

  const uploadSharedFile = useCallback(async () => {
    console.log('uploadSharedFile: Not implemented yet');
    return null;
  }, []);

  const updateNotificationPreferences = useCallback(async () => {
    console.log('updateNotificationPreferences: Not implemented yet');
    return false;
  }, []);

  // ===========================
  // INITIALIZATION
  // ===========================

  useEffect(() => {
    if (!currentUserId) return;

    // Set user as online when hook initializes
    if (options.enablePresence) {
      updatePresence('online');
    }

    // Fetch initial data
    if (options.enableActivityFeed) {
      fetchActivityFeed();
    }
    
    if (options.enablePresence) {
      fetchPresence();
    }

    // Cleanup function to set user offline
    return () => {
      if (options.enablePresence && currentUserId) {
        // Set user offline when component unmounts
        supabase
          .from('user_presence')
          .upsert({
            user_id: currentUserId,
            status: 'offline',
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .then(() => {
            console.log('User set to offline');
          });
      }
    };
  }, [currentUserId, options.enableActivityFeed, options.enablePresence, fetchActivityFeed, fetchPresence, updatePresence]);

  // ===========================
  // RETURN INTERFACE
  // ===========================

  return {
    // State
    activityFeed,
    userPresence: userPresence,
    loading,
    error,

    // Activity Feed
    markActivityAsRead,
    clearActivityFeed,
    getUnreadActivityCount,
    getHighPriorityActivities,
    fetchActivityFeed,

    // Presence
    updatePresence,
    fetchPresence,
    getOnlineUsers,

    // Placeholder functions (not implemented yet)
    createCollaborativeSession,
    joinCollaborativeSession,
    leaveCollaborativeSession,
    uploadSharedFile,
    updateNotificationPreferences,
    
    // Placeholder state (will be implemented later)
    notificationPreferences: null
  };
};

export default useRealTimeCollaboration;