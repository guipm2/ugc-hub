-- Fix analysts table to use auth.users.id as primary key
-- This ensures analysts.id matches profiles.id for proper relationships

-- First, drop the foreign key constraints
ALTER TABLE IF EXISTS opportunities DROP CONSTRAINT IF EXISTS opportunities_analyst_id_fkey;
ALTER TABLE IF EXISTS conversations DROP CONSTRAINT IF EXISTS conversations_analyst_id_fkey;

-- Modify the analysts table to use UUID from auth.users instead of generating new ones
-- Note: This is a destructive operation. In production, you'd need to migrate existing data first

-- Drop the existing analysts table and recreate with proper structure
DROP TABLE IF EXISTS analysts CASCADE;

-- Recreate analysts table with proper UUID reference
CREATE TABLE analysts (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  name text,
  company text,
  role user_role DEFAULT 'analyst',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Re-add the foreign key constraints
ALTER TABLE opportunities 
ADD CONSTRAINT opportunities_analyst_id_fkey 
FOREIGN KEY (analyst_id) REFERENCES analysts(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS conversations 
ADD CONSTRAINT conversations_analyst_id_fkey 
FOREIGN KEY (analyst_id) REFERENCES analysts(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_analysts_id ON analysts(id);
CREATE INDEX IF NOT EXISTS idx_analysts_email ON analysts(email);