-- EXECUTAR NO SQL EDITOR DO SUPABASE
-- Script para diagnosticar problemas de autenticação e sessão

-- 1. Verificar usuários na auth.users
SELECT 
    'Auth Users:' as test,
    count(*) as total_users,
    count(case when email_confirmed_at is not null then 1 end) as confirmed_users,
    count(case when deleted_at is null then 1 end) as active_users
FROM auth.users;

-- 2. Verificar perfis na tabela profiles
SELECT 
    'Profiles:' as test,
    count(*) as total_profiles,
    count(case when role = 'creator' then 1 end) as creator_profiles,
    count(case when role = 'analyst' then 1 end) as analyst_profiles
FROM profiles;

-- 3. Verificar se há usuários sem perfil
SELECT 
    'Users Without Profiles:' as test,
    u.id,
    u.email,
    u.created_at,
    u.email_confirmed_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL
AND u.deleted_at IS NULL
LIMIT 5;

-- 4. Verificar se há perfis sem usuário (órfãos)
SELECT 
    'Orphaned Profiles:' as test,
    p.id,
    p.email,
    p.role,
    p.created_at
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL
LIMIT 5;

-- 5. Verificar sessões ativas recentes (últimas 24h)
SELECT 
    'Recent Sessions:' as test,
    count(*) as active_sessions_24h
FROM auth.sessions
WHERE created_at > now() - interval '24 hours'
AND deleted_at IS NULL;

-- 6. Verificar política RLS para profiles
SELECT 
    'RLS Policies for Profiles:' as test,
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'profiles' 
AND schemaname = 'public';

-- 7. Testar acesso direto à tabela profiles
SELECT 
    'Direct Profile Access Test:' as test,
    count(*) as accessible_profiles,
    min(created_at) as oldest_profile,
    max(created_at) as newest_profile
FROM profiles;

-- 8. Verificar se RLS está ativo
SELECT 
    'RLS Status:' as test,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'profiles' 
AND schemaname = 'public';

-- 9. Verificar refresh tokens recentes
SELECT 
    'Recent Refresh Tokens:' as test,
    count(*) as active_tokens
FROM auth.refresh_tokens
WHERE created_at > now() - interval '24 hours'
AND revoked_at IS NULL;

-- 10. Verificar se há problemas com metadata dos usuários
SELECT 
    'User Metadata Check:' as test,
    u.id,
    u.email,
    u.raw_user_meta_data,
    p.name,
    p.role
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.deleted_at IS NULL
AND u.email_confirmed_at IS NOT NULL
ORDER BY u.created_at DESC
LIMIT 10;