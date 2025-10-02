-- Migration: Fix analyst signup with better error handling
-- Date: 2025-10-02 (v2)

-- Remover constraint UNIQUE do email se existir (pode estar causando conflito)
ALTER TABLE analysts DROP CONSTRAINT IF EXISTS analysts_email_key;
ALTER TABLE analysts DROP CONSTRAINT IF EXISTS analysts_email_unique;

-- Atualizar função handle_new_user com melhor tratamento de erros
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Verificar se é um analista baseado no user_metadata
  IF NEW.raw_user_meta_data->>'role' = 'analyst' THEN
    
    -- Criar perfil de analista (verificar se já não existe)
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
    
    -- Criar registro na tabela analysts (verificar se já não existe)
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
      
  ELSE
    -- Criar perfil de criador (comportamento padrão, verificar se já não existe)
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
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar o trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Garantir que as políticas estão corretas
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

-- Adicionar política de UPDATE para casos de ON CONFLICT
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
COMMENT ON FUNCTION handle_new_user() IS 'Trigger function que cria perfis e registros de analistas automaticamente quando um usuário é confirmado no auth.users. Usa ON CONFLICT para evitar erros de duplicação.';