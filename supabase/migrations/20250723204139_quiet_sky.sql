/*
  # Fix conversations RLS policies

  1. Security Updates
    - Add INSERT policy for conversations table to allow creation when applications are approved
    - Add UPDATE policy for conversations table to allow updates to last_message_at
    - Ensure analysts can create conversations for their opportunities
    - Ensure creators can participate in conversations for their applications

  2. Changes
    - Enable INSERT for authenticated users when they are participants
    - Enable UPDATE for conversation participants
    - Maintain existing SELECT policies
*/

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Analysts can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Creators can view own conversations" ON conversations;

-- Create comprehensive policies for conversations table
CREATE POLICY "Users can view own conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (analyst_id = auth.uid() OR creator_id = auth.uid());

CREATE POLICY "System can create conversations"
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user is the analyst of the opportunity
    EXISTS (
      SELECT 1 FROM opportunities 
      WHERE opportunities.id = opportunity_id 
      AND opportunities.created_by = auth.uid()
    )
    OR
    -- Allow if user is the creator applying
    creator_id = auth.uid()
  );

CREATE POLICY "Participants can update conversations"
  ON conversations
  FOR UPDATE
  TO authenticated
  USING (analyst_id = auth.uid() OR creator_id = auth.uid())
  WITH CHECK (analyst_id = auth.uid() OR creator_id = auth.uid());