-- Trial 만료 알림 기록 테이블 생성

-- 1. trial_notifications 테이블 생성
CREATE TABLE IF NOT EXISTS public.trial_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  planner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('7days', '3days', '1day', 'expired')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email TEXT NOT NULL,
  email_sent BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 같은 라이선스에 같은 타입의 알림은 한 번만
  UNIQUE(license_id, notification_type)
);

-- 2. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_trial_notifications_license_id
  ON public.trial_notifications(license_id);

CREATE INDEX IF NOT EXISTS idx_trial_notifications_sent_at
  ON public.trial_notifications(sent_at);

CREATE INDEX IF NOT EXISTS idx_trial_notifications_type
  ON public.trial_notifications(notification_type);

-- 3. RLS (Row Level Security) 활성화
ALTER TABLE public.trial_notifications ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책 생성
-- 플래너는 자신의 알림만 조회 가능
CREATE POLICY "Planners can view their own notifications"
  ON public.trial_notifications
  FOR SELECT
  USING (planner_id = auth.uid());

-- Service role은 모든 작업 가능 (API에서 사용)
CREATE POLICY "Service role can manage all notifications"
  ON public.trial_notifications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. 코멘트 추가
COMMENT ON TABLE public.trial_notifications IS 'Trial 라이선스 만료 알림 기록';
COMMENT ON COLUMN public.trial_notifications.notification_type IS '알림 타입: 7days(7일전), 3days(3일전), 1day(1일전), expired(만료일)';
COMMENT ON COLUMN public.trial_notifications.email_sent IS '이메일 발송 성공 여부';
COMMENT ON COLUMN public.trial_notifications.error_message IS '이메일 발송 실패 시 에러 메시지';

-- 6. 결과 확인
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'trial_notifications';

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'trial_notifications';
