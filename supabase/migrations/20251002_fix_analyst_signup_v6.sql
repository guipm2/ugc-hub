-- Migration: Create analyst profile immediately on signup (v6)
-- Date: 2025-10-02

-- 1. Limpar dados de teste para começar limpo
DELETE FROM public.analysts WHERE email LIKE '%test%' OR email LIKE '%exemplo%' OR email LIKE '%@gmail.com';
DELETE FROM public.profiles WHERE email LIKE '%test%' OR email LIKE '%exemplo%' OR email LIKE '%@gmail.com';

-- 2. Função simplificada que cria o perfil IMEDIATAMENTE no momento do signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_name text;
  user_company text;
BEGIN
  -- Debug: log para verificar se a função está sendo chamada
  RAISE LOG 'handle_new_user called for user: % with metadata: %', NEW.email, NEW.raw_user_meta_data;
  
  -- Extrair dados do metadata
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', '');
  user_company := COALESCE(NEW.raw_user_meta_data->>'company', '');
  
  -- Desabilitar RLS para garantir que as inserções funcionem
  PERFORM set_config('row_security', 'off', true);
  
  -- Verificar se é um analista baseado no user_metadata
  IF NEW.raw_user_meta_data->>'role' = 'analyst' THEN
    RAISE LOG 'Creating analyst profile IMMEDIATELY for: % (name: %, company: %)', NEW.email, user_name, user_company;
    
    -- Criar perfil de analista IMEDIATAMENTE
    INSERT INTO public.profiles (id, email, role, name, company, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      'analyst'::user_role,
      user_name,
      user_company,
      NOW(),
      NOW()
    );
    
    -- Criar registro na tabela analysts IMEDIATAMENTE
    INSERT INTO public.analysts (id, email, name, company, role, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      user_name,
      user_company,
      'analyst'::user_role,
      NOW(),
      NOW()
    );
      
    RAISE LOG 'Analyst profile created successfully IMMEDIATELY for: %', NEW.email;
      
  ELSE
    RAISE LOG 'Creating creator profile IMMEDIATELY for: %', NEW.email;
    
    -- Criar perfil de criador IMEDIATAMENTE
    INSERT INTO public.profiles (id, email, role, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      'creator'::user_role,
      NOW(),
      NOW()
    );
      
    RAISE LOG 'Creator profile created successfully IMMEDIATELY for: %', NEW.email;
  END IF;
  
  -- Restaurar RLS
  PERFORM set_config('row_security', 'on', true);
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Restaurar RLS em caso de erro
  PERFORM set_config('row_security', 'on', true);
  RAISE LOG 'Error in handle_new_user for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Remover o trigger de confirmação (não precisamos mais dele)
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;

-- 4. Recriar apenas o trigger de criação (que vai funcionar IMEDIATAMENTE)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 5. Garantir que as políticas RLS permitam leitura para usuários não confirmados
DROP POLICY IF EXISTS "Analysts can read own data" ON analysts;
CREATE POLICY "Analysts can read own data"
  ON analysts
  FOR SELECT
  TO authenticated, anon
  USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated, anon
  USING (auth.uid() = id);

-- 6. Função para corrigir usuários existentes que foram criados errado
CREATE OR REPLACE FUNCTION fix_existing_analyst_users()
RETURNS text AS $$
DECLARE
  user_record RECORD;
  result_text text := '';
BEGIN
  PERFORM set_config('row_security', 'off', true);
  
  -- Procurar usuários que têm role=analyst no metadata mas não têm perfil correto
  FOR user_record IN 
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.id
    WHERE au.raw_user_meta_data->>'role' = 'analyst'
    AND (p.role != 'analyst' OR p.role IS NULL)
  LOOP
    
    -- Deletar perfil errado se existir
    DELETE FROM public.profiles WHERE id = user_record.id;
    DELETE FROM public.analysts WHERE id = user_record.id;
    
    -- Criar perfil correto como analista
    INSERT INTO public.profiles (id, email, role, name, company, created_at, updated_at)
    VALUES (
      user_record.id,
      user_record.email,
      'analyst'::user_role,
      COALESCE(user_record.raw_user_meta_data->>'name', ''),
      COALESCE(user_record.raw_user_meta_data->>'company', ''),
      NOW(),
      NOW()
    );
    
    -- Criar registro na tabela analysts
    INSERT INTO public.analysts (id, email, name, company, role, created_at, updated_at)
    VALUES (
      user_record.id,
      user_record.email,
      COALESCE(user_record.raw_user_meta_data->>'name', ''),
      COALESCE(user_record.raw_user_meta_data->>'company', ''),
      'analyst'::user_role,
      NOW(),
      NOW()
    );
    
    result_text := result_text || 'Fixed user: ' || user_record.email || '; ';
  END LOOP;
  
  PERFORM set_config('row_security', 'on', true);
  
  IF result_text = '' THEN
    result_text := 'No users needed fixing.';
  END IF;
  
  RETURN result_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Executar a correção de usuários existentes automaticamente
SELECT fix_existing_analyst_users();