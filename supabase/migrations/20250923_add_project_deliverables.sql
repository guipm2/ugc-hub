-- Criação da tabela de deliverables/marcos de projetos
-- Permite que analistas definam prazos específicos para cada entrega de um projeto

CREATE TABLE IF NOT EXISTS project_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES opportunity_applications(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  analyst_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Informações do deliverable
  title text NOT NULL,
  description text,
  due_date date NOT NULL,
  priority integer DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
  
  -- Status tracking
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted', 'approved', 'rejected')),
  
  -- Feedback do analista
  analyst_feedback text,
  reviewed_at timestamptz,
  
  -- Campos de arquivo/entrega (para futuro uso)
  deliverable_files jsonb DEFAULT '[]'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE project_deliverables ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança

-- Analistas podem gerenciar deliverables de suas oportunidades
CREATE POLICY "Analysts can manage deliverables for their opportunities"
  ON project_deliverables
  FOR ALL
  TO authenticated
  USING (
    analyst_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM opportunities 
      WHERE opportunities.id = project_deliverables.opportunity_id 
      AND opportunities.created_by = auth.uid()
    )
  );

-- Creators podem visualizar e atualizar status de seus deliverables
CREATE POLICY "Creators can view and update their deliverables"
  ON project_deliverables
  FOR ALL
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_project_deliverables_application_id 
  ON project_deliverables(application_id);

CREATE INDEX IF NOT EXISTS idx_project_deliverables_opportunity_id 
  ON project_deliverables(opportunity_id);

CREATE INDEX IF NOT EXISTS idx_project_deliverables_creator_id 
  ON project_deliverables(creator_id);

CREATE INDEX IF NOT EXISTS idx_project_deliverables_analyst_id 
  ON project_deliverables(analyst_id);

CREATE INDEX IF NOT EXISTS idx_project_deliverables_due_date 
  ON project_deliverables(due_date);

CREATE INDEX IF NOT EXISTS idx_project_deliverables_status 
  ON project_deliverables(status);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_project_deliverables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_deliverables_updated_at
  BEFORE UPDATE ON project_deliverables
  FOR EACH ROW
  EXECUTE FUNCTION update_project_deliverables_updated_at();

-- Função para criar deliverables padrão quando uma candidatura é aprovada
CREATE OR REPLACE FUNCTION create_default_deliverables_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  opp_record opportunities%ROWTYPE;
BEGIN
  -- Só criar deliverables se status mudou para 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Buscar informações da oportunidade
    SELECT * INTO opp_record 
    FROM opportunities 
    WHERE id = NEW.opportunity_id;
    
    -- Criar deliverable padrão: Briefing e Conceito (3 dias após aprovação)
    INSERT INTO project_deliverables (
      application_id,
      opportunity_id,
      creator_id,
      analyst_id,
      title,
      description,
      due_date,
      priority
    ) VALUES (
      NEW.id,
      NEW.opportunity_id,
      NEW.creator_id,
      opp_record.created_by,
      'Briefing e Conceito',
      'Apresentar o conceito criativo e briefing do conteúdo',
      CURRENT_DATE + INTERVAL '3 days',
      1
    );
    
    -- Criar deliverable condicional para vídeo/reel: Roteiro (5 dias após aprovação)
    IF opp_record.content_type ILIKE '%video%' OR opp_record.content_type ILIKE '%reel%' THEN
      INSERT INTO project_deliverables (
        application_id,
        opportunity_id,
        creator_id,
        analyst_id,
        title,
        description,
        due_date,
        priority
      ) VALUES (
        NEW.id,
        NEW.opportunity_id,
        NEW.creator_id,
        opp_record.created_by,
        'Roteiro e Storyboard',
        'Roteiro detalhado e storyboard do vídeo',
        CURRENT_DATE + INTERVAL '5 days',
        2
      );
    END IF;
    
    -- Criar deliverable final: Conteúdo Final (usar deadline da oportunidade)
    INSERT INTO project_deliverables (
      application_id,
      opportunity_id,
      creator_id,
      analyst_id,
      title,
      description,
      due_date,
      priority
    ) VALUES (
      NEW.id,
      NEW.opportunity_id,
      NEW.creator_id,
      opp_record.created_by,
      'Conteúdo Final',
      'Entrega do ' || opp_record.content_type || ' finalizado',
      opp_record.deadline,
      3
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para deliverables automáticos
DROP TRIGGER IF EXISTS trigger_create_default_deliverables_on_approval ON opportunity_applications;
CREATE TRIGGER trigger_create_default_deliverables_on_approval
  AFTER UPDATE ON opportunity_applications
  FOR EACH ROW
  EXECUTE FUNCTION create_default_deliverables_on_approval();