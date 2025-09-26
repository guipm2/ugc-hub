-- Migração para Enhanced Real-time Collaboration System
-- Data: 2025-09-26
-- Prioridade: Alta #3

/*
  # Enhanced Real-time Collaboration System

  Este sistema adiciona recursos avançados de colaboração em tempo real:
  
  1. **Message Status Tracking** - rastreamento de status de mensagens (enviado, entregue, lido)
  2. **Activity Feed** - feed de atividades para monitorar ações em tempo real
  3. **Collaborative Sessions** - sessões colaborativas para trabalhar em deliverables
  4. **Enhanced Notifications** - sistema de notificações mais inteligente
  5. **Real-time Presence** - indicadores de presença online
  6. **File Sharing** - sistema aprimorado de compartilhamento de arquivos
*/

-- =====================================
-- 1. MESSAGE STATUS TRACKING
-- =====================================

-- Add message status fields
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read'));
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'video', 'audio', 'system'));
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- =====================================
-- 2. ACTIVITY FEED SYSTEM
-- =====================================

-- Create activity feed table
CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'message_sent',
    'deliverable_created',
    'deliverable_updated', 
    'deliverable_submitted',
    'deliverable_approved',
    'deliverable_rejected',
    'file_uploaded',
    'comment_added',
    'project_updated',
    'deadline_reminder',
    'milestone_completed',
    'collaboration_started',
    'review_requested',
    'feedback_provided'
  )),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  entity_type TEXT, -- 'opportunity', 'deliverable', 'message', 'project'
  entity_id UUID,
  read BOOLEAN DEFAULT FALSE,
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5), -- 1=highest, 5=lowest
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for activity_feed
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_id ON activity_feed (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON activity_feed (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_entity ON activity_feed (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_unread ON activity_feed (user_id, read) WHERE read = FALSE;

-- Enable RLS
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity feed
CREATE POLICY "Users can view their own activity feed" ON activity_feed
  FOR SELECT 
  TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "System can insert activity feed items" ON activity_feed
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true); -- Will be controlled by functions

-- =====================================
-- 3. REAL-TIME PRESENCE SYSTEM
-- =====================================

-- Create presence table
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  current_activity TEXT, -- 'viewing_project', 'editing_deliverable', 'messaging'
  activity_context JSONB DEFAULT '{}', -- context like project_id, conversation_id
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for presence
CREATE POLICY "Users can view all presence data" ON user_presence
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can update their own presence" ON user_presence
  FOR ALL 
  TO authenticated 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================
-- 4. COLLABORATIVE SESSIONS
-- =====================================

-- Create collaborative sessions table
CREATE TABLE IF NOT EXISTS collaborative_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  session_type TEXT DEFAULT 'deliverable_review' CHECK (session_type IN (
    'deliverable_review',
    'brainstorming', 
    'feedback_session',
    'planning_meeting',
    'file_review',
    'general'
  )),
  entity_type TEXT, -- 'deliverable', 'opportunity', 'project'
  entity_id UUID,
  host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  settings JSONB DEFAULT '{}', -- session settings like permissions, features
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ
);

-- Create indexes for collaborative_sessions
CREATE INDEX IF NOT EXISTS idx_collaborative_sessions_entity ON collaborative_sessions (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_collaborative_sessions_host ON collaborative_sessions (host_id);
CREATE INDEX IF NOT EXISTS idx_collaborative_sessions_status ON collaborative_sessions (status);

-- Collaborative session participants
CREATE TABLE IF NOT EXISTS collaborative_session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES collaborative_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'participant' CHECK (role IN ('host', 'moderator', 'participant', 'observer')),
  permissions JSONB DEFAULT '{"can_edit": false, "can_comment": true, "can_share_screen": false}',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'away', 'disconnected')),
  
  UNIQUE(session_id, user_id)
);

