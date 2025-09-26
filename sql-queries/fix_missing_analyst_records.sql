-- Script para criar registros faltantes na tabela analysts
-- Para analistas que existem na tabela profiles mas não na tabela analysts

INSERT INTO analysts (id, email, name, company, role)
SELECT 
  p.id,
  p.email,
  p.name,
  p.company,
  'analyst'::user_role
FROM profiles p
WHERE p.role = 'analyst'
  AND NOT EXISTS (
    SELECT 1 FROM analysts a WHERE a.id = p.id
  );

-- Verificar quantos registros foram criados
SELECT 'Registros de analistas sincronizados!' as status,
       COUNT(*) as total_analysts
FROM analysts;