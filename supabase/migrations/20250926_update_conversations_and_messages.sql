-- Migration: Update conversations and messages for unified messaging system
-- Date: 2025-09-26

-- 1. Add new fields to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'general' CHECK (message_type IN ('general', 'project', 'system')),
ADD COLUMN IF NOT EXISTS project_context uuid REFERENCES opportunities(id) ON DELETE SET NULL;

-- 2. Allow NULL opportunity_id in conversations for general chats
ALTER TABLE conversations 
ALTER COLUMN opportunity_id DROP NOT NULL;

-- 3. Drop the old unique constraint and create a new one that handles NULLs properly
-- First, check if the constraint exists and drop it
DO $$ BEGIN
    ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_opportunity_id_creator_id_key;
EXCEPTION WHEN undefined_object THEN
    -- Constraint doesn't exist, continue
    NULL;
END $$;

-- 4. Create a new unique constraint that properly handles NULL opportunity_id
-- For project conversations: unique per (opportunity_id, creator_id)
-- For general conversations: unique per (analyst_id, creator_id) where opportunity_id IS NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_project_unique 
ON conversations (opportunity_id, creator_id) 
WHERE opportunity_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_general_unique 
ON conversations (analyst_id, creator_id) 
WHERE opportunity_id IS NULL;

-- 5. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_project_context ON messages(project_context);
CREATE INDEX IF NOT EXISTS idx_conversations_analyst_creator ON conversations(analyst_id, creator_id);

-- 6. Update last_message_at trigger function to work with the new schema
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to automatically update last_message_at
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;
CREATE TRIGGER trigger_update_conversation_last_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- 8. Add comment for documentation
COMMENT ON COLUMN messages.message_type IS 'Type of message: general (default), project (about specific project), system (automated)';
COMMENT ON COLUMN messages.project_context IS 'Reference to opportunity if message is about a specific project';
COMMENT ON COLUMN conversations.opportunity_id IS 'NULL for general conversations, opportunity ID for project-specific conversations';