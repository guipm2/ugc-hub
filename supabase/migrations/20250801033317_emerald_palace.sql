/*
  # Fix opportunity stages relationships

  1. Schema Updates
    - Add creator_id column to opportunity_stages table if not exists
    - Add foreign key constraint linking creator_id to profiles table
    - Update existing stages to link with approved creators

  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity with proper constraints
*/

-- Add creator_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunity_stages' AND column_name = 'creator_id'
  ) THEN
    ALTER TABLE opportunity_stages ADD COLUMN creator_id uuid;
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'opportunity_stages_creator_id_fkey'
  ) THEN
    ALTER TABLE opportunity_stages 
    ADD CONSTRAINT opportunity_stages_creator_id_fkey 
    FOREIGN KEY (creator_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update existing opportunity_stages to link with approved creators
UPDATE opportunity_stages 
SET creator_id = (
  SELECT oa.creator_id 
  FROM opportunity_applications oa 
  WHERE oa.opportunity_id = opportunity_stages.opportunity_id 
  AND oa.status = 'approved'
  LIMIT 1
)
WHERE creator_id IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_opportunity_stages_creator_id 
ON opportunity_stages(creator_id);