-- Debug and clean multiple relationships between user_presence and profiles
-- Execute this in Supabase SQL Editor

-- 1. Check all foreign key constraints on user_presence table
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
  AND tc.table_name = 'user_presence'
  AND ccu.table_name = 'profiles';

-- 2. If there are multiple constraints, drop the extra ones (keep only one)
-- Uncomment and run only if you see multiple foreign keys above

-- DROP CONSTRAINT IF EXISTS fk_user_presence_profiles ON user_presence;
-- Keep only the original one: user_presence_user_id_fkey

-- 3. Test the manual query approach (should work now)
SELECT 
  up.user_id,
  up.status,
  up.current_activity,
  up.last_seen
FROM user_presence up
WHERE up.status = 'online'
  AND up.last_seen >= NOW() - INTERVAL '15 minutes'
LIMIT 5;

-- 4. Test joining with profiles manually
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

-- 5. Show current counts
SELECT 
  'user_presence' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN status = 'online' THEN 1 END) as online_count
FROM user_presence
UNION ALL
SELECT 
  'profiles' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN role = 'analyst' THEN 1 END) as analyst_count
FROM profiles;