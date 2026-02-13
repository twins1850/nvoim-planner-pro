-- ============================================================================
-- Migration: Add encryption IV column to planner_api_keys table
-- Purpose: Store initialization vector for AES-GCM encryption
-- Date: 2026-01-14
-- ============================================================================

-- Add IV column to store encryption initialization vector
ALTER TABLE planner_api_keys
ADD COLUMN IF NOT EXISTS encryption_iv TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN planner_api_keys.encryption_iv IS
'Base64-encoded initialization vector for AES-GCM encryption of encrypted_api_key';

-- Update existing records to null (will be migrated when keys are re-encrypted)
UPDATE planner_api_keys
SET encryption_iv = NULL
WHERE encryption_iv IS NULL;
