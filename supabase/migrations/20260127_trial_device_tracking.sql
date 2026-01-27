-- 체험 라이선스 사용 이력 추적 테이블 (영구 저장)
CREATE TABLE IF NOT EXISTS public.trial_device_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_fingerprint TEXT NOT NULL UNIQUE,
  first_trial_at TIMESTAMPTZ DEFAULT NOW(),
  trial_user_email TEXT,
  trial_license_id UUID REFERENCES public.licenses(id),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (빠른 조회)
CREATE INDEX idx_trial_device_fingerprint ON public.trial_device_fingerprints(device_fingerprint);
CREATE INDEX idx_trial_created_at ON public.trial_device_fingerprints(created_at);

-- RLS 정책: 관리자만 조회 가능
ALTER TABLE public.trial_device_fingerprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_can_view_trial_devices"
  ON public.trial_device_fingerprints
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 체험 라이선스 사용 통계 뷰 (관리자용)
CREATE OR REPLACE VIEW public.trial_usage_stats AS
SELECT
  COUNT(*) as total_trials,
  COUNT(DISTINCT trial_user_email) as unique_users,
  COUNT(*) FILTER (WHERE first_trial_at > NOW() - INTERVAL '7 days') as trials_last_7_days,
  COUNT(*) FILTER (WHERE first_trial_at > NOW() - INTERVAL '30 days') as trials_last_30_days
FROM public.trial_device_fingerprints;

-- 체험 통계 뷰도 관리자만 조회 가능
GRANT SELECT ON public.trial_usage_stats TO authenticated;
