/*
  # Ajustar políticas de candidaturas para analistas

  - Corrige a política de leitura para considerar tanto `created_by` quanto `analyst_id`
  - Garante que analistas responsáveis pela oportunidade possam atualizar o status das candidaturas
*/

-- Atualizar política de leitura para permitir acesso ao criador e ao analista responsável
DROP POLICY IF EXISTS "Enable read access for creators and opportunity owners" ON public.opportunity_applications;

CREATE POLICY "Enable read access for creators and opportunity owners"
ON public.opportunity_applications
FOR SELECT
TO authenticated
USING (
  auth.uid() = creator_id OR
  EXISTS (
    SELECT 1
    FROM public.opportunities
    WHERE opportunities.id = opportunity_applications.opportunity_id
      AND (
        opportunities.created_by = auth.uid() OR
        opportunities.analyst_id = auth.uid()
      )
  )
);

-- Atualizar política de atualização para utilizar as mesmas regras de posse
DROP POLICY IF EXISTS "Enable update for opportunity owner" ON public.opportunity_applications;

CREATE POLICY "Enable update for opportunity owner"
ON public.opportunity_applications
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.opportunities
    WHERE opportunities.id = opportunity_applications.opportunity_id
      AND (
        opportunities.created_by = auth.uid() OR
        opportunities.analyst_id = auth.uid()
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.opportunities
    WHERE opportunities.id = opportunity_applications.opportunity_id
      AND (
        opportunities.created_by = auth.uid() OR
        opportunities.analyst_id = auth.uid()
      )
  )
);
