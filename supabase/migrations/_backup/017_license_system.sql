-- ============================================================================
-- 라이선스 시스템 구축 (Phase 5-7)
-- 작성일: 2026.01.11
-- 목적: 멀티 플래너 환경을 위한 구독 기반 라이선스 관리 시스템
-- ============================================================================

-- ============================================================================
-- 1. licenses 테이블 생성
-- ============================================================================
-- 플래너별 라이선스 정보 관리
-- 형식: 30D-15P-암호화키 (30일, 15명 학생, 검증용 암호화 키)
CREATE TABLE IF NOT EXISTS public.licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- 라이선스 키 정보
  license_key TEXT NOT NULL UNIQUE,
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  max_students INTEGER NOT NULL CHECK (max_students > 0),

  -- 상태 관리
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  remaining_days INTEGER,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'expired')) DEFAULT 'pending',

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- licenses 테이블 코멘트
COMMENT ON TABLE public.licenses IS '플래너 라이선스 관리 테이블 - 구독 기간 및 학생 수 제한';
COMMENT ON COLUMN public.licenses.license_key IS '라이선스 키 형식: 30D-15P-XXXXXXXXXXXXX (기간-학생수-암호화키)';
COMMENT ON COLUMN public.licenses.duration_days IS '라이선스 유효 기간 (일)';
COMMENT ON COLUMN public.licenses.max_students IS '관리 가능한 최대 학생 수';
COMMENT ON COLUMN public.licenses.activated_at IS '라이선스 활성화 시각';
COMMENT ON COLUMN public.licenses.expires_at IS '라이선스 만료 시각 (activated_at + duration_days)';
COMMENT ON COLUMN public.licenses.remaining_days IS '남은 사용 기간 (일)';
COMMENT ON COLUMN public.licenses.status IS '라이선스 상태: pending(미활성), active(활성), expired(만료)';

-- ============================================================================
-- 2. usage_tracking 테이블 생성
-- ============================================================================
-- 플래너별 일일 사용량 추적 (학생 수, 숙제, 메시지, 스토리지)
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tracked_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- 사용량 메트릭
  student_count INTEGER DEFAULT 0 CHECK (student_count >= 0),
  homework_count INTEGER DEFAULT 0 CHECK (homework_count >= 0),
  message_count INTEGER DEFAULT 0 CHECK (message_count >= 0),
  storage_used_mb NUMERIC(10, 2) DEFAULT 0 CHECK (storage_used_mb >= 0),

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 플래너당 하루 하나의 레코드만 존재
  UNIQUE(planner_id, tracked_date)
);

-- usage_tracking 테이블 코멘트
COMMENT ON TABLE public.usage_tracking IS '플래너별 일일 사용량 추적 테이블';
COMMENT ON COLUMN public.usage_tracking.tracked_date IS '추적 날짜';
COMMENT ON COLUMN public.usage_tracking.student_count IS '해당 날짜의 학생 수';
COMMENT ON COLUMN public.usage_tracking.homework_count IS '해당 날짜의 총 숙제 수';
COMMENT ON COLUMN public.usage_tracking.message_count IS '해당 날짜의 총 메시지 수';
COMMENT ON COLUMN public.usage_tracking.storage_used_mb IS '사용 중인 스토리지 (MB)';

-- ============================================================================
-- 3. RLS (Row Level Security) 정책 설정
-- ============================================================================

-- licenses 테이블 RLS 활성화
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- 정책 1: 플래너가 자신의 라이선스 조회
CREATE POLICY "Planners can view their own licenses"
  ON public.licenses
  FOR SELECT
  USING (planner_id = auth.uid());

-- 정책 2: 플래너가 자신의 라이선스 활성화 (UPDATE)
CREATE POLICY "Planners can activate their licenses"
  ON public.licenses
  FOR UPDATE
  USING (planner_id = auth.uid())
  WITH CHECK (planner_id = auth.uid());

-- 정책 3: 시스템(서비스 롤)이 라이선스 생성
-- 관리자 페이지에서 사용할 정책 (Phase 6에서 구현)
CREATE POLICY "Service role can manage licenses"
  ON public.licenses
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- usage_tracking 테이블 RLS 활성화
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- 정책 4: 플래너가 자신의 사용량 조회
CREATE POLICY "Planners can view their own usage"
  ON public.usage_tracking
  FOR SELECT
  USING (planner_id = auth.uid());

-- 정책 5: 시스템(서비스 롤)이 사용량 추적 데이터 관리
CREATE POLICY "Service role can manage usage tracking"
  ON public.usage_tracking
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 4. 성능 최적화 인덱스
-- ============================================================================

