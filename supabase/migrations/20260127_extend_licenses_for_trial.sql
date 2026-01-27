-- status 열거형에 'trial' 추가
ALTER TABLE public.licenses
  DROP CONSTRAINT IF EXISTS licenses_status_check;

ALTER TABLE public.licenses
  ADD CONSTRAINT licenses_status_check
  CHECK (status IN ('pending', 'active', 'expired', 'trial'));

-- 체험 관련 메타데이터 컬럼 추가
ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS upgraded_from_trial BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trial_notification_sent BOOLEAN DEFAULT FALSE;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_licenses_is_trial ON public.licenses(is_trial);
CREATE INDEX IF NOT EXISTS idx_licenses_trial_expires_at ON public.licenses(trial_expires_at);

-- 체험 라이선스 자동 만료 함수
CREATE OR REPLACE FUNCTION expire_trial_licenses()
RETURNS void AS $$
BEGIN
  UPDATE public.licenses
  SET status = 'expired'
  WHERE is_trial = TRUE
    AND status = 'trial'
    AND trial_expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION expire_trial_licenses() TO authenticated;

-- 주석: Supabase Cron Job 또는 Edge Function으로 매일 실행
-- SELECT cron.schedule('expire-trial-licenses', '0 0 * * *', 'SELECT expire_trial_licenses()');
