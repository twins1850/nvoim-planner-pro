-- Add phone_number to profiles table
-- 2026-01-29: SMS 알림을 위한 전화번호 컬럼 추가

-- Add phone_number column
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add index for phone number queries
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number
  ON profiles(phone_number);

-- Add comment
COMMENT ON COLUMN profiles.phone_number IS '사용자 전화번호 (SMS 알림용, 010-XXXX-XXXX 형식)';
