-- EXECUTAR NO SQL EDITOR DO SUPABASE
-- Verificar políticas de RLS na tabela profiles

-- 1. Verificar se RLS está ativo na tabela profiles
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- 2. Listar todas as políticas da tabela profiles
SELECT 
    schemaname,
    tablename, 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- 3. Testar se o usuário atual consegue acessar profiles
SELECT 
    'User can access profiles:' as test,
    count(*) as profile_count
FROM profiles;

-- 4. Verificar se existe perfil para o usuário específico
SELECT 
    'Profile exists for user:' as test,
    id,
    email,
    role,
    created_at
FROM profiles 
WHERE id = '39cf3187-71af-43a6-ba84-43c67062e83a';

-- 5. Verificar qual é o auth.uid() atual
SELECT 'Current auth uid:' as test, auth.uid() as current_user_id;