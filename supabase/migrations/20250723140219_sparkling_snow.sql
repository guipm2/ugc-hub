/*
  # Remove password_hash column from analysts table

  1. Changes
    - Remove `password_hash` column from `analysts` table
    - This column is not needed as Supabase handles authentication automatically
    - Fixes NOT NULL constraint violation during analyst signup

  2. Security
    - Password hashing is handled by Supabase's auth system
    - No custom password storage needed in profile tables
*/

-- Remove the password_hash column from analysts table
ALTER TABLE analysts DROP COLUMN IF EXISTS password_hash;