-- Add created_by column back to competitions table
-- Run this BEFORE database-competition-admins.sql

-- Add created_by column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'competitions'
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE competitions
    ADD COLUMN created_by UUID REFERENCES profiles(id) ON DELETE CASCADE;

    RAISE NOTICE 'created_by column added to competitions table';
  ELSE
    RAISE NOTICE 'created_by column already exists';
  END IF;
END $$;

-- IMPORTANT: Before making it NOT NULL, you need to set values for existing competitions
-- Option 1: Delete competitions without a creator
-- DELETE FROM competitions WHERE created_by IS NULL;

-- Option 2: Set a default user (replace 'your-user-id' with actual UUID)
-- UPDATE competitions SET created_by = 'your-user-id' WHERE created_by IS NULL;

-- Option 3: Skip NOT NULL if you have existing data
-- Only uncomment the line below after handling existing NULL values
-- ALTER TABLE competitions ALTER COLUMN created_by SET NOT NULL;
