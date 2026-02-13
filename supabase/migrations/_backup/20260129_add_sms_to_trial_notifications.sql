-- Add SMS support to trial_notifications table
-- 2026-01-29: SMS 알림 지원 추가

-- Add SMS-related columns
ALTER TABLE trial_notifications
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS sms_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sms_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sms_error_message TEXT;

-- Add index for SMS status queries
CREATE INDEX IF NOT EXISTS idx_trial_notifications_sms_sent
  ON trial_notifications(sms_sent);

-- Add comment
COMMENT ON COLUMN trial_notifications.phone_number IS '수신자 전화번호 (SMS 발송용)';
COMMENT ON COLUMN trial_notifications.sms_sent IS 'SMS 발송 성공 여부';
COMMENT ON COLUMN trial_notifications.sms_sent_at IS 'SMS 발송 시간';
COMMENT ON COLUMN trial_notifications.sms_error_message IS 'SMS 발송 실패 시 에러 메시지';
