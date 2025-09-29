-- EXECUTAR NO SQL EDITOR DO SUPABASE
-- Debug de carregamento infinito no AuthContext

-- 1. Verificar se o usuário existe na auth.users
SELECT 
    'Auth Users Check:' as test,
    id,
    email,
    email_confirmed_at,
    created_at,
    updated_at
FROM auth.users 
WHERE id = '39cf3187-71af-43a6-ba84-43c67062e83a';

-- 2. Verificar se o perfil existe na tabela profiles
SELECT 
    'Profiles Check:' as test,
    id,
    email,
    name,
    role,
    terms_accepted,
    created_at,
    updated_at
FROM profiles 
WHERE id = '39cf3187-71af-43a6-ba84-43c67062e83a';

-- 3. Verificar RLS da tabela profiles
SELECT 
    'RLS Status:' as test,
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- 4. Verificar políticas RLS
SELECT 
    'RLS Policies:' as test,
    policyname as policy_name,
    cmd as operation,
    permissive,
    roles,
    qual as using_condition
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY cmd, policyname;

-- 5. Tentar criar o perfil manualmente se não existir
INSERT INTO profiles (
    id,
    email,
    name,
    role,
    terms_accepted,
    terms_accepted_at,
    terms_version,
    created_at,
    updated_at
) VALUES (
    '39cf3187-71af-43a6-ba84-43c67062e83a',
    (SELECT email FROM auth.users WHERE id = '39cf3187-71af-43a6-ba84-43c67062e83a'),
    COALESCE(
        (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = '39cf3187-71af-43a6-ba84-43c67062e83a'),
        'Creator User'
    ),
    'creator',
    true,
    now(),
    '1.0',
    now(),
    now()
) ON CONFLICT (id) DO UPDATE SET
    updated_at = now(),
    role = 'creator',
    terms_accepted = true;

-- 6. Verificar se o perfil foi criado
SELECT 
    'Final Check:' as test,
    p.id,
    p.email,
    p.name,
    p.role,
    p.terms_accepted,
    u.email as auth_email
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.id = '39cf3187-71af-43a6-ba84-43c67062e83a';

-- 7. Verificar todas as permissões em um teste prático
SELECT 
    'Permissions Test:' as test,
    auth.uid() as current_uid,
    count(*) as accessible_profiles
FROM profiles;