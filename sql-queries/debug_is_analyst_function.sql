-- EXECUTAR NO SQL EDITOR DO SUPABASE
-- Verificar a função is_analyst() que está causando problema

-- 1. Verificar se a função is_analyst() existe
SELECT 
    'Function Exists:' as test,
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE proname = 'is_analyst';

-- 2. Testar a função diretamente (se existir)
SELECT 
    'Function Test:' as test,
    is_analyst() as is_analyst_result;

-- 3. Verificar auth.uid() atual
SELECT 
    'Auth Test:' as test,
    auth.uid() as current_uid,
    auth.uid() = '39cf3187-71af-43a6-ba84-43c67062e83a' as uid_matches;

-- 4. Testar a condição completa da política
SELECT 
    'Policy Condition Test:' as test,
    auth.uid() as current_uid,
    case 
        when auth.uid() is not null then 'AUTH_UID_EXISTS'
        else 'NO_AUTH_UID'
    end as auth_status,
    case 
        when auth.uid() = '39cf3187-71af-43a6-ba84-43c67062e83a' then 'UID_MATCH'
        else 'UID_NO_MATCH'
    end as uid_match_test;

-- 5. Tentar acessar profiles usando apenas auth.uid() (ignorando is_analyst)
SELECT 
    'Direct Auth Test:' as test,
    id,
    email,
    role
FROM profiles 
WHERE auth.uid() = id
LIMIT 1;