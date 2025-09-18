/*
  # Fix Analyst RLS Policies

  1. Security Updates
    - Add proper INSERT policy for analyst signup
    - Allow analysts to create their own records
    - Maintain security for other operations

  2. Changes
    - Add INSERT policy for new analyst registration
    - Update existing policies if needed
*/

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Analysts can read own data" ON analysts;
DROP POLICY IF EXISTS "Analysts can update own data" ON analysts;

-- Allow anyone to insert new analyst records (for signup)
CREATE POLICY "Allow analyst signup"
  ON analysts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow analysts to read their own data
CREATE POLICY "Analysts can read own data"
  ON analysts
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

-- Allow analysts to update their own data
CREATE POLICY "Analysts can update own data"
  ON analysts
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- Allow analysts to delete their own data
CREATE POLICY "Analysts can delete own data"
  ON analysts
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = id::text);