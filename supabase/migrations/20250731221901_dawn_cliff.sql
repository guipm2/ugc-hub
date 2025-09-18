/*
  # Criar etapas para oportunidades aprovadas existentes

  1. Função para criar etapas automaticamente
    - Quando uma candidatura for aprovada
    - Criar registro na tabela opportunity_stages
    - Definir etapa inicial como 'aguardando_envio'

  2. Trigger para candidaturas aprovadas
    - Executar quando status mudar para 'approved'
    - Criar etapa automaticamente
*/

-- Função para criar etapa quando candidatura for aprovada
CREATE OR REPLACE FUNCTION create_stage_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se o status mudou para 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Verificar se já existe uma etapa para esta oportunidade
    IF NOT EXISTS (
      SELECT 1 FROM opportunity_stages 
      WHERE opportunity_id = NEW.opportunity_id
    ) THEN
      -- Criar nova etapa
      INSERT INTO opportunity_stages (
        opportunity_id,
        stage,
        created_at,
        updated_at
      ) VALUES (
        NEW.opportunity_id,
        'aguardando_envio',
        now(),
        now()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para candidaturas aprovadas
DROP TRIGGER IF EXISTS trigger_create_stage_on_approval ON opportunity_applications;
CREATE TRIGGER trigger_create_stage_on_approval
  AFTER UPDATE ON opportunity_applications
  FOR EACH ROW
  EXECUTE FUNCTION create_stage_on_approval();