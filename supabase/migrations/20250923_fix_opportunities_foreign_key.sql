-- Fix opportunities table foreign key
-- Corrige a referência da tabela opportunities para usar profiles ao invés de analysts

-- 1. Primeiro, remover a constraint foreign key existente
ALTER TABLE opportunities 
DROP CONSTRAINT IF EXISTS opportunities_analyst_id_fkey;

-- 2. Atualizar a coluna analyst_id para usar created_by (que já aponta para profiles)
-- Como já temos created_by que é a referência correta, vamos usar ela
UPDATE opportunities 
SET analyst_id = created_by 
WHERE analyst_id IS NULL OR analyst_id NOT IN (
  SELECT id FROM profiles WHERE role = 'analyst'
);

-- 3. Adicionar nova constraint foreign key apontando para profiles
ALTER TABLE opportunities 
ADD CONSTRAINT opportunities_analyst_id_fkey 
FOREIGN KEY (analyst_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 4. Garantir que analyst_id sempre tenha valor quando criar nova oportunidade
-- (o código já faz isso, mas é uma garantia adicional)