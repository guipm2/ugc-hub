-- Migration: add metadata fields to conversations and allow participants to delete chats
-- Date: 2025-10-02

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS custom_title text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_conversations_tags ON conversations USING GIN (tags);

DROP POLICY IF EXISTS "Participants can delete conversations" ON conversations;

CREATE POLICY "Participants can delete conversations"
  ON conversations
  FOR DELETE
  TO authenticated
  USING (
    analyst_id = auth.uid() OR
    creator_id = auth.uid()
  );
