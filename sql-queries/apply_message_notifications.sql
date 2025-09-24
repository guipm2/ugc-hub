-- Script para aplicar notificações de mensagens diretamente no Supabase
-- Execute este SQL no Supabase Dashboard > SQL Editor

-- Function to create notification when message is sent
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id uuid;
  conversation_record RECORD;
  opportunity_record RECORD;
  sender_name text;
BEGIN
  -- Get conversation details
  SELECT c.*, o.title as opportunity_title
  INTO conversation_record
  FROM conversations c
  JOIN opportunities o ON c.opportunity_id = o.id
  WHERE c.id = NEW.conversation_id;
  
  -- Determine recipient (the person who should receive the notification)
  IF NEW.sender_type = 'analyst' THEN
    recipient_id := conversation_record.creator_id;
    
    -- Get analyst name
    SELECT name INTO sender_name
    FROM analysts
    WHERE id = NEW.sender_id;
  ELSE
    recipient_id := conversation_record.analyst_id;
    
    -- Get creator name  
    SELECT name INTO sender_name
    FROM profiles
    WHERE id = NEW.sender_id;
  END IF;
  
  -- Only create notification if recipient is different from sender
  IF recipient_id != NEW.sender_id THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data
    ) VALUES (
      recipient_id,
      'new_message',
      'Nova mensagem de ' || COALESCE(sender_name, 'Usuário'),
      LEFT(NEW.content, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END,
      jsonb_build_object(
        'conversation_id', NEW.conversation_id,
        'message_id', NEW.id,
        'opportunity_id', conversation_record.opportunity_id,
        'opportunity_title', conversation_record.opportunity_title,
        'sender_type', NEW.sender_type
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_create_message_notification ON messages;

CREATE TRIGGER trigger_create_message_notification
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_notification();