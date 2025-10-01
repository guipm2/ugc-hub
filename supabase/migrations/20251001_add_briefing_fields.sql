-- Migration: Add briefing field to project deliverables and opportunities
-- Date: 2025-10-01

-- 1. Adicionar campo briefing na tabela de oportunidades
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS briefing text;

-- 2. Adicionar campo briefing específico para deliverables individuais
ALTER TABLE project_deliverables 
ADD COLUMN IF NOT EXISTS briefing text;

-- 3. Comentários para documentação
COMMENT ON COLUMN opportunities.briefing IS 'Briefing geral do projeto fornecido pelo analista';
COMMENT ON COLUMN project_deliverables.briefing IS 'Briefing específico para esta entrega fornecido pelo analista';

-- 4. Atualizar trigger para incluir briefing padrão nos deliverables automáticos
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
      briefing,
      due_date,
      priority
    ) VALUES (
      NEW.id,
      NEW.opportunity_id,
      NEW.creator_id,
      opp_record.created_by,
      'Briefing e Conceito',
      'Apresentar o conceito criativo e briefing do conteúdo',
      'Aguardando briefing detalhado do analista. Este será fornecido após a aprovação da candidatura.',
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
        briefing,
        due_date,
        priority
      ) VALUES (
        NEW.id,
        NEW.opportunity_id,
        NEW.creator_id,
        opp_record.created_by,
        'Roteiro e Storyboard',
        'Roteiro detalhado e storyboard do vídeo',
        'Briefing para roteiro será fornecido após aprovação do conceito inicial.',
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
      briefing,
      due_date,
      priority
    ) VALUES (
      NEW.id,
      NEW.opportunity_id,
      NEW.creator_id,
      opp_record.created_by,
      'Conteúdo Final',
      'Entrega do ' || opp_record.content_type || ' finalizado',
      'Briefing final será fornecido após aprovação das etapas anteriores.',
      opp_record.deadline,
      3
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;