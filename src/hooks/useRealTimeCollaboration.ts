import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useAnalystAuth } from '../contexts/AnalystAuthContext';

// Types for real-time collaboration
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

export interface MessageStatus {
  message_id: string;
  status: 'sent' | 'delivered' | 'read';
  delivered_at?: string;
  read_at?: string;
}

export interface CollaborativeSession {
  id: string;
  name: string;
  description?: string;
  session_type: string;
  entity_type?: string;
  entity_id?: string;
  host_id: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  settings: Record<string, unknown>;
  participants: CollaborativeSessionParticipant[];
  created_at: string;
  updated_at: string;
  ends_at?: string;
}

export interface CollaborativeSessionParticipant {
  id: string;
  session_id: string;
  user_id: string;
  role: 'host' | 'moderator' | 'participant' | 'observer';
  permissions: Record<string, boolean>;
  joined_at: string;
  last_activity: string;
  status: 'active' | 'away' | 'disconnected';
  user?: {
    name: string;
    avatar_url?: string;
  };
}

export interface SharedFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  mime_type?: string;
  uploaded_by: string;
  entity_type?: string;
  entity_id?: string;
  access_level: 'private' | 'shared' | 'public';
  permissions: Record<string, boolean>;
  metadata: Record<string, unknown>;
  created_at: string;
  expires_at?: string;
  uploader?: {
    name: string;
    avatar_url?: string;
  };
}

export interface NotificationPreferences {
  email_notifications: Record<string, boolean>;
  push_notifications: Record<string, boolean>;
  in_app_notifications: Record<string, boolean>;
  digest_frequency: 'never' | 'realtime' | 'hourly' | 'daily' | 'weekly';
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone: string;
}

interface UseRealTimeCollaborationOptions {
  enableActivityFeed?: boolean;
  enablePresence?: boolean;
  enableMessageStatus?: boolean;
  activityFeedLimit?: number;
  presenceUpdateInterval?: number;
}

