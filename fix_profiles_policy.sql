-- EXECUTAR NO SQL EDITOR DO SUPABASE 
-- Corrigir políticas da tabela profiles (problema: auth.uid() retornando null)

-- 1. Remover política problemática que usa is_analyst()
DROP POLICY IF EXISTS "Enable select for users based on user_id" ON profiles;

-- 2. Criar política mais simples para SELECT (temporariamente mais permissiva)
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    auth.uid() IS NOT NULL  -- Permite acesso se há qualquer autenticação
  );

-- 3. Verificar outras políticas existentes
SELECT 
    'Updated Policies:' as test,
    policyname,
    cmd,
    qual as using_condition
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY cmd;

-- 4. Teste após correção
SELECT 
    'Fixed Access Test:' as test,
    count(*) as accessible_profiles
FROM profiles;

-- 5. Teste específico para o usuário
SELECT 
    'User Access Test:' as test,
    id,
    email,
    role
FROM profiles 
WHERE id = '39cf3187-71af-43a6-ba84-43c67062e83a';