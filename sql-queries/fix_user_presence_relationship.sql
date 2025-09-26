-- Fix user_presence table to properly reference profiles table
-- Execute this in Supabase SQL Editor to fix the foreign key relationship

-- First, let's check the current structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_presence' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if foreign key constraint exists
SELECT
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'user_presence';

-- If the foreign key doesn't exist or is incorrect, add it
ALTER TABLE user_presence 
ADD CONSTRAINT fk_user_presence_profiles 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Also ensure RLS policies are correct for user_presence
DROP POLICY IF EXISTS "Users can view online presence" ON user_presence;
CREATE POLICY "Users can view online presence"
  ON user_presence FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update their own presence" ON user_presence;
CREATE POLICY "Users can update their own presence"
  ON user_presence FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Test the query that was failing
SELECT 
  up.user_id, 
  up.status, 
  up.current_activity,
  p.name,
  p.email
FROM user_presence up
LEFT JOIN profiles p ON up.user_id = p.id
WHERE up.status = 'online'
  AND up.last_seen >= NOW() - INTERVAL '15 minutes'
LIMIT 5;