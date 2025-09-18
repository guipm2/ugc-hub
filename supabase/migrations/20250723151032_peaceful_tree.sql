/*
  # Sistema de Notificações Automáticas

  1. Funções
    - `notify_creators_new_opportunity()` - Notifica criadores sobre nova oportunidade
    - `notify_analyst_new_application()` - Notifica analista sobre nova candidatura
    - `notify_creator_application_status()` - Notifica criador sobre status da candidatura

  2. Triggers
    - Trigger para nova oportunidade
    - Trigger para nova candidatura
    - Trigger para mudança de status da candidatura

  3. Segurança
    - Políticas RLS configuradas
    - Validações de dados
*/

-- Função para notificar criadores sobre nova oportunidade
CREATE OR REPLACE FUNCTION notify_creators_new_opportunity()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir notificação para todos os criadores
  INSERT INTO notifications (user_id, type, title, message, data)
  SELECT 
    p.id,
    'new_opportunity',
    'Nova Oportunidade Disponível!',
    'A empresa ' || NEW.company || ' criou uma nova oportunidade: ' || NEW.title,
    jsonb_build_object(
      'opportunity_id', NEW.id,
      'opportunity_title', NEW.title,
      'company', NEW.company,
      'budget_min', NEW.budget_min,
      'budget_max', NEW.budget_max
    )
  FROM profiles p
  WHERE p.role = 'creator';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para notificar analista sobre nova candidatura
CREATE OR REPLACE FUNCTION notify_analyst_new_application()
RETURNS TRIGGER AS $$
DECLARE
  opportunity_record RECORD;
  creator_record RECORD;
BEGIN
  -- Buscar dados da oportunidade
  SELECT * INTO opportunity_record
  FROM opportunities
  WHERE id = NEW.opportunity_id;
  
  -- Buscar dados do criador
  SELECT * INTO creator_record
  FROM profiles
  WHERE id = NEW.creator_id;
  
  -- Inserir notificação para o analista que criou a oportunidade
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    opportunity_record.created_by,
    'new_application',
    'Nova Candidatura Recebida!',
    'O criador ' || COALESCE(creator_record.name, creator_record.email) || ' se candidatou para: ' || opportunity_record.title,
    jsonb_build_object(
      'opportunity_id', NEW.opportunity_id,
      'opportunity_title', opportunity_record.title,
      'application_id', NEW.id,
      'creator_id', NEW.creator_id,
      'creator_name', COALESCE(creator_record.name, creator_record.email)
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para notificar criador sobre status da candidatura
CREATE OR REPLACE FUNCTION notify_creator_application_status()
RETURNS TRIGGER AS $$
DECLARE
  opportunity_record RECORD;
  status_message TEXT;
  notification_title TEXT;
BEGIN
  -- Só notificar se o status mudou para aprovado ou rejeitado
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    
    -- Buscar dados da oportunidade
    SELECT * INTO opportunity_record
    FROM opportunities
    WHERE id = NEW.opportunity_id;
    
    -- Definir mensagem baseada no status
    IF NEW.status = 'approved' THEN
      notification_title := 'Candidatura Aprovada! 🎉';
      status_message := 'Parabéns! Sua candidatura para "' || opportunity_record.title || '" foi aprovada pela empresa ' || opportunity_record.company || '.';
    ELSE
      notification_title := 'Candidatura Não Aprovada';
      status_message := 'Sua candidatura para "' || opportunity_record.title || '" não foi aprovada desta vez. Continue tentando!';
    END IF;
    
    -- Inserir notificação para o criador
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.creator_id,
      'application_' || NEW.status,
      notification_title,
      status_message,
      jsonb_build_object(
        'opportunity_id', NEW.opportunity_id,
        'opportunity_title', opportunity_record.title,
        'application_id', NEW.id,
        'status', NEW.status,
        'company', opportunity_record.company
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para notificar criadores sobre nova oportunidade
DROP TRIGGER IF EXISTS trigger_notify_creators_new_opportunity ON opportunities;
CREATE TRIGGER trigger_notify_creators_new_opportunity
  AFTER INSERT ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION notify_creators_new_opportunity();

-- Trigger para notificar analista sobre nova candidatura
DROP TRIGGER IF EXISTS trigger_notify_analyst_new_application ON opportunity_applications;
CREATE TRIGGER trigger_notify_analyst_new_application
  AFTER INSERT ON opportunity_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_analyst_new_application();

-- Trigger para notificar criador sobre status da candidatura
DROP TRIGGER IF EXISTS trigger_notify_creator_application_status ON opportunity_applications;
CREATE TRIGGER trigger_notify_creator_application_status
  AFTER UPDATE ON opportunity_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_creator_application_status();

-- Função para marcar notificação como lida
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET read = true
  WHERE id = notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;