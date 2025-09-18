/*
  # Sistema de Mensagens - Conversas e Mensagens

  1. Novas Tabelas
    - `conversations` - Conversas entre analistas e criadores
    - `messages` - Mensagens individuais nas conversas

  2. Relacionamentos
    - conversations.opportunity_id -> opportunities.id
    - conversations.analyst_id -> analysts.id (tabela de analistas)
    - conversations.creator_id -> profiles.id (tabela de criadores)
    - messages.conversation_id -> conversations.id

  3. Segurança
    - RLS habilitado em ambas as tabelas
    - Políticas para criadores e analistas

  4. Triggers
    - Criar conversa automaticamente quando candidatura aprovada
    - Enviar mensagem inicial automática
    - Atualizar timestamp da última mensagem
*/

-- Criar tabela de conversas
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL,
  analyst_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(opportunity_id, creator_id)
);

-- Criar tabela de mensagens
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('analyst', 'creator')),
  content text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Adicionar foreign keys usando as tabelas corretas
ALTER TABLE conversations 
  ADD CONSTRAINT conversations_opportunity_id_fkey 
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE;

ALTER TABLE conversations 
  ADD CONSTRAINT conversations_analyst_id_fkey 
  FOREIGN KEY (analyst_id) REFERENCES analysts(id) ON DELETE CASCADE;

ALTER TABLE conversations 
  ADD CONSTRAINT conversations_creator_id_fkey 
  FOREIGN KEY (creator_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE messages 
  ADD CONSTRAINT messages_conversation_id_fkey 
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_conversations_opportunity_id ON conversations(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_conversations_analyst_id ON conversations(analyst_id);
CREATE INDEX IF NOT EXISTS idx_conversations_creator_id ON conversations(creator_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read);

-- Habilitar RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Políticas para conversations
CREATE POLICY "Creators can view own conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "Analysts can view own conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (analyst_id = auth.uid());

-- Políticas para messages
CREATE POLICY "Users can view messages in their conversations"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (conversations.creator_id = auth.uid() OR conversations.analyst_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert messages in their conversations"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (conversations.creator_id = auth.uid() OR conversations.analyst_id = auth.uid())
    )
  );

CREATE POLICY "Users can update own messages"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Função para criar conversa quando candidatura é aprovada
CREATE OR REPLACE FUNCTION create_conversation_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Só criar conversa se status mudou para 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Inserir conversa (se não existir)
    INSERT INTO conversations (opportunity_id, analyst_id, creator_id)
    SELECT NEW.opportunity_id, o.created_by, NEW.creator_id
    FROM opportunities o
    WHERE o.id = NEW.opportunity_id
    ON CONFLICT (opportunity_id, creator_id) DO NOTHING;
    
    -- Enviar mensagem inicial automática
    INSERT INTO messages (conversation_id, sender_id, sender_type, content)
    SELECT c.id, c.analyst_id, 'analyst', 
           'Parabéns! Sua candidatura foi aprovada. Vamos conversar sobre os próximos passos da campanha.'
    FROM conversations c
    WHERE c.opportunity_id = NEW.opportunity_id 
    AND c.creator_id = NEW.creator_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar conversa automaticamente
DROP TRIGGER IF EXISTS trigger_create_conversation_on_approval ON opportunity_applications;
CREATE TRIGGER trigger_create_conversation_on_approval
  AFTER UPDATE ON opportunity_applications
  FOR EACH ROW
  EXECUTE FUNCTION create_conversation_on_approval();

-- Função para atualizar timestamp da última mensagem
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar timestamp
DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON messages;
CREATE TRIGGER trigger_update_conversation_timestamp
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();