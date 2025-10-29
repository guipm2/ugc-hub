-- Migration: Suporte para avatares de usuários
-- Data: 2025-10-29
-- Descrição: Adiciona suporte completo para fotos de perfil (avatares)

-- A coluna avatar_url já existe na tabela profiles
-- Esta migration apenas documenta e garante consistência

-- Garantir que a coluna existe (não faz nada se já existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN avatar_url text;
  END IF;
END $$;

-- Criar índice para buscas otimizadas de perfis com avatar
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url 
ON profiles(avatar_url) 
WHERE avatar_url IS NOT NULL;

-- Adicionar comentário explicativo à coluna
COMMENT ON COLUMN profiles.avatar_url IS 
  'URL pública do avatar do usuário armazenado no bucket "avatars" do Supabase Storage. Formato: https://[project].supabase.co/storage/v1/object/public/avatars/{user_id}/avatar.{ext}';

-- Nota: As políticas RLS (Row Level Security) para o bucket 'avatars' 
-- devem ser configuradas manualmente no Supabase Dashboard:
--
-- 1. Bucket público para leitura (SELECT)
-- 2. Usuários autenticados podem fazer upload do próprio avatar (INSERT)
-- 3. Usuários podem atualizar o próprio avatar (UPDATE)
-- 4. Usuários podem deletar o próprio avatar (DELETE)
--
-- Todas as políticas devem verificar: auth.uid()::text = (storage.foldername(name))[1]
