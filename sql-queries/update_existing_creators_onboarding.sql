-- Script para atualizar usuários existentes para requerem onboarding
-- Execute este script apenas se quiser que todos os criadores existentes passem pelo onboarding

-- Opção 1: Marcar todos os criadores existentes como não tendo completado o onboarding
-- UPDATE profiles 
-- SET onboarding_completed = false, onboarding_step = 0 
-- WHERE role = 'creator' AND onboarding_completed IS NULL;

-- Opção 2: Marcar apenas criadores sem dados essenciais como não tendo completado o onboarding
-- UPDATE profiles 
-- SET onboarding_completed = false, onboarding_step = 0 
-- WHERE role = 'creator' 
--   AND onboarding_completed IS NULL
--   AND (age IS NULL OR gender IS NULL OR niches IS NULL OR pix_key IS NULL OR full_name IS NULL);

-- Opção 3: Marcar todos os criadores existentes como tendo completado o onboarding (para evitar interrupção)
UPDATE profiles 
SET onboarding_completed = true, 
    onboarding_step = 4,
    onboarding_completed_at = NOW()
WHERE role = 'creator' 
  AND onboarding_completed IS NULL;

-- Comentário: A Opção 3 é recomendada para não interromper o fluxo dos usuários existentes
-- Se quiser que façam o onboarding, use a Opção 1 ou 2