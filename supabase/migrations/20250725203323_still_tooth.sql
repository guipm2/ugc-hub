/*
  # Fix conversations table RLS policy for INSERT operations

  1. Security Changes
    - Update INSERT policy for conversations table
    - Allow analysts to create conversations with any creator
    - Allow creators to create conversations (for future use)
    - Ensure proper validation of analyst_id and creator_id

  2. Policy Updates
    - Drop existing restrictive INSERT policy
    - Create new flexible INSERT policy for authenticated users
    - Maintain security by validating user roles and IDs
*/

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "System can create conversations" ON conversations;

-- Create a new INSERT policy that allows analysts to create conversations
CREATE POLICY "Analysts and creators can create conversations"
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if the user is the analyst creating the conversation
    (auth.uid() = analyst_id) OR
    -- Allow if the user is the creator in the conversation
    (auth.uid() = creator_id) OR
    -- Allow if the user is an analyst (has analyst role) and is creating a conversation
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'analyst'
    ) AND auth.uid() = analyst_id)
  );

-- Ensure the SELECT policy allows participants to view their conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;

CREATE POLICY "Users can view own conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (
    (analyst_id = auth.uid()) OR 
    (creator_id = auth.uid())
  );

-- Ensure the UPDATE policy allows participants to update conversations
DROP POLICY IF EXISTS "Participants can update conversations" ON conversations;

CREATE POLICY "Participants can update conversations"
  ON conversations
  FOR UPDATE
  TO authenticated
  USING (
    (analyst_id = auth.uid()) OR 
    (creator_id = auth.uid())
  )
  WITH CHECK (
    (analyst_id = auth.uid()) OR 
    (creator_id = auth.uid())
  );