export const useRealTimeCollaboration = (options: UseRealTimeCollaborationOptions = {}) => {
  const {
    enableActivityFeed = true,
    enablePresence = true,
    enableMessageStatus = true,
    activityFeedLimit = 50,
    presenceUpdateInterval = 30000 // 30 seconds
  } = options;

  const { user } = useAuth();
  const { analyst } = useAnalystAuth();
  const currentUser = user || analyst;

  // State management
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);
  const [userPresence, setUserPresence] = useState<Map<string, UserPresence>>(new Map());
  const [messageStatuses, setMessageStatuses] = useState<Map<string, MessageStatus>>(new Map());
  // const [collaborativeSessions, setCollaborativeSessions] = useState<CollaborativeSession[]>([]);
  // const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup
  const channelsRef = useRef<unknown[]>([]);
  const presenceIntervalRef = useRef<NodeJS.Timeout>();

  // ===========================
  // ACTIVITY FEED FUNCTIONS
  // ===========================

  const fetchActivityFeed = useCallback(async () => {
    if (!currentUser || !enableActivityFeed) return;

    try {
      const { data, error } = await supabase
        .from('activity_feed')
        .select(`
          *,
          actor:profiles!actor_id (
            name,
            email,
            avatar_url
          )
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(activityFeedLimit);

      if (error) {
        console.error('Erro ao buscar activity feed:', error);
        setError('Erro ao carregar feed de atividades');
        return;
      }

      setActivityFeed(data || []);
    } catch (err) {
      console.error('Erro ao buscar activity feed:', err);
      setError('Erro ao carregar feed de atividades');
    }
  }, [currentUser, enableActivityFeed, activityFeedLimit]);

  const markActivityAsRead = useCallback(async (activityId: string) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('activity_feed')
        .update({ read: true })
        .eq('id', activityId)
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('Erro ao marcar atividade como lida:', error);
        return;
      }

      setActivityFeed(prev => 
        prev.map(item => 
          item.id === activityId ? { ...item, read: true } : item
        )
      );
    } catch (err) {
      console.error('Erro ao marcar atividade como lida:', err);
    }
  }, [currentUser]);

  const clearActivityFeed = useCallback(async () => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('activity_feed')
        .update({ read: true })
        .eq('user_id', currentUser.id)
        .eq('read', false);

      if (error) {
        console.error('Erro ao limpar activity feed:', error);
        return;
      }

      setActivityFeed(prev => prev.map(item => ({ ...item, read: true })));
    } catch (err) {
      console.error('Erro ao limpar activity feed:', err);
    }
  }, [currentUser]);

  // ===========================
  // USER PRESENCE FUNCTIONS
  // ===========================

  const updatePresence = useCallback(async (
    status: UserPresence['status'] = 'online',
    activity?: string,
    context: Record<string, any> = {}
  ) => {
    if (!currentUser || !enablePresence) return;

    try {
      const { error } = await supabase
        .rpc('update_user_presence', {
          p_user_id: currentUser.id,
          p_status: status,
          p_activity: activity,
          p_context: context
        });

      if (error) {
        console.error('Erro ao atualizar presença:', error);
      }
    } catch (err) {
      console.error('Erro ao atualizar presença:', err);
    }
  }, [currentUser, enablePresence]);

  const fetchPresence = useCallback(async (userIds?: string[]) => {
    if (!currentUser || !enablePresence) return;

    try {
      let query = supabase
        .from('user_presence')
        .select(`
          *,
          user:profiles!user_id (
            name,
            avatar_url
          )
        `);

      if (userIds && userIds.length > 0) {
        query = query.in('user_id', userIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar presença:', error);
        return;
      }

      const presenceMap = new Map();
      data?.forEach(presence => {
        presenceMap.set(presence.user_id, presence);
      });

      setUserPresence(presenceMap);
    } catch (err) {
      console.error('Erro ao buscar presença:', err);
    }
  }, [currentUser, enablePresence]);

  // ===========================
  // MESSAGE STATUS FUNCTIONS
  // ===========================

  const updateMessageStatus = useCallback(async (
    messageId: string,
    status: MessageStatus['status']
  ) => {
    if (!currentUser || !enableMessageStatus) return;

    try {
      const updateData: any = { status };
      
      if (status === 'read') {
        updateData.read_at = new Date().toISOString();
      } else if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('messages')
        .update(updateData)
        .eq('id', messageId);

      if (error) {
        console.error('Erro ao atualizar status da mensagem:', error);
        return;
      }

      setMessageStatuses(prev => new Map(prev.set(messageId, {
        message_id: messageId,
        status,
        delivered_at: status === 'delivered' ? new Date().toISOString() : prev.get(messageId)?.delivered_at,
        read_at: status === 'read' ? new Date().toISOString() : prev.get(messageId)?.read_at
      })));
    } catch (err) {
      console.error('Erro ao atualizar status da mensagem:', err);
    }
  }, [currentUser, enableMessageStatus]);

  // ===========================
  // COLLABORATIVE SESSIONS
  // ===========================

  const createCollaborativeSession = useCallback(async (
    name: string,
    sessionType: string,
    options: {
      description?: string;
      entityType?: string;
      entityId?: string;
      settings?: Record<string, any>;
      endsAt?: string;
      participants?: string[];
    } = {}
  ) => {
    if (!currentUser) return null;

    try {
      const { data: session, error: sessionError } = await supabase
        .from('collaborative_sessions')
        .insert({
          name,
          description: options.description,
          session_type: sessionType,
          entity_type: options.entityType,
          entity_id: options.entityId,
          host_id: currentUser.id,
          settings: options.settings || {},
          ends_at: options.endsAt
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Erro ao criar sessão colaborativa:', sessionError);
        return null;
      }

      // Add host as participant
      await supabase
        .from('collaborative_session_participants')
        .insert({
          session_id: session.id,
          user_id: currentUser.id,
          role: 'host'
        });

      // Add other participants if specified
      if (options.participants && options.participants.length > 0) {
        const participantInserts = options.participants.map(userId => ({
          session_id: session.id,
          user_id: userId,
          role: 'participant'
        }));

        await supabase
          .from('collaborative_session_participants')
          .insert(participantInserts);
      }

      return session.id;
    } catch (err) {
      console.error('Erro ao criar sessão colaborativa:', err);
      return null;
    }
  }, [currentUser]);

  const joinCollaborativeSession = useCallback(async (
    sessionId: string,
    role: CollaborativeSessionParticipant['role'] = 'participant'
  ) => {
    if (!currentUser) return false;

    try {
      const { error } = await supabase
        .from('collaborative_session_participants')
        .upsert({
          session_id: sessionId,
          user_id: currentUser.id,
          role,
          status: 'active',
          last_activity: new Date().toISOString()
        });

      if (error) {
        console.error('Erro ao entrar na sessão colaborativa:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Erro ao entrar na sessão colaborativa:', err);
      return false;
    }
  }, [currentUser]);

  // ===========================
  // FILE SHARING FUNCTIONS
  // ===========================

  const uploadSharedFile = useCallback(async (
    file: File,
    options: {
      entityType?: string;
      entityId?: string;
      accessLevel?: SharedFile['access_level'];
      permissions?: Record<string, boolean>;
      expiresAt?: string;
    } = {}
  ) => {
    if (!currentUser) return null;

    try {
      // Upload file to Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('shared-files')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Erro ao fazer upload do arquivo:', uploadError);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('shared-files')
        .getPublicUrl(fileName);

      // Save file metadata to database
      const { data: fileData, error: fileError } = await supabase
        .from('shared_files')
        .insert({
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type.split('/')[0], // 'image', 'video', etc
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: currentUser.id,
          entity_type: options.entityType,
          entity_id: options.entityId,
          access_level: options.accessLevel || 'shared',
          permissions: options.permissions || { can_download: true },
          expires_at: options.expiresAt
        })
        .select()
        .single();

      if (fileError) {
        console.error('Erro ao salvar metadata do arquivo:', fileError);
        return null;
      }

      return fileData;
    } catch (err) {
      console.error('Erro ao fazer upload de arquivo compartilhado:', err);
      return null;
    }
  }, [currentUser]);

  // ===========================
  // NOTIFICATION PREFERENCES
  // ===========================

  const updateNotificationPreferences = useCallback(async (
    preferences: Partial<NotificationPreferences>
  ) => {
    if (!currentUser) return false;

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: currentUser.id,
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Erro ao atualizar preferências de notificação:', error);
        return false;
      }

      setNotificationPreferences(prev => ({ ...prev, ...preferences } as NotificationPreferences));
      return true;
    } catch (err) {
      console.error('Erro ao atualizar preferências de notificação:', err);
      return false;
    }
  }, [currentUser]);

  // ===========================
  // REAL-TIME SUBSCRIPTIONS
  // ===========================

  useEffect(() => {
    if (!currentUser) return;

    const channels: any[] = [];

    // Subscribe to activity feed updates
    if (enableActivityFeed) {
      const activityChannel = supabase
        .channel(`activity_feed_${currentUser.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'activity_feed',
            filter: `user_id=eq.${currentUser.id}`
          },
          (payload) => {
            const newActivity = payload.new as ActivityFeedItem;
            setActivityFeed(prev => [newActivity, ...prev.slice(0, activityFeedLimit - 1)]);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'activity_feed',
            filter: `user_id=eq.${currentUser.id}`
          },
          (payload) => {
            const updatedActivity = payload.new as ActivityFeedItem;
            setActivityFeed(prev => 
              prev.map(item => 
                item.id === updatedActivity.id ? updatedActivity : item
              )
            );
          }
        )
        .subscribe();

      channels.push(activityChannel);
    }

    // Subscribe to presence updates
    if (enablePresence) {
      const presenceChannel = supabase
        .channel('user_presence')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_presence'
          },
          (payload) => {
            const presence = payload.new as UserPresence;
            if (presence) {
              setUserPresence(prev => new Map(prev.set(presence.user_id, presence)));
            }
          }
        )
        .subscribe();

      channels.push(presenceChannel);
    }

    // Subscribe to message status updates
    if (enableMessageStatus) {
      const messageStatusChannel = supabase
        .channel(`message_status_${currentUser.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages'
          },
          (payload) => {
            const message = payload.new as any;
            if (message.sender_id === currentUser.id) {
              setMessageStatuses(prev => new Map(prev.set(message.id, {
                message_id: message.id,
                status: message.status,
                delivered_at: message.delivered_at,
                read_at: message.read_at
              })));
            }
          }
        )
        .subscribe();

      channels.push(messageStatusChannel);
    }

    channelsRef.current = channels;

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [currentUser, enableActivityFeed, enablePresence, enableMessageStatus, activityFeedLimit]);

  // ===========================
  // PRESENCE HEARTBEAT
  // ===========================

  useEffect(() => {
    if (!currentUser || !enablePresence) return;

    // Initial presence update
    updatePresence('online');

    // Set up periodic presence updates
    const interval = setInterval(() => {
      updatePresence('online');
    }, presenceUpdateInterval);

    presenceIntervalRef.current = interval;

    // Update presence on page visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence('away');
      } else {
        updatePresence('online');
      }
    };

    // Update presence on beforeunload
    const handleBeforeUnload = () => {
      updatePresence('offline');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
      updatePresence('offline');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser, enablePresence, presenceUpdateInterval, updatePresence]);

  // ===========================
  // INITIAL DATA LOADING
  // ===========================

  useEffect(() => {
    if (!currentUser) return;

    const loadInitialData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Load data in parallel
        const promises = [];

        if (enableActivityFeed) {
          promises.push(fetchActivityFeed());
        }

        if (enablePresence) {
          promises.push(fetchPresence());
        }

        // Load notification preferences
        promises.push(
          supabase
            .from('notification_preferences')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle()
            .then(({ data }) => {
              if (data) {
                setNotificationPreferences(data);
              }
            })
        );

        await Promise.all(promises);
      } catch (err) {
        console.error('Erro ao carregar dados iniciais:', err);
        setError('Erro ao carregar dados de colaboração');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [currentUser, enableActivityFeed, enablePresence, fetchActivityFeed, fetchPresence]);

  // ===========================
  // UTILITY FUNCTIONS
  // ===========================

  const getUnreadActivityCount = useCallback(() => {
    return activityFeed.filter(item => !item.read).length;
  }, [activityFeed]);

  const getHighPriorityActivities = useCallback(() => {
    return activityFeed.filter(item => !item.read && item.priority <= 2);
  }, [activityFeed]);

  const getOnlineUsers = useCallback(() => {
    const onlineUsers: UserPresence[] = [];
    userPresence.forEach(presence => {
      if (presence.status === 'online') {
        onlineUsers.push(presence);
      }
    });
    return onlineUsers;
  }, [userPresence]);

  const getUserPresence = useCallback((userId: string) => {
    return userPresence.get(userId);
  }, [userPresence]);

  return {
    // State
    activityFeed,
    userPresence: userPresence,
    messageStatuses,
    // collaborativeSessions,
    // sharedFiles,
    notificationPreferences,
    loading,
    error,

    // Activity Feed
    markActivityAsRead,
    clearActivityFeed,
    getUnreadActivityCount,
    getHighPriorityActivities,

    // Presence
    updatePresence,
    fetchPresence,
    getOnlineUsers,
    getUserPresence,

    // Message Status
    updateMessageStatus,

    // Collaborative Sessions
    createCollaborativeSession,
    joinCollaborativeSession,

    // File Sharing
    uploadSharedFile,

    // Notification Preferences
    updateNotificationPreferences,

    // Utility
    refetch: () => {
      if (enableActivityFeed) fetchActivityFeed();
      if (enablePresence) fetchPresence();
    }
  };
};