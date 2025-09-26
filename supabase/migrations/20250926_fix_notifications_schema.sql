-- Migration: Corrigir tabela de notificações
-- Created at: 2025-09-26

-- 1. Verificar e adicionar coluna analyst_id se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'analyst_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE notifications ADD COLUMN analyst_id UUID REFERENCES profiles(id);
        
        -- Criar índice para performance
        CREATE INDEX idx_notifications_analyst_id ON notifications(analyst_id);
        
        RAISE NOTICE 'Coluna analyst_id adicionada à tabela notifications';
    ELSE
        RAISE NOTICE 'Coluna analyst_id já existe na tabela notifications';
    END IF;
END $$;

-- 2. Se existir coluna user_id, migrar dados para analyst_id
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'user_id'
        AND table_schema = 'public'
    ) THEN
        -- Migrar dados de user_id para analyst_id onde user_id referencia um analista
        UPDATE notifications 
        SET analyst_id = user_id 
        WHERE user_id IN (
            SELECT id FROM profiles WHERE role = 'analyst'
        )
        AND analyst_id IS NULL;
        
        RAISE NOTICE 'Dados migrados de user_id para analyst_id';
    END IF;
END $$;

-- 3. Adicionar política RLS se não existir
DO $$ 
BEGIN
    -- Habilitar RLS na tabela se não estiver habilitado
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    
    -- Criar política para analistas verem apenas suas notificações
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'notifications_analyst_policy'
    ) THEN
        CREATE POLICY notifications_analyst_policy ON notifications
        FOR ALL USING (
            analyst_id = auth.uid() OR 
            (user_id = auth.uid() AND analyst_id IS NULL)
        );
        
        RAISE NOTICE 'Política RLS criada para notifications';
    ELSE
        RAISE NOTICE 'Política RLS já existe para notifications';
    END IF;
END $$;