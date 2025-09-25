/*
  # Corrigir sistema de conversas para ter apenas uma conversa única por analista + criador

  1. Problema identificado:
    - Múltiplas conversas sendo criadas entre mesmo analista e criador para diferentes projetos
    - Triggers automáticos criando conversas baseadas em opportunity_id + creator_id
    
  2. Solução:
    - Desabilitar triggers que criam conversas baseadas em oportunidade
    - Remover constraint UNIQUE(opportunity_id, creator_id) 
    - Adicionar constraint UNIQUE(analyst_id, creator_id) para uma conversa única por dupla
    - Limpar conversas duplicadas mantendo apenas a mais recente
    - Criar nova função para gerenciar conversas únicas
    
  3. Resultado esperado:
    - Apenas uma conversa por analista + criador
    - Conversas podem ser usadas para múltiplos projetos
    - Sistema mais limpo e organizado
*/

-- 1. Desabilitar triggers que criam conversas automáticas
DROP TRIGGER IF EXISTS trigger_create_conversation_on_approval ON opportunity_applications;
DROP TRIGGER IF EXISTS create_conversation_on_approval_trigger ON opportunity_applications;

-- 2. Remover constraint atual que permite múltiplas conversas por criador
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_opportunity_id_creator_id_key;

-- 3. Limpar conversas duplicadas - manter apenas a conversa mais recente para cada dupla analista+criador
WITH ranked_conversations AS (
  SELECT 
    id,
    analyst_id,
    creator_id,
    ROW_NUMBER() OVER (
      PARTITION BY analyst_id, creator_id 
      ORDER BY last_message_at DESC, created_at DESC
    ) as rn
  FROM conversations
  WHERE analyst_id IS NOT NULL AND creator_id IS NOT NULL
),
conversations_to_delete AS (
  SELECT id FROM ranked_conversations WHERE rn > 1
)
DELETE FROM conversations 
WHERE id IN (SELECT id FROM conversations_to_delete);

-- 4. Atualizar conversas remanescentes para remover vinculação específica a oportunidade
UPDATE conversations 
SET opportunity_id = NULL 
WHERE opportunity_id IS NOT NULL;

-- 5. Adicionar constraint para garantir uma conversa única por analista+criador
ALTER TABLE conversations 
ADD CONSTRAINT conversations_analyst_creator_unique 
UNIQUE (analyst_id, creator_id);

-- 6. Criar função melhorada para buscar ou criar conversa única
CREATE OR REPLACE FUNCTION get_or_create_unique_conversation(
  p_analyst_id uuid,
  p_creator_id uuid
) RETURNS uuid AS $$
DECLARE
  conversation_id uuid;
BEGIN
  -- Buscar conversa existente
  SELECT id INTO conversation_id
  FROM conversations
  WHERE analyst_id = p_analyst_id AND creator_id = p_creator_id;
  
  -- Se não existe, criar nova conversa única
  IF conversation_id IS NULL THEN
    INSERT INTO conversations (
      analyst_id,
      creator_id,
      opportunity_id,
      last_message_at
    ) VALUES (
      p_analyst_id,
      p_creator_id,
      NULL, -- Conversa geral, não vinculada a projeto específico
      NOW()
    ) RETURNING id INTO conversation_id;
  END IF;
  
  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Criar nova função para quando candidatura é aprovada (opcional - sem criar conversa automática)
CREATE OR REPLACE FUNCTION notify_application_approved()
RETURNS TRIGGER AS $$
DECLARE
  opportunity_record RECORD;
  creator_record RECORD;
BEGIN
  -- Só notificar se status mudou para 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Buscar dados da oportunidade
    SELECT o.*, a.name as analyst_name, a.company as analyst_company
    INTO opportunity_record
    FROM opportunities o
    JOIN analysts a ON o.created_by = a.id
    WHERE o.id = NEW.opportunity_id;
    
    -- Buscar dados do criador
    SELECT * INTO creator_record
    FROM profiles
    WHERE id = NEW.creator_id;
    
    -- Criar notificação para o criador sobre aprovação
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data
    ) VALUES (
      NEW.creator_id,
      'application_approved',
      'Candidatura Aprovada!',
      'Sua candidatura para "' || opportunity_record.title || '" foi aprovada pela empresa ' || opportunity_record.company || '.',
      jsonb_build_object(
        'opportunity_id', NEW.opportunity_id,
        'opportunity_title', opportunity_record.title,
        'company', opportunity_record.company,
        'application_id', NEW.id
      )
    );
    
    -- Criar notificação para o analista sobre nova aprovação
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data
    ) VALUES (
      opportunity_record.created_by,
      'application_approved',
      'Candidatura Aprovada',
      'Você aprovou ' || creator_record.name || ' para a oportunidade "' || opportunity_record.title || '".',
      jsonb_build_object(
        'opportunity_id', NEW.opportunity_id,
        'opportunity_title', opportunity_record.title,
        'creator_id', NEW.creator_id,
        'creator_name', creator_record.name,
        'application_id', NEW.id
      )
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Criar trigger apenas para notificações (sem criar conversas automáticas)
CREATE TRIGGER trigger_notify_application_approved
  AFTER UPDATE ON opportunity_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_application_approved();

-- 9. Comentário explicativo
COMMENT ON CONSTRAINT conversations_analyst_creator_unique ON conversations IS 
'Garante que existe apenas uma conversa única entre cada analista e criador, independente de projetos/oportunidades';

COMMENT ON FUNCTION get_or_create_unique_conversation IS 
'Busca ou cria uma conversa única entre analista e criador. Usado pelo frontend para garantir conversas únicas.';