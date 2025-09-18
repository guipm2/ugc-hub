/*
  # Criar sistema de analistas e oportunidades

  1. Novas Tabelas
    - `analysts`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `name` (text)
      - `company` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `opportunities`
      - `id` (uuid, primary key)
      - `analyst_id` (uuid, foreign key)
      - `title` (text)
      - `company` (text)
      - `description` (text)
      - `budget_min` (integer)
      - `budget_max` (integer)
      - `location` (text)
      - `content_type` (text)
      - `requirements` (jsonb)
      - `deadline` (date)
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `profiles` (atualizar tabela existente)
      - Adicionar campos necessários para criadores

  2. Segurança
    - Enable RLS em todas as tabelas
    - Políticas para analistas gerenciarem suas oportunidades
    - Políticas para criadores visualizarem oportunidades
*/

-- Criar tabela de analistas
CREATE TABLE IF NOT EXISTS analysts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  company text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de oportunidades
CREATE TABLE IF NOT EXISTS opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analyst_id uuid REFERENCES analysts(id) ON DELETE CASCADE,
  title text NOT NULL,
  company text NOT NULL,
  description text NOT NULL,
  budget_min integer NOT NULL,
  budget_max integer NOT NULL,
  location text NOT NULL DEFAULT 'Remoto',
  content_type text NOT NULL,
  requirements jsonb DEFAULT '[]'::jsonb,
  deadline date NOT NULL,
  status text NOT NULL DEFAULT 'ativo',
  candidates_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Atualizar tabela profiles se não existir
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  bio text,
  location text,
  niche text,
  followers text,
  website text,
  phone text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE analysts ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para analistas
CREATE POLICY "Analysts can read own data"
  ON analysts
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Analysts can update own data"
  ON analysts
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text);

-- Políticas para oportunidades
CREATE POLICY "Anyone can read opportunities"
  ON opportunities
  FOR SELECT
  TO authenticated
  USING (status = 'ativo');

CREATE POLICY "Analysts can manage own opportunities"
  ON opportunities
  FOR ALL
  TO authenticated
  USING (analyst_id IN (SELECT id FROM analysts WHERE auth.uid()::text = id::text));

-- Políticas para profiles
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Analysts can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM analysts WHERE auth.uid()::text = id::text));

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_analysts_updated_at
  BEFORE UPDATE ON analysts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();