/*
  # Allow null opportunity_id in conversations table

  1. Schema Changes
    - Alter `conversations` table to allow NULL values in `opportunity_id` column
    - This enables direct conversations between analysts and creators without requiring a specific opportunity

  2. Security
    - Maintain existing RLS policies
    - No changes to security model needed

  3. Purpose
    - Enable direct networking conversations
    - Support analyst-initiated conversations for prospecting
    - Maintain flexibility for different conversation types
*/

-- Allow opportunity_id to be nullable for direct conversations
ALTER TABLE conversations 
ALTER COLUMN opportunity_id DROP NOT NULL;