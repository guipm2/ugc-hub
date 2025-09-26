-- Quick verification and fix for collaboration tables
-- Execute this in Supabase SQL Editor

-- 1. Check if user_presence table exists and create if needed
CREATE TABLE IF NOT EXISTS user_presence (
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'offline',
  current_activity text,
  last_seen timestamptz DEFAULT NOW(),
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  PRIMARY KEY (user_id)
);

-- 2. Check if activity_feed table exists and create if needed
CREATE TABLE IF NOT EXISTS activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  activity_type text NOT NULL,
  related_entity_type text,
  related_entity_id uuid,
  priority integer DEFAULT 3,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen);
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_id ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_read ON activity_feed(read);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON activity_feed(created_at);

-- 4. Enable RLS
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

-- 5. Basic RLS policies for user_presence
DROP POLICY IF EXISTS "Users can view online presence" ON user_presence;
CREATE POLICY "Users can view online presence"
  ON user_presence FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can manage their presence" ON user_presence;
CREATE POLICY "Users can manage their presence"
  ON user_presence FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 6. Basic RLS policies for activity_feed
DROP POLICY IF EXISTS "Users can view their activities" ON activity_feed;
CREATE POLICY "Users can view their activities"
  ON activity_feed FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can create activities" ON activity_feed;
CREATE POLICY "System can create activities"
  ON activity_feed FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their activities" ON activity_feed;
CREATE POLICY "Users can update their activities"
  ON activity_feed FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 7. Test the queries
SELECT 'Tables created successfully' as status;

-- Show current user_presence records
SELECT COUNT(*) as presence_count FROM user_presence;

-- Show current activity_feed records  
SELECT COUNT(*) as activity_count FROM activity_feed;