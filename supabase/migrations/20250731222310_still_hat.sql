/*
  # Add age_range and gender columns to opportunities table

  1. New Columns
    - `age_range` (text) - Age range requirement for the opportunity
    - `gender` (text) - Gender requirement for the opportunity

  2. Changes
    - Add age_range column with default null
    - Add gender column with default null
    - Both columns are optional to maintain compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunities' AND column_name = 'age_range'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN age_range text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunities' AND column_name = 'gender'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN gender text;
  END IF;
END $$;