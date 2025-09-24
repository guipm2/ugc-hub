-- EXECUTAR NO SQL EDITOR DO SUPABASE
-- Verificar informações de autenticação

-- 1. Verificar se há alguma sessão válida
SELECT 
    'Auth session info:' as test,
    auth.uid() as current_uid,
    auth.role() as current_role,
    auth.email() as current_email;

-- 2. Listar usuários no sistema
SELECT 
    'Users in system:' as test,
    id,
    email,
    email_confirmed_at,
    last_sign_in_at,
    created_at
FROM auth.users 
WHERE id = '39cf3187-71af-43a6-ba84-43c67062e83a';

-- 3. Verificar se perfil existe
SELECT 
    'Profile status:' as test,
    id,
    email,
    role,
    created_at
FROM public.profiles 
WHERE id = '39cf3187-71af-43a6-ba84-43c67062e83a';