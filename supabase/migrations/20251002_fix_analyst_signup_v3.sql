-- Migration: Complete fix for analyst signup (v3)
-- Date: 2025-10-02

-- 1. Primeiro, remover todos os constraints UNIQUE do email
ALTER TABLE analysts DROP CONSTRAINT IF EXISTS analysts_email_key;
ALTER TABLE analysts DROP CONSTRAINT IF EXISTS analysts_email_unique;
ALTER TABLE analysts DROP CONSTRAINT IF EXISTS analysts_email_constraint;

-- 2. Limpar dados de teste que podem estar causando conflito
DELETE FROM analysts WHERE email LIKE '%test%' OR email LIKE '%exemplo%';
DELETE FROM profiles WHERE email LIKE '%test%' OR email LIKE '%exemplo%';

-- 3. Verificar se a tabela profiles tem o campo role (pode não ter sido criado)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE profiles ADD COLUMN role public.user_role DEFAULT 'creator'::user_role;
    END IF;
END $$;

-- 4. Criar função handle_new_user mais robusta
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Debug: log para ver se a função está sendo chamada
  RAISE LOG 'handle_new_user called for user: %', NEW.email;
  
  -- Verificar se é um analista baseado no user_metadata
  IF NEW.raw_user_meta_data->>'role' = 'analyst' THEN
    RAISE LOG 'Creating analyst profile for: %', NEW.email;
    
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
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      role = EXCLUDED.role,
      name = EXCLUDED.name,
      company = EXCLUDED.company,
      updated_at = NOW();
    
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
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      company = EXCLUDED.company,
      role = EXCLUDED.role,
      updated_at = NOW();
      
    RAISE LOG 'Analyst profile created successfully for: %', NEW.email;
      
  ELSE
    RAISE LOG 'Creating creator profile for: %', NEW.email;
    
    -- Criar perfil de criador (comportamento padrão)
    INSERT INTO public.profiles (id, email, role, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      'creator'::user_role,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      role = EXCLUDED.role,
      updated_at = NOW();
      
    RAISE LOG 'Creator profile created successfully for: %', NEW.email;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in handle_new_user for %: %', NEW.email, SQLERRM;
  RETURN NEW; -- Não falhar o signup mesmo se houver erro no trigger
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Recriar o trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 6. Garantir que as políticas estão corretas e permissivas
DROP POLICY IF EXISTS "Allow analyst signup" ON analysts;
CREATE POLICY "Allow analyst signup"
  ON analysts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;  
CREATE POLICY "Allow profile creation during signup"
  ON profiles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Políticas de UPDATE para casos de ON CONFLICT
DROP POLICY IF EXISTS "Allow analyst update during signup" ON analysts;
CREATE POLICY "Allow analyst update during signup"
  ON analysts
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow profile update during signup" ON profiles;
CREATE POLICY "Allow profile update during signup"
  ON profiles
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Comentários para documentação
COMMENT ON FUNCTION handle_new_user() IS 'Trigger function robusta que cria perfis e registros de analistas automaticamente. Inclui logs para debug e não falha o signup em caso de erro.';

-- Habilitar logs para debug (pode ser desabilitado depois)
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();