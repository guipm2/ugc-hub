-- Migration: Adicionar campos necessários para onboarding de criadores
-- Data: 2025-10-01

-- Adicionar campos de qualificação
DO $$
BEGIN
    -- Perfil Instagram (opcional)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'instagram_url') THEN
        ALTER TABLE profiles ADD COLUMN instagram_url text;
    END IF;

    -- Perfil TikTok (opcional)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'tiktok_url') THEN
        ALTER TABLE profiles ADD COLUMN tiktok_url text;
    END IF;

    -- Site ou portfólio (opcional)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'portfolio_url') THEN
        ALTER TABLE profiles ADD COLUMN portfolio_url text;
    END IF;

    -- Idade
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'age') THEN
        ALTER TABLE profiles ADD COLUMN age integer;
    END IF;

    -- Gênero
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'gender') THEN
        ALTER TABLE profiles ADD COLUMN gender text;
    END IF;

    -- Nichos (array de strings para múltiplas tags)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'niches') THEN
        ALTER TABLE profiles ADD COLUMN niches text[];
    END IF;

    -- Dados bancários - Chave PIX
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'pix_key') THEN
        ALTER TABLE profiles ADD COLUMN pix_key text;
    END IF;

    -- Dados para contrato
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE profiles ADD COLUMN full_name text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'document_number') THEN
        ALTER TABLE profiles ADD COLUMN document_number text; -- CPF ou CNPJ
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'document_type') THEN
        ALTER TABLE profiles ADD COLUMN document_type text; -- 'cpf' ou 'cnpj'
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'address') THEN
        ALTER TABLE profiles ADD COLUMN address jsonb; -- Endereço completo como JSON
    END IF;

    -- Status do onboarding
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
        ALTER TABLE profiles ADD COLUMN onboarding_completed boolean DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_step') THEN
        ALTER TABLE profiles ADD COLUMN onboarding_step integer DEFAULT 0; -- 0=não iniciado, 1=qualificação, 2=bancário, 3=contrato, 4=completo
    END IF;

    -- Data de conclusão do onboarding
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed_at') THEN
        ALTER TABLE profiles ADD COLUMN onboarding_completed_at timestamptz;
    END IF;
END $$;

-- Comentários nas colunas para documentação
COMMENT ON COLUMN profiles.instagram_url IS 'URL do perfil Instagram do criador (opcional)';
COMMENT ON COLUMN profiles.tiktok_url IS 'URL do perfil TikTok do criador (opcional)';
COMMENT ON COLUMN profiles.portfolio_url IS 'URL do site ou portfólio do criador (opcional)';
COMMENT ON COLUMN profiles.age IS 'Idade do criador';
COMMENT ON COLUMN profiles.gender IS 'Gênero do criador';
COMMENT ON COLUMN profiles.niches IS 'Array de nichos/tags do criador';
COMMENT ON COLUMN profiles.pix_key IS 'Chave PIX para pagamentos';
COMMENT ON COLUMN profiles.full_name IS 'Nome completo para contratos';
COMMENT ON COLUMN profiles.document_number IS 'CPF ou CNPJ do criador';
COMMENT ON COLUMN profiles.document_type IS 'Tipo do documento: cpf ou cnpj';
COMMENT ON COLUMN profiles.address IS 'Endereço completo em formato JSON';
COMMENT ON COLUMN profiles.onboarding_completed IS 'Se o onboarding foi concluído';
COMMENT ON COLUMN profiles.onboarding_step IS 'Etapa atual do onboarding (0-4)';
COMMENT ON COLUMN profiles.onboarding_completed_at IS 'Data de conclusão do onboarding';