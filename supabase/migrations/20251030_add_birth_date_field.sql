-- Migration: Adicionar campo birth_date para armazenar data de nascimento
-- Data: 2025-10-30
-- Descrição: Campo necessário para o onboarding de creators

DO $$
BEGIN
    -- Adicionar campo de data de nascimento
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'birth_date') THEN
        ALTER TABLE profiles ADD COLUMN birth_date date;
        COMMENT ON COLUMN profiles.birth_date IS 'Data de nascimento do criador';
    END IF;
END $$;
