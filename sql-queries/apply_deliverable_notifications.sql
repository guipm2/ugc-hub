-- Script para aplicar notificações de novos deliverables diretamente no Supabase
-- Execute este SQL no Supabase Dashboard > SQL Editor

-- Function to create notification when deliverable is created
CREATE OR REPLACE FUNCTION create_deliverable_notification()
RETURNS TRIGGER AS $$
DECLARE
  creator_name text;
  opportunity_record RECORD;
  analyst_name text;
BEGIN
  -- Get creator name
  SELECT name INTO creator_name
  FROM profiles
  WHERE id = NEW.creator_id;
  
  -- Get opportunity details and analyst info
  SELECT o.title as opportunity_title, o.company, a.name as analyst_name
  INTO opportunity_record
  FROM opportunities o
  JOIN analysts a ON o.created_by = a.id
  WHERE o.id = NEW.opportunity_id;
  
  -- Create notification for the creator
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    NEW.creator_id,
    'new_deliverable',
    'Nova entrega definida: ' || NEW.title,
    'Uma nova entrega foi definida para o projeto "' || COALESCE(opportunity_record.opportunity_title, 'Projeto') || '". Prazo: ' || TO_CHAR(NEW.due_date, 'DD/MM/YYYY'),
    jsonb_build_object(
      'deliverable_id', NEW.id,
      'deliverable_title', NEW.title,
      'due_date', NEW.due_date,
      'priority', NEW.priority,
      'opportunity_id', NEW.opportunity_id,
      'opportunity_title', opportunity_record.opportunity_title,
      'company', opportunity_record.company,
      'analyst_id', NEW.analyst_id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_create_deliverable_notification ON project_deliverables;

CREATE TRIGGER trigger_create_deliverable_notification
  AFTER INSERT ON project_deliverables
  FOR EACH ROW
  EXECUTE FUNCTION create_deliverable_notification();