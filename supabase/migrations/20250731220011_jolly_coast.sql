/*
  # Add terms acceptance tracking

  1. New Columns
    - `profiles` table:
      - `terms_accepted` (boolean, default false)
      - `terms_accepted_at` (timestamp)
      - `terms_version` (text, for future versioning)

  2. Security
    - Update existing RLS policies to work with new columns
*/

-- Add terms acceptance columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'terms_accepted'
  ) THEN
    ALTER TABLE profiles ADD COLUMN terms_accepted boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'terms_accepted_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN terms_accepted_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'terms_version'
  ) THEN
    ALTER TABLE profiles ADD COLUMN terms_version text DEFAULT '1.0';
  END IF;
END $$;