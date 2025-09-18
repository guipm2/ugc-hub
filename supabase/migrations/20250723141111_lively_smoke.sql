/*
  # Implementar Sistema de Papéis e RLS

  1. Novos Campos e Estruturas
    - Adicionar campo `role` nas tabelas de usuários
    - Adicionar campo `created_by` na tabela opportunities
    - Criar enum para roles

  2. Políticas RLS
    - Analistas: podem criar e gerenciar apenas suas próprias oportunidades
    - Criadores: podem visualizar todas as oportunidades, mas não editar
    - Segurança por papel (role-based access)

  3. Funções de Apoio
    - Função para verificar role do usuário
    - Triggers para definir roles automaticamente
*/

-- Criar enum para roles
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('creator', 'analyst');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Adicionar campo role na tabela profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role user_role DEFAULT 'creator';
  END IF;
END $$;

-- Adicionar campo role na tabela analysts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analysts' AND column_name = 'role'
  ) THEN
    ALTER TABLE analysts ADD COLUMN role user_role DEFAULT 'analyst';
  END IF;
END $$;

-- Adicionar campo created_by na tabela opportunities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunities' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Atualizar oportunidades existentes para ter created_by baseado no analyst_id
UPDATE opportunities 
SET created_by = analyst_id 
WHERE created_by IS NULL AND analyst_id IS NOT NULL;

-- Função para obter o role do usuário atual
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
DECLARE
  user_role_result user_role;
BEGIN
  -- Primeiro verifica se é um analista
  SELECT role INTO user_role_result
  FROM analysts
  WHERE id = auth.uid();
  
  IF user_role_result IS NOT NULL THEN
    RETURN user_role_result;
  END IF;
  
  -- Se não for analista, verifica se é um criador
  SELECT role INTO user_role_result
  FROM profiles
  WHERE id = auth.uid();
  
  IF user_role_result IS NOT NULL THEN
    RETURN user_role_result;
  END IF;
  
  -- Default para creator se não encontrar
  RETURN 'creator'::user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário é analista
CREATE OR REPLACE FUNCTION is_analyst()
RETURNS boolean AS $$
BEGIN
  RETURN get_user_role() = 'analyst';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário é criador
CREATE OR REPLACE FUNCTION is_creator()
RETURNS boolean AS $$
BEGIN
  RETURN get_user_role() = 'creator';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover políticas existentes da tabela opportunities
DROP POLICY IF EXISTS "Analysts can manage own opportunities" ON opportunities;
DROP POLICY IF EXISTS "Anyone can read opportunities" ON opportunities;

-- Políticas RLS para a tabela opportunities

-- 1. Analistas podem inserir oportunidades (serão automaticamente suas)
CREATE POLICY "Analysts can create opportunities"
  ON opportunities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_analyst() AND 
    created_by = auth.uid()
  );

-- 2. Analistas podem visualizar apenas suas próprias oportunidades
CREATE POLICY "Analysts can view own opportunities"
  ON opportunities
  FOR SELECT
  TO authenticated
  USING (
    (is_analyst() AND created_by = auth.uid()) OR
    is_creator()
  );

-- 3. Analistas podem atualizar apenas suas próprias oportunidades
CREATE POLICY "Analysts can update own opportunities"
  ON opportunities
  FOR UPDATE
  TO authenticated
  USING (is_analyst() AND created_by = auth.uid())
  WITH CHECK (is_analyst() AND created_by = auth.uid());

-- 4. Analistas podem deletar apenas suas próprias oportunidades
CREATE POLICY "Analysts can delete own opportunities"
  ON opportunities
  FOR DELETE
  TO authenticated
  USING (is_analyst() AND created_by = auth.uid());

-- Atualizar políticas da tabela analysts

-- Remover políticas existentes
DROP POLICY IF EXISTS "Allow analyst signup" ON analysts;
DROP POLICY IF EXISTS "Analysts can read own data" ON analysts;
DROP POLICY IF EXISTS "Analysts can update own data" ON analysts;
DROP POLICY IF EXISTS "Analysts can delete own data" ON analysts;

-- Novas políticas para analysts
CREATE POLICY "Allow analyst signup"
  ON analysts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Analysts can read own data"
  ON analysts
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Analysts can update own data"
  ON analysts
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Analysts can delete own data"
  ON analysts
  FOR DELETE
  TO authenticated
  USING (id = auth.uid());

-- Atualizar políticas da tabela profiles

-- Remover políticas existentes que podem conflitar
DROP POLICY IF EXISTS "Analysts can read all profiles" ON profiles;

-- Manter políticas existentes e adicionar nova para analistas
CREATE POLICY "Analysts can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (is_analyst());

-- Trigger para definir created_by automaticamente ao inserir oportunidade
CREATE OR REPLACE FUNCTION set_opportunity_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS set_opportunity_created_by_trigger ON opportunities;
CREATE TRIGGER set_opportunity_created_by_trigger
  BEFORE INSERT ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION set_opportunity_created_by();

-- Atualizar roles existentes
UPDATE profiles SET role = 'creator' WHERE role IS NULL;
UPDATE analysts SET role = 'analyst' WHERE role IS NULL;