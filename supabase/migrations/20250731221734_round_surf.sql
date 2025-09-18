/*
  # Sistema de Gerenciamento de Etapas de Oportunidades

  1. Nova Tabela
    - `opportunity_stages`
      - `id` (uuid, primary key)
      - `opportunity_id` (uuid, foreign key)
      - `stage` (text, etapa atual)
      - `tracking_code` (text, código de rastreio)
      - `notes` (text, observações)
      - `completed_at` (timestamp, quando foi concluída)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Enable RLS na tabela `opportunity_stages`
    - Políticas para analistas gerenciarem suas oportunidades

  3. Índices
    - Índice para opportunity_id
    - Índice para stage
*/

-- Criar tabela de etapas das oportunidades
CREATE TABLE IF NOT EXISTS opportunity_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'aguardando_envio',
  tracking_code text,
  notes text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE opportunity_stages ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Analysts can manage stages of their opportunities"
  ON opportunity_stages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM opportunities 
      WHERE opportunities.id = opportunity_stages.opportunity_id 
      AND opportunities.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM opportunities 
      WHERE opportunities.id = opportunity_stages.opportunity_id 
      AND opportunities.created_by = auth.uid()
    )
  );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_opportunity_stages_opportunity_id 
  ON opportunity_stages(opportunity_id);

CREATE INDEX IF NOT EXISTS idx_opportunity_stages_stage 
  ON opportunity_stages(stage);

CREATE INDEX IF NOT EXISTS idx_opportunity_stages_created_at 
  ON opportunity_stages(created_at DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_opportunity_stages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_opportunity_stages_updated_at
  BEFORE UPDATE ON opportunity_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_opportunity_stages_updated_at();

-- Constraint para validar etapas válidas
ALTER TABLE opportunity_stages 
ADD CONSTRAINT valid_stage_check 
CHECK (stage IN (
  'aguardando_envio',
  'produtos_enviados', 
  'material_roteirizacao',
  'aguardando_gravacao',
  'pronto_edicao',
  'material_edicao',
  'revisao_final',
  'finalizado'
));