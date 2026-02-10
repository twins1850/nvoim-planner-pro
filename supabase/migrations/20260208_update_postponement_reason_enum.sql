-- Update postponement_reason ENUM to use user-friendly values
-- Drop old ENUM and create new one with better values

-- Step 1: Add new ENUM values
ALTER TYPE postponement_reason ADD VALUE IF NOT EXISTS 'sick';
ALTER TYPE postponement_reason ADD VALUE IF NOT EXISTS 'emergency';
ALTER TYPE postponement_reason ADD VALUE IF NOT EXISTS 'schedule_conflict';
ALTER TYPE postponement_reason ADD VALUE IF NOT EXISTS 'other';

-- Note: PostgreSQL doesn't allow removing ENUM values easily,
-- but adding new values is safe. Old values will still exist but won't be used.
