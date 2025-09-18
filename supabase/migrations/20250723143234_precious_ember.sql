/*
  # Corrigir perfis de criadores

  1. Verificações e correções
    - Garantir que todos os usuários autenticados tenham perfil de criador
    - Definir role padrão como 'creator' onde estiver NULL
    - Verificar integridade dos dados

  2. Atualizações
    - Atualizar perfis existentes sem role definido
    - Garantir que função de criação de perfil funcione corretamente
*/

-- Atualizar perfis existentes que não têm role definido para 'creator'
UPDATE profiles 
SET role = 'creator'::user_role 
WHERE role IS NULL;

-- Garantir que a função de criação de perfil está funcionando
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Verificar se não é um analista
  IF NOT EXISTS (
    SELECT 1 FROM analysts WHERE id = NEW.id
  ) THEN
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

-- Recriar o trigger se não existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Verificar e corrigir dados inconsistentes
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Para cada usuário autenticado que não tem perfil
  FOR user_record IN 
    SELECT au.id, au.email 
    FROM auth.users au 
    LEFT JOIN profiles p ON au.id = p.id 
    WHERE p.id IS NULL 
    AND NOT EXISTS (SELECT 1 FROM analysts WHERE id = au.id)
  LOOP
    -- Criar perfil de criador
    INSERT INTO profiles (id, email, role, created_at, updated_at)
    VALUES (
      user_record.id,
      user_record.email,
      'creator'::user_role,
      NOW(),
      NOW()
    );
  END LOOP;
END $$;