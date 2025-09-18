-- Projeto Caio: Schema Completo
-- Gerado a partir de todas as migrations

-- Tabela de perfis (usuários)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  name text,
  bio text,
  location text,
  niche text,
  followers text,
  website text,
  phone text,
  avatar_url text,
  role user_role DEFAULT 'creator',
  company text,
  terms_accepted boolean DEFAULT false,
  terms_accepted_at timestamptz,
  terms_version text DEFAULT '1.0',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enum de papéis
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('creator', 'analyst');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Tabela de analistas (legacy, não usar para login)
CREATE TABLE IF NOT EXISTS analysts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  name text,
  company text,
  role user_role DEFAULT 'analyst',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de oportunidades
CREATE TABLE IF NOT EXISTS opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analyst_id uuid REFERENCES analysts(id) ON DELETE CASCADE,
  title text NOT NULL,
  company text NOT NULL,
  description text NOT NULL,
  budget_min integer NOT NULL,
  budget_max integer NOT NULL,
  location text NOT NULL DEFAULT 'Remoto',
  content_type text NOT NULL,
  requirements jsonb DEFAULT '[]'::jsonb,
  deadline date NOT NULL,
  status text NOT NULL DEFAULT 'ativo',
  candidates_count integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  age_range text,
  gender text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de candidaturas
CREATE TABLE IF NOT EXISTS opportunity_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text DEFAULT '',
  status text DEFAULT 'pending' NOT NULL,
  applied_at timestamptz DEFAULT now() NOT NULL,
  reviewed_at timestamptz,
  CONSTRAINT unique_opportunity_creator UNIQUE (opportunity_id, creator_id)
);

-- Tabela de etapas das oportunidades
CREATE TABLE IF NOT EXISTS opportunity_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'aguardando_envio',
  tracking_code text,
  notes text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_stage_check CHECK (stage = ANY (ARRAY[
    'mapeamento',
    'contrato',
    'aguardando_envio',
    'produtos_enviados',
    'material_roteirizacao',
    'aguardando_gravacao',
    'pronto_edicao',
    'material_edicao',
    'revisao_final',
    'finalizado'
  ]))
);

-- Tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Tabela de conversas
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  analyst_id uuid NOT NULL,
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(opportunity_id, creator_id)
);

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('analyst', 'creator')),
  content text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_opportunity_stages_opportunity_id ON opportunity_stages(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_stages_creator_id ON opportunity_stages(creator_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_stages_stage ON opportunity_stages(stage);
CREATE INDEX IF NOT EXISTS idx_opportunity_stages_created_at ON opportunity_stages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_conversations_opportunity_id ON conversations(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_conversations_analyst_id ON conversations(analyst_id);
CREATE INDEX IF NOT EXISTS idx_conversations_creator_id ON conversations(creator_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read);
CREATE INDEX IF NOT EXISTS idx_opportunity_applications_opportunity_id ON opportunity_applications(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_applications_creator_id ON opportunity_applications(creator_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_applications_status ON opportunity_applications(status);
CREATE INDEX IF NOT EXISTS idx_opportunity_applications_applied_at ON opportunity_applications(applied_at DESC);

-- Funções, triggers e políticas RLS devem ser adicionadas após a criação das tabelas
-- Recomenda-se rodar as funções e triggers das migrations originais para garantir o funcionamento completo
