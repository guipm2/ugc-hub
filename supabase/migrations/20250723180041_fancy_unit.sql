/*
  # Corrigir política de deleção de candidaturas

  1. Problema
    - Criadores não conseguem deletar suas próprias candidaturas
    - Política RLS muito restritiva para DELETE

  2. Solução
    - Adicionar política específica para criadores deletarem suas candidaturas
    - Manter segurança mas permitir auto-deleção

  3. Segurança
    - Apenas o criador pode deletar sua própria candidatura
    - Analistas não podem deletar candidaturas diretamente
*/

-- Remover política existente se houver conflito
DROP POLICY IF EXISTS "Enable delete for application creator" ON public.opportunity_applications;

-- Criar política específica para criadores deletarem suas candidaturas
CREATE POLICY "Enable delete for application creator" 
ON public.opportunity_applications 
FOR DELETE 
TO authenticated
USING (auth.uid() = creator_id);

-- Verificar se a política de leitura permite que criadores vejam suas candidaturas
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.opportunity_applications;

-- Recriar política de leitura mais específica
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
    AND opportunities.created_by = auth.uid()
  )
);