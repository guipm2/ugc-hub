-- Migration: Adicionar suporte a imagens de oportunidades
-- Data: 2025-10-29
-- Descrição: Cria tabela opportunity_images para armazenar múltiplas imagens por oportunidade

-- Criar tabela opportunity_images
CREATE TABLE IF NOT EXISTS opportunity_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_opportunity_images_opportunity_id 
  ON opportunity_images(opportunity_id);

CREATE INDEX IF NOT EXISTS idx_opportunity_images_display_order 
  ON opportunity_images(opportunity_id, display_order);

-- Comentários
COMMENT ON TABLE opportunity_images IS 'Armazena imagens associadas às oportunidades';
COMMENT ON COLUMN opportunity_images.opportunity_id IS 'Referência à oportunidade';
COMMENT ON COLUMN opportunity_images.image_url IS 'URL pública da imagem no Supabase Storage (bucket: opportunity-images)';
COMMENT ON COLUMN opportunity_images.display_order IS 'Ordem de exibição das imagens (0 = primeira)';

-- Storage Bucket Configuration
-- Bucket name: opportunity-images
-- Bucket type: Standard bucket
-- Public: false (access via RLS policies)
-- File size limit: 5 MB
-- Allowed MIME types: image/jpeg, image/png, image/webp

-- RLS Policies for Storage Bucket 'opportunity-images':
-- 
-- 1. INSERT: Only analysts can upload images
-- CREATE POLICY "Analysts can upload opportunity images"
-- ON storage.objects FOR INSERT TO authenticated
-- WITH CHECK (
--   bucket_id = 'opportunity-images' 
--   AND (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'analyst'
-- );
--
-- 2. UPDATE: Only analysts can update images
-- CREATE POLICY "Analysts can update opportunity images"
-- ON storage.objects FOR UPDATE TO authenticated
-- USING (
--   bucket_id = 'opportunity-images'
--   AND (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'analyst'
-- )
-- WITH CHECK (
--   bucket_id = 'opportunity-images'
--   AND (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'analyst'
-- );
--
-- 3. DELETE: Only analysts can delete images
-- CREATE POLICY "Analysts can delete opportunity images"
-- ON storage.objects FOR DELETE TO authenticated
-- USING (
--   bucket_id = 'opportunity-images'
--   AND (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'analyst'
-- );
--
-- 4. SELECT: All authenticated users can view images
-- CREATE POLICY "Authenticated users can view opportunity images"
-- ON storage.objects FOR SELECT TO authenticated
-- USING (bucket_id = 'opportunity-images');
