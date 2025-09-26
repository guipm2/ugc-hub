-- Verificar estrutura atual da tabela notifications
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Se a coluna analyst_id não existir, adicionar
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS analyst_id UUID REFERENCES profiles(id);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_notifications_analyst_id ON notifications(analyst_id);

-- Verificar novamente após alteração
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;