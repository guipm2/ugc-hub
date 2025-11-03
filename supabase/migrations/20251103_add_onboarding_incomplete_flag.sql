-- Migration: Adicionar flag para indicar dados incompletos do onboarding
-- Data: 2025-11-03
-- Descrição: Campo para sinalizar quando o onboarding foi completado mas dados não foram salvos corretamente

DO $$
BEGIN
    -- Adicionar flag de dados incompletos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_data_incomplete') THEN
        ALTER TABLE profiles ADD COLUMN onboarding_data_incomplete boolean DEFAULT false;
        COMMENT ON COLUMN profiles.onboarding_data_incomplete IS 'Indica se o onboarding foi marcado como completo mas alguns dados não foram salvos corretamente';
    END IF;
END $$;
