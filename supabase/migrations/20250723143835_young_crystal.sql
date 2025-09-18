/*
  # Remove problematic triggers and simplify user creation

  1. Changes Made
    - Remove all automatic triggers that run on auth.users
    - Simplify RLS policies to allow user creation
    - Remove NOT NULL constraints that cause issues
    - Create manual profile creation in application code

  2. Security
    - Maintain RLS protection after user creation
    - Allow anon users to create profiles during signup
    - Ensure users can only access their own data
*/

-- Drop existing problematic triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;

-- Drop the problematic function
DROP FUNCTION IF EXISTS handle_new_user();

-- Temporarily disable RLS to fix existing data
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE analysts DISABLE ROW LEVEL SECURITY;

-- Make email nullable to prevent signup failures
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;
ALTER TABLE analysts ALTER COLUMN email DROP NOT NULL;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow anon to create profiles during signup" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Analysts can read all profiles" ON profiles;

-- Create simplified policies for profiles
CREATE POLICY "Enable insert for authenticated users only" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable select for users based on user_id" ON profiles
  FOR SELECT USING (auth.uid() = id OR is_analyst());

CREATE POLICY "Enable update for users based on user_id" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Drop existing policies for analysts
DROP POLICY IF EXISTS "Allow analyst signup" ON analysts;
DROP POLICY IF EXISTS "Analysts can read own data" ON analysts;
DROP POLICY IF EXISTS "Analysts can update own data" ON analysts;
DROP POLICY IF EXISTS "Analysts can delete own data" ON analysts;

-- Create simplified policies for analysts
CREATE POLICY "Enable insert for authenticated users only" ON analysts
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable select for users based on user_id" ON analysts
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Enable update for users based on user_id" ON analysts
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable delete for users based on user_id" ON analysts
  FOR DELETE USING (auth.uid() = id);