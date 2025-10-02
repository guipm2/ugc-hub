-- Migration: Fix analyst signup and profile creation
-- Date: 2025-10-02

-- Primeiro, remover o campo password_hash da tabela analysts (não é mais necessário com Supabase Auth)
ALTER TABLE analysts DROP COLUMN IF EXISTS password_hash;

-- Atualizar função handle_new_user para lidar com analistas
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Verificar se é um analista baseado no user_metadata
  IF NEW.raw_user_meta_data->>'role' = 'analyst' THEN
    -- Criar perfil de analista
    INSERT INTO public.profiles (id, email, role, name, company, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      'analyst'::user_role,
      COALESCE(NEW.raw_user_meta_data->>'name', ''),
      COALESCE(NEW.raw_user_meta_data->>'company', ''),
      NOW(),
      NOW()
    );
    
    -- Criar registro na tabela analysts
    INSERT INTO public.analysts (id, email, name, company, role, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', ''),
      COALESCE(NEW.raw_user_meta_data->>'company', ''),
      'analyst'::user_role,
      NOW(),
      NOW()
    );
  ELSE
    -- Criar perfil de criador (comportamento padrão)
    INSERT INTO public.profiles (id, email, role, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      'creator'::user_role,
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar o trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Adicionar política para permitir inserção de analistas
DROP POLICY IF EXISTS "Allow analyst signup" ON analysts;
CREATE POLICY "Allow analyst signup"
  ON analysts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Adicionar política para permitir inserção de perfis durante signup
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;
CREATE POLICY "Allow profile creation during signup"
  ON profiles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Comentários para documentação
COMMENT ON FUNCTION handle_new_user() IS 'Trigger function que cria perfis e registros de analistas automaticamente quando um usuário é confirmado no auth.users';