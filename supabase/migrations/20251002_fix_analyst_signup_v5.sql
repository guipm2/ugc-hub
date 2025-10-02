-- Migration: Debug and fix user_metadata for analyst signup (v5)
-- Date: 2025-10-02

-- 1. Primeiro vamos criar uma função para verificar os dados atuais
CREATE OR REPLACE FUNCTION debug_user_metadata()
RETURNS TABLE(user_id uuid, email text, metadata jsonb, email_confirmed boolean) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data,
    au.email_confirmed_at IS NOT NULL as email_confirmed
  FROM auth.users au
  ORDER BY au.created_at DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Limpar usuários de teste existentes para começar limpo
DELETE FROM public.analysts WHERE email LIKE '%test%' OR email LIKE '%exemplo%' OR email LIKE '%@gmail.com';
DELETE FROM public.profiles WHERE email LIKE '%test%' OR email LIKE '%exemplo%' OR email LIKE '%@gmail.com';

-- 3. Criar função melhorada que verifica múltiplas formas de identificar analista
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_analyst boolean := false;
  user_name text;
  user_company text;
BEGIN
  -- Debug: log completo
  RAISE LOG 'handle_new_user called for user: % with full metadata: %', NEW.email, NEW.raw_user_meta_data;
  
  -- Verificar múltiplas formas de identificar um analista
  -- 1. Via role no metadata
  IF NEW.raw_user_meta_data->>'role' = 'analyst' THEN
    is_analyst := true;
    RAISE LOG 'Analyst identified via role metadata for: %', NEW.email;
  END IF;
  
  -- 2. Via URL de confirmação (se contém /analysts/)
  IF NEW.confirmation_token IS NOT NULL AND NEW.email_confirm_url LIKE '%/analysts/%' THEN
    is_analyst := true;
    RAISE LOG 'Analyst identified via confirmation URL for: %', NEW.email;
  END IF;
  
  -- 3. Via domínio específico ou padrão de email (backup)
  -- Você pode adicionar regras específicas aqui se necessário
  
  -- Extrair nome e empresa do metadata
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', '');
  user_company := COALESCE(NEW.raw_user_meta_data->>'company', '');
  
  IF is_analyst THEN
    RAISE LOG 'Creating analyst profile for: % (name: %, company: %)', NEW.email, user_name, user_company;
    
    -- Desabilitar RLS temporariamente
    PERFORM set_config('row_security', 'off', true);
    
    -- Criar perfil de analista
    INSERT INTO public.profiles (id, email, role, name, company, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      'analyst'::user_role,
      user_name,
      user_company,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      role = 'analyst'::user_role,
      name = EXCLUDED.name,
      company = EXCLUDED.company,
      updated_at = NOW();
    
    -- Criar registro na tabela analysts
    INSERT INTO public.analysts (id, email, name, company, role, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      user_name,
      user_company,
      'analyst'::user_role,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      company = EXCLUDED.company,
      role = 'analyst'::user_role,
      updated_at = NOW();
      
    -- Restaurar RLS
    PERFORM set_config('row_security', 'on', true);
      
    RAISE LOG 'Analyst profile created successfully for: %', NEW.email;
      
  ELSE
    RAISE LOG 'Creating creator profile for: %', NEW.email;
    
    -- Desabilitar RLS temporariamente
    PERFORM set_config('row_security', 'off', true);
    
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
      role = 'creator'::user_role,
      updated_at = NOW();
      
    -- Restaurar RLS
    PERFORM set_config('row_security', 'on', true);
      
    RAISE LOG 'Creator profile created successfully for: %', NEW.email;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Restaurar RLS em caso de erro
  PERFORM set_config('row_security', 'on', true);
  RAISE LOG 'Error in handle_new_user for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Função de confirmação melhorada
CREATE OR REPLACE FUNCTION handle_user_confirmation()
RETURNS trigger AS $$
DECLARE
  is_analyst boolean := false;
  user_name text;
  user_company text;
BEGIN
  RAISE LOG 'handle_user_confirmation called for user: % with metadata: %', NEW.email, NEW.raw_user_meta_data;
  
  -- Verificar se já existe perfil criado
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RAISE LOG 'No profile found, creating one for: %', NEW.email;
    
    -- Verificar se é analista via metadata
    IF NEW.raw_user_meta_data->>'role' = 'analyst' THEN
      is_analyst := true;
    END IF;
    
    -- Extrair dados do metadata
    user_name := COALESCE(NEW.raw_user_meta_data->>'name', '');
    user_company := COALESCE(NEW.raw_user_meta_data->>'company', '');
    
    -- Desabilitar RLS
    PERFORM set_config('row_security', 'off', true);
    
    IF is_analyst THEN
      RAISE LOG 'Creating analyst profile on confirmation for: %', NEW.email;
      
      -- Criar perfil de analista
      INSERT INTO public.profiles (id, email, role, name, company, created_at, updated_at)
      VALUES (NEW.id, NEW.email, 'analyst'::user_role, user_name, user_company, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        role = 'analyst'::user_role,
        name = EXCLUDED.name,
        company = EXCLUDED.company,
        updated_at = NOW();
      
      -- Criar registro na tabela analysts
      INSERT INTO public.analysts (id, email, name, company, role, created_at, updated_at)
      VALUES (NEW.id, NEW.email, user_name, user_company, 'analyst'::user_role, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        company = EXCLUDED.company,
        role = 'analyst'::user_role,
        updated_at = NOW();
    ELSE
      RAISE LOG 'Creating creator profile on confirmation for: %', NEW.email;
      
      -- Criar perfil de criador
      INSERT INTO public.profiles (id, email, role, created_at, updated_at)
      VALUES (NEW.id, NEW.email, 'creator'::user_role, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        role = 'creator'::user_role,
        updated_at = NOW();
    END IF;
    
    -- Restaurar RLS
    PERFORM set_config('row_security', 'on', true);
    
  ELSE
    RAISE LOG 'Profile already exists for: %', NEW.email;
    
    -- Se o perfil existe mas é criador e deveria ser analista, corrigir
    IF NEW.raw_user_meta_data->>'role' = 'analyst' THEN
      PERFORM set_config('row_security', 'off', true);
      
      UPDATE public.profiles 
      SET role = 'analyst'::user_role, 
          name = COALESCE(NEW.raw_user_meta_data->>'name', name),
          company = COALESCE(NEW.raw_user_meta_data->>'company', company),
          updated_at = NOW()
      WHERE id = NEW.id;
      
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
        name = EXCLUDED.name,
        company = EXCLUDED.company,
        role = 'analyst'::user_role,
        updated_at = NOW();
      
      PERFORM set_config('row_security', 'on', true);
      
      RAISE LOG 'Corrected profile from creator to analyst for: %', NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('row_security', 'on', true);
  RAISE LOG 'Error in handle_user_confirmation for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Recriar os triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW 
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_user_confirmation();

-- 6. Função para corrigir usuários existentes
CREATE OR REPLACE FUNCTION fix_existing_analyst_users()
RETURNS text AS $$
DECLARE
  user_record RECORD;
  result_text text := '';
BEGIN
  -- Procurar usuários que têm role=analyst no metadata mas são creators
  FOR user_record IN 
    SELECT au.id, au.email, au.raw_user_meta_data, p.role
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.id
    WHERE au.raw_user_meta_data->>'role' = 'analyst'
    AND (p.role != 'analyst' OR p.role IS NULL)
  LOOP
    PERFORM set_config('row_security', 'off', true);
    
    -- Atualizar ou criar perfil como analista
    INSERT INTO public.profiles (id, email, role, name, company, created_at, updated_at)
    VALUES (
      user_record.id,
      user_record.email,
      'analyst'::user_role,
      COALESCE(user_record.raw_user_meta_data->>'name', ''),
      COALESCE(user_record.raw_user_meta_data->>'company', ''),
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'analyst'::user_role,
      name = COALESCE(user_record.raw_user_meta_data->>'name', profiles.name),
      company = COALESCE(user_record.raw_user_meta_data->>'company', profiles.company),
      updated_at = NOW();
    
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
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      company = EXCLUDED.company,
      role = 'analyst'::user_role,
      updated_at = NOW();
    
    PERFORM set_config('row_security', 'on', true);
    
    result_text := result_text || 'Fixed user: ' || user_record.email || '; ';
  END LOOP;
  
  IF result_text = '' THEN
    result_text := 'No users needed fixing.';
  END IF;
  
  RETURN result_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;