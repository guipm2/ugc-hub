/*
  # Criar tabela de candidaturas para oportunidades

  1. Nova Tabela
    - `opportunity_applications`
      - `id` (uuid, primary key)
      - `opportunity_id` (uuid, foreign key para opportunities)
      - `creator_id` (uuid, foreign key para profiles)
      - `message` (text, mensagem do criador)
      - `status` (text, status da candidatura: pending, approved, rejected)
      - `applied_at` (timestamp, data da candidatura)
      - `reviewed_at` (timestamp, data da revisão)

  2. Segurança
    - Enable RLS na tabela `opportunity_applications`
    - Política para leitura (todos podem ver)
    - Política para inserção (apenas criadores autenticados)
    - Política para atualização (apenas analista dono da oportunidade)

  3. Constraints
    - Constraint única para evitar candidaturas duplicadas
    - Foreign keys para garantir integridade referencial
*/

-- Criar tabela de candidaturas
CREATE TABLE IF NOT EXISTS public.opportunity_applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
    creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message text DEFAULT '',
    status text DEFAULT 'pending'::text NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    CONSTRAINT unique_opportunity_creator UNIQUE (opportunity_id, creator_id)
);

-- Habilitar RLS
ALTER TABLE public.opportunity_applications ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Enable read access for all authenticated users" 
ON public.opportunity_applications 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated creators" 
ON public.opportunity_applications 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Enable update for opportunity owner" 
ON public.opportunity_applications 
FOR UPDATE 
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.opportunities
        WHERE opportunities.id = opportunity_applications.opportunity_id 
        AND opportunities.created_by = auth.uid()
    )
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_opportunity_applications_opportunity_id 
ON public.opportunity_applications (opportunity_id);

CREATE INDEX IF NOT EXISTS idx_opportunity_applications_creator_id 
ON public.opportunity_applications (creator_id);

CREATE INDEX IF NOT EXISTS idx_opportunity_applications_status 
ON public.opportunity_applications (status);

CREATE INDEX IF NOT EXISTS idx_opportunity_applications_applied_at 
ON public.opportunity_applications (applied_at DESC);