-- Migration: Add company_link field to opportunities table
-- Date: 2025-10-01

-- Adicionar campo company_link na tabela de oportunidades
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS company_link text;

-- Comentário para documentação
COMMENT ON COLUMN opportunities.company_link IS 'Link para o site ou perfil da empresa (Instagram, site oficial, etc.)';