-- Migration: Fix trigger timing for analyst signup (v4)
-- Date: 2025-10-02

-- 1. Verificar se o problema é timing do trigger
-- O trigger pode precisar ser executado no momento da confirmação, não na criação

-- Primeiro, vamos criar uma função que pode ser chamada manualmente para debug
CREATE OR REPLACE FUNCTION create_analyst_profile(user_id uuid, user_email text, user_name text, user_company text)
RETURNS boolean AS $$
BEGIN
  -- Tentar criar perfil de analista
  INSERT INTO public.profiles (id, email, role, name, company, created_at, updated_at)
  VALUES (
    user_id,
    user_email,
    'analyst'::user_role,
    user_name,
    user_company,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    name = EXCLUDED.name,
    company = EXCLUDED.company,
    updated_at = NOW();

  -- Tentar criar registro na tabela analysts
  INSERT INTO public.analysts (id, email, name, company, role, created_at, updated_at)
  VALUES (
    user_id,
    user_email,
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
    role = EXCLUDED.role,
    updated_at = NOW();

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in create_analyst_profile: %', SQLERRM;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Modificar a função handle_new_user para ser mais agressiva com as permissões
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Debug: log para ver se a função está sendo chamada
  RAISE LOG 'handle_new_user called for user: % with metadata: %', NEW.email, NEW.raw_user_meta_data;
  
  -- Verificar se é um analista baseado no user_metadata
  IF NEW.raw_user_meta_data->>'role' = 'analyst' THEN
    RAISE LOG 'Creating analyst profile for: %', NEW.email;
    
    -- Usar SECURITY DEFINER para bypasser RLS temporariamente
    PERFORM set_config('row_security', 'off', true);
    
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
      
    -- Restaurar RLS
    PERFORM set_config('row_security', 'on', true);
      
    RAISE LOG 'Analyst profile created successfully for: %', NEW.email;
      
  ELSE
    RAISE LOG 'Creating creator profile for: %', NEW.email;
    
    -- Usar SECURITY DEFINER para bypasser RLS temporariamente
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
      role = EXCLUDED.role,
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
  RETURN NEW; -- Não falhar o signup mesmo se houver erro no trigger
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Também criar trigger para confirmação de email (caso o timing seja esse)
CREATE OR REPLACE FUNCTION handle_user_confirmation()
RETURNS trigger AS $$
BEGIN
  -- Este trigger roda quando o usuário confirma o email
  RAISE LOG 'handle_user_confirmation called for user: %', NEW.email;
  
  -- Verificar se já existe perfil criado
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RAISE LOG 'No profile found, creating one for: %', NEW.email;
    
    -- Verificar se é um analista baseado no user_metadata
    IF NEW.raw_user_meta_data->>'role' = 'analyst' THEN
      -- Usar função auxiliar
      PERFORM create_analyst_profile(
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'company', '')
      );
    ELSE
      -- Criar perfil de criador
      PERFORM set_config('row_security', 'off', true);
      INSERT INTO public.profiles (id, email, role, created_at, updated_at)
      VALUES (NEW.id, NEW.email, 'creator'::user_role, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
      PERFORM set_config('row_security', 'on', true);
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('row_security', 'on', true);
  RAISE LOG 'Error in handle_user_confirmation for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Criar trigger para confirmação também
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW 
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_user_confirmation();

-- 5. Manter o trigger original também
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 6. Desabilitar RLS temporariamente nas tabelas durante signup
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE analysts DISABLE ROW LEVEL SECURITY;

-- 7. Reabilitar RLS (vai funcionar com as políticas que já existem)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysts ENABLE ROW LEVEL SECURITY;