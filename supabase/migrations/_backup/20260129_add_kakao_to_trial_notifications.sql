-- Add KakaoTalk Alimtalk support to trial_notifications table
-- 2026-01-29: 카카오톡 알림톡 지원 추가

-- Add KakaoTalk-related columns
ALTER TABLE trial_notifications
  ADD COLUMN IF NOT EXISTS kakao_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS kakao_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kakao_error_message TEXT,
  ADD COLUMN IF NOT EXISTS kakao_template_id TEXT,
  ADD COLUMN IF NOT EXISTS kakao_message_id TEXT;

-- Add index for KakaoTalk status queries
CREATE INDEX IF NOT EXISTS idx_trial_notifications_kakao_sent
  ON trial_notifications(kakao_sent);

CREATE INDEX IF NOT EXISTS idx_trial_notifications_kakao_sent_at
  ON trial_notifications(kakao_sent_at);

-- Add comments
COMMENT ON COLUMN trial_notifications.kakao_sent IS '카카오톡 알림톡 발송 성공 여부';
COMMENT ON COLUMN trial_notifications.kakao_sent_at IS '카카오톡 알림톡 발송 시간';
COMMENT ON COLUMN trial_notifications.kakao_error_message IS '카카오톡 알림톡 발송 실패 시 에러 메시지';
COMMENT ON COLUMN trial_notifications.kakao_template_id IS '사용된 카카오톡 템플릿 ID';
COMMENT ON COLUMN trial_notifications.kakao_message_id IS '카카오톡 메시지 ID (SOLAPI 응답)';