-- 라이선스 조회 최적화 (플래너 ID + 상태)
CREATE INDEX IF NOT EXISTS idx_licenses_planner_id_status
  ON public.licenses(planner_id, status);

-- 라이선스 키 조회 최적화
CREATE INDEX IF NOT EXISTS idx_licenses_license_key
  ON public.licenses(license_key);

-- 사용량 추적 조회 최적화 (플래너 ID + 날짜)
CREATE INDEX IF NOT EXISTS idx_usage_tracking_planner_date
  ON public.usage_tracking(planner_id, tracked_date DESC);

-- 기존 테이블 인덱스 추가 (멀티 플래너 환경 최적화)
CREATE INDEX IF NOT EXISTS idx_student_profiles_planner_id
  ON public.student_profiles(planner_id);

CREATE INDEX IF NOT EXISTS idx_homework_planner_id
  ON public.homework(planner_id);

-- ============================================================================
-- 5. 일일 사용량 집계 함수
-- ============================================================================
-- Supabase Cron Job에서 매일 자정에 실행할 함수
CREATE OR REPLACE FUNCTION public.aggregate_daily_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 모든 플래너에 대해 일일 사용량 집계
  INSERT INTO public.usage_tracking (
    planner_id,
    tracked_date,
    student_count,
    homework_count,
    message_count
  )
  SELECT
    p.id AS planner_id,
    CURRENT_DATE AS tracked_date,
    COALESCE((
      SELECT COUNT(*)
      FROM public.student_profiles sp
      WHERE sp.planner_id = p.id
    ), 0) AS student_count,
    COALESCE((
      SELECT COUNT(*)
      FROM public.homework h
      WHERE h.planner_id = p.id
    ), 0) AS homework_count,
    COALESCE((
      SELECT COUNT(*)
      FROM public.messages m
      WHERE m.sender_id = p.id
    ), 0) AS message_count
  FROM public.profiles p
  WHERE p.role = 'planner'
  ON CONFLICT (planner_id, tracked_date)
  DO UPDATE SET
    student_count = EXCLUDED.student_count,
    homework_count = EXCLUDED.homework_count,
    message_count = EXCLUDED.message_count;

  -- 로그 출력
  RAISE NOTICE 'Daily usage aggregation completed for % planners',
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'planner');
END;
$$;

COMMENT ON FUNCTION public.aggregate_daily_usage() IS '플래너별 일일 사용량 집계 함수 (Cron Job 실행)';

-- ============================================================================
-- 6. 라이선스 만료 자동 처리 함수
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_license_expiration()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- 만료된 라이선스 상태 업데이트
  WITH updated AS (
    UPDATE public.licenses
    SET
      status = 'expired',
      updated_at = now()
    WHERE
      status = 'active'
      AND expires_at < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO expired_count FROM updated;

  -- 로그 출력
  IF expired_count > 0 THEN
    RAISE NOTICE '% licenses expired and updated', expired_count;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.check_license_expiration() IS '만료된 라이선스 자동 처리 함수 (Cron Job 실행)';

-- ============================================================================
-- 7. 라이선스 활성화 트리거
-- ============================================================================
-- 라이선스 활성화 시 expires_at 자동 계산
CREATE OR REPLACE FUNCTION public.set_license_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- status가 'active'로 변경되고 activated_at이 NULL인 경우
  IF NEW.status = 'active' AND OLD.activated_at IS NULL THEN
    NEW.activated_at := now();
    NEW.expires_at := now() + (NEW.duration_days || ' days')::INTERVAL;
    NEW.remaining_days := NEW.duration_days;
    NEW.updated_at := now();
  END IF;

  -- remaining_days 자동 계산 (매일 업데이트)
  IF NEW.status = 'active' AND NEW.activated_at IS NOT NULL THEN
    NEW.remaining_days := GREATEST(
      0,
      EXTRACT(DAY FROM (NEW.expires_at - now()))::INTEGER
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_license_expiration
  BEFORE UPDATE ON public.licenses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_license_expiration();

COMMENT ON FUNCTION public.set_license_expiration() IS '라이선스 활성화 시 만료일 자동 계산 트리거';

-- ============================================================================
-- 8. updated_at 자동 업데이트 트리거
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_licenses_updated_at
  BEFORE UPDATE ON public.licenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 완료 메시지
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ License system tables and functions created successfully';
  RAISE NOTICE '📊 Tables: licenses, usage_tracking';
  RAISE NOTICE '🔒 RLS policies: 5 policies enabled';
  RAISE NOTICE '⚡ Indexes: 5 indexes created for performance';
  RAISE NOTICE '🔄 Functions: aggregate_daily_usage(), check_license_expiration()';
  RAISE NOTICE '⏰ Next step: Set up Supabase Cron Jobs for automated tasks';
END $$;
