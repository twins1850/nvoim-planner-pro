-- ============================================================================
-- Migration: Add Azure API key support to planner_api_keys
-- Purpose: Allow planners to use their own Azure Speech API keys
-- Date: 2026-01-14
-- ============================================================================

-- Check current api_key_type constraint
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'planner_api_keys_api_key_type_check'
    ) THEN
        ALTER TABLE planner_api_keys
        DROP CONSTRAINT planner_api_keys_api_key_type_check;
    END IF;
END $$;

-- Add new constraint with azure type
ALTER TABLE planner_api_keys
ADD CONSTRAINT planner_api_keys_api_key_type_check
CHECK (api_key_type IN ('openai', 'anthropic', 'google', 'custom', 'azure'));

-- Add comment
COMMENT ON COLUMN planner_api_keys.api_key_type IS
'Type of API key: openai, anthropic, google, azure, or custom';
