-- EXECUTAR NO SQL EDITOR DO SUPABASE
-- Este SQL corrige a tabela analysts para usar auth.users.id como chave primária

-- 1. Primeiro, remover todas as constraints que dependem da tabela analysts
ALTER TABLE IF EXISTS opportunities DROP CONSTRAINT IF EXISTS opportunities_analyst_id_fkey;
ALTER TABLE IF EXISTS conversations DROP CONSTRAINT IF EXISTS conversations_analyst_id_fkey;

-- 2. Recriar tabela analysts com estrutura correta
DROP TABLE IF EXISTS analysts CASCADE;

CREATE TABLE analysts (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  name text,
  company text,
  role user_role DEFAULT 'analyst',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Recriar foreign keys em todas as tabelas que referenciam analysts
ALTER TABLE opportunities 
ADD CONSTRAINT opportunities_analyst_id_fkey 
FOREIGN KEY (analyst_id) REFERENCES analysts(id) ON DELETE CASCADE;

ALTER TABLE conversations 
ADD CONSTRAINT conversations_analyst_id_fkey 
FOREIGN KEY (analyst_id) REFERENCES analysts(id) ON DELETE CASCADE;

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_analysts_id ON analysts(id);
CREATE INDEX IF NOT EXISTS idx_analysts_email ON analysts(email);

-- 5. Ativar Row Level Security (RLS) na tabela analysts
ALTER TABLE analysts ENABLE ROW LEVEL SECURITY;

-- 6. Criar políticas de segurança para analysts
-- Política: Analistas só podem ver/editar seus próprios dados
CREATE POLICY "Analysts can view own data" ON analysts
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Analysts can update own data" ON analysts
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Analysts can insert own data" ON analysts
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Política adicional: Permitir que o sistema crie registros automaticamente
-- (Para o processo de signup automático no AnalystAuthContext)
CREATE POLICY "Allow system insert for new users" ON analysts
  FOR INSERT WITH CHECK (true);

-- 7. Adicionar coluna company_link na tabela opportunities (necessária para criação de oportunidades)
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS company_link TEXT;

-- Comentário para documentação
COMMENT ON COLUMN opportunities.company_link IS 'Link to company website or social media profile';

-- 8. Verificar se funcionou
SELECT 'Tabela analysts criada com sucesso e company_link adicionada!' as status;