-- Enable RLS for collaborative sessions
ALTER TABLE collaborative_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_session_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view sessions they participate in" ON collaborative_sessions
  FOR SELECT 
  TO authenticated 
  USING (
    id IN (
      SELECT session_id FROM collaborative_session_participants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can manage their sessions" ON collaborative_sessions
  FOR ALL 
  TO authenticated 
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "Users can view their participation" ON collaborative_session_participants
  FOR SELECT 
  TO authenticated 
  USING (user_id = auth.uid() OR session_id IN (
    SELECT id FROM collaborative_sessions WHERE host_id = auth.uid()
  ));

-- =====================================
-- 5. ENHANCED FILE SHARING
-- =====================================

-- Create shared files table
CREATE TABLE IF NOT EXISTS shared_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type TEXT, -- 'conversation', 'deliverable', 'session', 'project'
  entity_id UUID,
  access_level TEXT DEFAULT 'private' CHECK (access_level IN ('private', 'shared', 'public')),
  permissions JSONB DEFAULT '{"can_download": true, "can_delete": false, "can_share": false}',
  metadata JSONB DEFAULT '{}', -- file metadata like dimensions, duration, etc
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Create indexes for shared_files
CREATE INDEX IF NOT EXISTS idx_shared_files_entity ON shared_files (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_shared_files_uploader ON shared_files (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_shared_files_created ON shared_files (created_at DESC);

-- File access log
CREATE TABLE IF NOT EXISTS file_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES shared_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('view', 'download', 'share', 'delete')),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for file_access_log
CREATE INDEX IF NOT EXISTS idx_file_access_log_file ON file_access_log (file_id);
CREATE INDEX IF NOT EXISTS idx_file_access_log_user ON file_access_log (user_id);
CREATE INDEX IF NOT EXISTS idx_file_access_log_action ON file_access_log (action);

-- Enable RLS
ALTER TABLE shared_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_access_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shared files
CREATE POLICY "Users can view files they have access to" ON shared_files
  FOR SELECT 
  TO authenticated 
  USING (
    uploaded_by = auth.uid() OR
    access_level = 'public' OR
    (access_level = 'shared' AND (
      -- Check if user has access based on entity context
      CASE 
        WHEN entity_type = 'conversation' THEN
          entity_id IN (
            SELECT id FROM conversations 
            WHERE analyst_id = auth.uid() OR creator_id = auth.uid()
          )
        WHEN entity_type = 'deliverable' THEN
          entity_id IN (
            SELECT pd.id FROM project_deliverables pd
            JOIN opportunity_applications oa ON pd.application_id = oa.id
            WHERE pd.analyst_id = auth.uid() OR oa.creator_id = auth.uid()
          )
        ELSE true
      END
    ))
  );

CREATE POLICY "Users can upload files" ON shared_files
  FOR INSERT 
  TO authenticated 
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "File owners can manage their files" ON shared_files
  FOR ALL 
  TO authenticated 
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

-- =====================================
-- 6. FUNCTIONS FOR REAL-TIME COLLABORATION
-- =====================================

-- Function to update message status
CREATE OR REPLACE FUNCTION update_message_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-mark as delivered when message is created
  IF TG_OP = 'INSERT' THEN
    NEW.status = 'sent';
    NEW.delivered_at = NOW();
    RETURN NEW;
  END IF;
  
  -- Update read status
  IF TG_OP = 'UPDATE' AND OLD.status != 'read' AND NEW.status = 'read' THEN
    NEW.read_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for message status
DROP TRIGGER IF EXISTS trigger_update_message_status ON messages;
CREATE TRIGGER trigger_update_message_status
  BEFORE INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_message_status();

-- Function to create activity feed entry
CREATE OR REPLACE FUNCTION create_activity_feed_entry(
  p_user_id UUID,
  p_actor_id UUID,
  p_activity_type TEXT,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_priority INTEGER DEFAULT 3
)
RETURNS UUID AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO activity_feed (
    user_id,
    actor_id,
    activity_type,
    title,
    description,
    entity_type,
    entity_id,
    metadata,
    priority
  ) VALUES (
    p_user_id,
    p_actor_id,
    p_activity_type,
    p_title,
    p_description,
    p_entity_type,
    p_entity_id,
    p_metadata,
    p_priority
  ) RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user presence
CREATE OR REPLACE FUNCTION update_user_presence(
  p_user_id UUID,
  p_status TEXT DEFAULT 'online',
  p_activity TEXT DEFAULT NULL,
  p_context JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_presence (
    user_id,
    status,
    current_activity,
    activity_context,
    last_seen,
    updated_at
  ) VALUES (
    p_user_id,
    p_status,
    p_activity,
    p_context,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    status = EXCLUDED.status,
    current_activity = EXCLUDED.current_activity,
    activity_context = EXCLUDED.activity_context,
    last_seen = EXCLUDED.last_seen,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create activity when messages are sent
CREATE OR REPLACE FUNCTION create_message_activity()
RETURNS TRIGGER AS $$
DECLARE
  conversation_record RECORD;
  recipient_id UUID;
  actor_name TEXT;
BEGIN
  -- Get conversation details
  SELECT c.*, o.title as opportunity_title
  INTO conversation_record
  FROM conversations c
  LEFT JOIN opportunities o ON c.opportunity_id = o.id
  WHERE c.id = NEW.conversation_id;
  
  -- Determine recipient
  IF NEW.sender_type = 'analyst' THEN
    recipient_id := conversation_record.creator_id;
    SELECT name INTO actor_name FROM analysts WHERE id = NEW.sender_id;
  ELSE
    recipient_id := conversation_record.analyst_id;
    SELECT name INTO actor_name FROM profiles WHERE id = NEW.sender_id;
  END IF;
  
  -- Create activity feed entry
  PERFORM create_activity_feed_entry(
    recipient_id,
    NEW.sender_id,
    'message_sent',
    'Nova mensagem de ' || COALESCE(actor_name, 'Usuário'),
    LEFT(NEW.content, 100),
    'conversation',
    NEW.conversation_id,
    jsonb_build_object(
      'message_id', NEW.id,
      'opportunity_title', conversation_record.opportunity_title,
      'sender_type', NEW.sender_type,
      'message_type', NEW.message_type
    ),
    CASE 
      WHEN NEW.message_type = 'system' THEN 4
      ELSE 3
    END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for message activity
DROP TRIGGER IF EXISTS trigger_create_message_activity ON messages;
CREATE TRIGGER trigger_create_message_activity
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_activity();

-- Function to create activity when deliverables are updated
CREATE OR REPLACE FUNCTION create_deliverable_activity()
RETURNS TRIGGER AS $$
DECLARE
  application_record RECORD;
  deliverable_title TEXT;
  activity_title TEXT;
  activity_desc TEXT;
  recipient_id UUID;
  actor_id UUID;
  actor_name TEXT;
BEGIN
  -- Get deliverable and application info
  SELECT 
    oa.*,
    o.title as opportunity_title,
    o.created_by as analyst_id
  INTO application_record
  FROM opportunity_applications oa
  JOIN opportunities o ON oa.opportunity_id = o.id
  WHERE oa.id = COALESCE(NEW.application_id, OLD.application_id);
  
  deliverable_title := COALESCE(NEW.title, OLD.title);
  
  -- Handle different trigger events
  IF TG_OP = 'INSERT' THEN
    activity_title := 'Novo deliverable: ' || deliverable_title;
    activity_desc := 'Um novo deliverable foi criado para o projeto';
    recipient_id := application_record.creator_id;
    actor_id := NEW.analyst_id;
    SELECT name INTO actor_name FROM analysts WHERE id = actor_id;
    
    PERFORM create_activity_feed_entry(
      recipient_id,
      actor_id,
      'deliverable_created',
      activity_title,
      activity_desc,
      'deliverable',
      NEW.id,
      jsonb_build_object(
        'opportunity_title', application_record.opportunity_title,
        'deliverable_title', deliverable_title,
        'due_date', NEW.due_date,
        'priority', NEW.priority
      ),
      2
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes
    IF OLD.status != NEW.status THEN
      CASE NEW.status
        WHEN 'submitted' THEN
          activity_title := 'Deliverable enviado: ' || deliverable_title;
          activity_desc := 'O creator enviou o deliverable para revisão';
          recipient_id := application_record.analyst_id;
          actor_id := application_record.creator_id;
          SELECT name INTO actor_name FROM profiles WHERE id = actor_id;
          
          PERFORM create_activity_feed_entry(
            recipient_id,
            actor_id,
            'deliverable_submitted',
            activity_title,
            activity_desc,
            'deliverable',
            NEW.id,
            jsonb_build_object(
              'opportunity_title', application_record.opportunity_title,
              'deliverable_title', deliverable_title
            ),
            2
          );
          
        WHEN 'approved' THEN
          activity_title := 'Deliverable aprovado: ' || deliverable_title;
          activity_desc := 'Seu deliverable foi aprovado!';
          recipient_id := application_record.creator_id;
          actor_id := application_record.analyst_id;
          SELECT name INTO actor_name FROM analysts WHERE id = actor_id;
          
          PERFORM create_activity_feed_entry(
            recipient_id,
            actor_id,
            'deliverable_approved',
            activity_title,
            activity_desc,
            'deliverable',
            NEW.id,
            jsonb_build_object(
              'opportunity_title', application_record.opportunity_title,
              'deliverable_title', deliverable_title
            ),
            1
          );
          
        WHEN 'rejected' THEN
          activity_title := 'Deliverable precisa de revisão: ' || deliverable_title;
          activity_desc := 'O deliverable foi rejeitado e precisa de ajustes';
          recipient_id := application_record.creator_id;
          actor_id := application_record.analyst_id;
          SELECT name INTO actor_name FROM analysts WHERE id = actor_id;
          
          PERFORM create_activity_feed_entry(
            recipient_id,
            actor_id,
            'deliverable_rejected',
            activity_title,
            activity_desc,
            'deliverable',
            NEW.id,
            jsonb_build_object(
              'opportunity_title', application_record.opportunity_title,
              'deliverable_title', deliverable_title,
              'feedback', NEW.feedback
            ),
            1
          );
      END CASE;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for deliverable activity
DROP TRIGGER IF EXISTS trigger_create_deliverable_activity ON project_deliverables;
CREATE TRIGGER trigger_create_deliverable_activity
  AFTER INSERT OR UPDATE ON project_deliverables
  FOR EACH ROW
  EXECUTE FUNCTION create_deliverable_activity();

-- =====================================
-- 7. ENHANCED NOTIFICATION SYSTEM
-- =====================================

-- Add priority and category to existing notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general' CHECK (category IN ('message', 'deliverable', 'project', 'system', 'collaboration', 'deadline', 'general'));
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS grouped_with UUID REFERENCES notifications(id);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  email_notifications JSONB DEFAULT '{
    "new_message": true,
    "deliverable_updates": true,
    "deadline_reminders": true,
    "project_updates": true,
    "collaboration_invites": true
  }',
  push_notifications JSONB DEFAULT '{
    "new_message": true,
    "deliverable_updates": true,
    "deadline_reminders": true,
    "urgent_only": false
  }',
  in_app_notifications JSONB DEFAULT '{
    "all": true,
    "sound_enabled": true,
    "desktop_notifications": true
  }',
  digest_frequency TEXT DEFAULT 'daily' CHECK (digest_frequency IN ('never', 'realtime', 'hourly', 'daily', 'weekly')),
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone TEXT DEFAULT 'UTC',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can manage their own notification preferences" ON notification_preferences
  FOR ALL 
  TO authenticated 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to create smart notifications
CREATE OR REPLACE FUNCTION create_smart_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}',
  p_priority INTEGER DEFAULT 3,
  p_category TEXT DEFAULT 'general'
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
  user_preferences RECORD;
  should_create BOOLEAN := true;
BEGIN
  -- Get user preferences
  SELECT * INTO user_preferences
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  -- Check if user wants this type of notification
  IF user_preferences.in_app_notifications IS NOT NULL THEN
    should_create := COALESCE(
      (user_preferences.in_app_notifications ->> 'all')::boolean,
      true
    );
  END IF;
  
  -- Create notification if allowed
  IF should_create THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      priority,
      category,
      action_url
    ) VALUES (
      p_user_id,
      p_type,
      p_title,
      p_message,
      p_data,
      p_priority,
      p_category,
      p_data ->> 'action_url'
    ) RETURNING id INTO notification_id;
  END IF;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================
-- 8. ANALYTICS AND INSIGHTS
-- =====================================

-- Create collaboration analytics table
CREATE TABLE IF NOT EXISTS collaboration_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analyst_id UUID REFERENCES analysts(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK (metric_type IN (
    'message_count',
    'response_time',
    'collaboration_score',
    'file_shares',
    'session_duration',
    'project_completion_rate'
  )),
  metric_value NUMERIC NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for collaboration_analytics
CREATE INDEX IF NOT EXISTS idx_collaboration_analytics_period ON collaboration_analytics (period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_collaboration_analytics_analyst ON collaboration_analytics (analyst_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_analytics_creator ON collaboration_analytics (creator_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_analytics_metric ON collaboration_analytics (metric_type);

-- Enable RLS
ALTER TABLE collaboration_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Analysts can view their collaboration analytics" ON collaboration_analytics
  FOR SELECT 
  TO authenticated 
  USING (analyst_id = auth.uid());

CREATE POLICY "Creators can view their collaboration analytics" ON collaboration_analytics
  FOR SELECT 
  TO authenticated 
  USING (creator_id = auth.uid());

-- =====================================
-- 9. CLEANUP AND MAINTENANCE
-- =====================================

-- Function to cleanup old activities and notifications
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS VOID AS $$
BEGIN
  -- Delete old activity feed items (older than 90 days)
  DELETE FROM activity_feed
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND read = true;
  
  -- Delete old read notifications (older than 30 days)
  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND read = true;
  
  -- Delete old file access logs (older than 1 year)
  DELETE FROM file_access_log
  WHERE created_at < NOW() - INTERVAL '1 year';
  
  -- Clean up expired files
  DELETE FROM shared_files
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW();
    
  -- Update offline users (inactive for more than 15 minutes)
  UPDATE user_presence
  SET status = 'offline'
  WHERE status != 'offline'
    AND last_seen < NOW() - INTERVAL '15 minutes';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup function (to be called by a cron job or background task)
-- This will be called from the application layer

COMMENT ON FUNCTION cleanup_old_data() IS 'Função para limpeza de dados antigos do sistema de colaboração. Deve ser executada periodicamente.';

-- =====================================
-- 10. FINAL COMMENTS AND DOCUMENTATION
-- =====================================

COMMENT ON TABLE activity_feed IS 'Feed de atividades em tempo real para monitorar ações importantes no sistema';
COMMENT ON TABLE user_presence IS 'Sistema de presença em tempo real para mostrar status dos usuários';
COMMENT ON TABLE collaborative_sessions IS 'Sessões colaborativas para trabalho conjunto em deliverables e projetos';
COMMENT ON TABLE shared_files IS 'Sistema aprimorado de compartilhamento de arquivos com controle de acesso';
COMMENT ON TABLE collaboration_analytics IS 'Métricas e analytics sobre colaboração entre analistas e creators';
COMMENT ON TABLE notification_preferences IS 'Preferências personalizadas de notificações para cada usuário';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Enhanced Real-time Collaboration System instalado com sucesso!';
  RAISE NOTICE 'Recursos disponíveis:';
  RAISE NOTICE '- ✅ Message Status Tracking (enviado/entregue/lido)';
  RAISE NOTICE '- ✅ Activity Feed em tempo real';
  RAISE NOTICE '- ✅ Sistema de presença online';
  RAISE NOTICE '- ✅ Sessões colaborativas';
  RAISE NOTICE '- ✅ Compartilhamento de arquivos avançado';
  RAISE NOTICE '- ✅ Notificações inteligentes';
  RAISE NOTICE '- ✅ Analytics de colaboração';
  RAISE NOTICE '- ✅ Sistema de limpeza automática';
END $$;