/*
  # Trigger para criar conversa automaticamente quando candidatura é aprovada

  1. Função para criar conversa
    - Verifica se já existe conversa para a oportunidade e criador
    - Cria nova conversa se não existir
    - Envia mensagem inicial automática

  2. Trigger
    - Executa quando status da candidatura muda para 'approved'
    - Chama a função de criação de conversa
*/

-- Função para criar conversa quando candidatura é aprovada
CREATE OR REPLACE FUNCTION create_conversation_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  conversation_id uuid;
  opportunity_record RECORD;
BEGIN
  -- Só executa se o status mudou para 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Busca informações da oportunidade
    SELECT o.*, a.name as analyst_name, a.company as analyst_company
    INTO opportunity_record
    FROM opportunities o
    JOIN analysts a ON o.created_by = a.id
    WHERE o.id = NEW.opportunity_id;
    
    -- Verifica se já existe conversa para esta oportunidade e criador
    SELECT id INTO conversation_id
    FROM conversations
    WHERE opportunity_id = NEW.opportunity_id 
    AND creator_id = NEW.creator_id;
    
    -- Se não existe, cria nova conversa
    IF conversation_id IS NULL THEN
      INSERT INTO conversations (
        opportunity_id,
        analyst_id,
        creator_id,
        last_message_at
      ) VALUES (
        NEW.opportunity_id,
        opportunity_record.created_by,
        NEW.creator_id,
        NOW()
      ) RETURNING id INTO conversation_id;
      
      -- Envia mensagem inicial automática do analista
      INSERT INTO messages (
        conversation_id,
        sender_id,
        sender_type,
        content
      ) VALUES (
        conversation_id,
        opportunity_record.created_by,
        'analyst',
        'Olá! Sua candidatura para "' || opportunity_record.title || '" foi aprovada! Vamos conversar sobre os próximos passos da campanha.'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove trigger existente se houver
DROP TRIGGER IF EXISTS trigger_create_conversation_on_approval ON opportunity_applications;

-- Cria o trigger
CREATE TRIGGER trigger_create_conversation_on_approval
  AFTER UPDATE ON opportunity_applications
  FOR EACH ROW
  EXECUTE FUNCTION create_conversation_on_approval();