-- EXECUTAR NO SQL EDITOR DO SUPABASE
-- Verificar políticas detalhadas da tabela profiles

-- 1. Verificar se RLS está ativo
SELECT 
    'RLS Status:' as test,
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- 2. Listar TODAS as políticas da tabela profiles
SELECT 
    'Current Policies:' as test,
    policyname as policy_name,
    cmd as operation,
    permissive,
    roles,
    qual as using_condition,
    with_check as with_check_condition
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY cmd, policyname;

-- 3. Testar acesso atual (deve falhar se RLS estiver bloqueando)
SELECT 
    'Current Access Test:' as test,
    count(*) as accessible_profiles
FROM profiles;

-- 4. Verificar auth context atual
SELECT 
    'Auth Context:' as test,
    auth.uid() as current_uid,
    auth.role() as current_role,
    case 
        when auth.uid() is null then 'NO_AUTH' 
        else 'AUTHENTICATED' 
    end as auth_status;

-- 5. Teste específico para o usuário creator
SELECT 
    'Creator User Test:' as test,
    p.id,
    p.email,
    p.role,
    case 
        when auth.uid() = p.id then 'MATCH' 
        else 'NO_MATCH' 
    end as uid_match
FROM profiles p 
WHERE p.id = '39cf3187-71af-43a6-ba84-43c67062e83a';

-- 6. Verificar se existem políticas conflitantes
SELECT 
    'Policy Conflicts:' as test,
    policyname,
    cmd,
    qual,
    with_check,
    case 
        when qual ILIKE '%auth.uid()%' then 'USES_AUTH_UID'
        when qual ILIKE '%role%' then 'USES_ROLE' 
        else 'OTHER_CONDITION'
    end as policy_type
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public';