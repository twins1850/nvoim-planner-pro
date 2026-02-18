-- Migration 047: 라이선스 기반 학생 관리 고도화
-- 문제 수정:
--   1. get_license_student_status RPC: LIMIT 1 버그(추가 라이선스 합산 안됨) 수정 → SUM
--   2. get_license_student_status RPC: nvoimp_student_id IS NOT NULL 버그(비활성 학생 포함) 수정 → AND status='active'
--   3. set_license_expiration 트리거: 명시적 expires_at 오버라이드 방지 (Add-on 라이선스 만료일 정렬 지원)
-- 신규:
--   4. active_license_expires_at 반환 (Add-on API에서 활용)

-- ============================================================================
-- 1. get_license_student_status RPC 완전 수정
-- ============================================================================
CREATE OR REPLACE FUNCTION get_license_student_status(p_planner_id UUID)
RETURNS TABLE(
  max_students INT,
  current_students INT,
  remaining_slots INT,
  has_license BOOLEAN,
  active_license_expires_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_max INT;
  v_current INT;
  v_expires TIMESTAMPTZ;
BEGIN
  -- 버그 수정 1: LIMIT 1 제거 → SUM으로 변경 (복수 활성 라이선스 합산)
  -- 버그 수정 1b: MAX(expires_at) → 가장 늦게 만료되는 날짜 반환
  SELECT
    COALESCE(SUM(l.max_students), 0)::INT,
    MAX(l.expires_at)
  INTO v_max, v_expires
  FROM public.licenses l
  WHERE l.planner_id = p_planner_id
    AND l.status = 'active'
    AND (l.expires_at IS NULL OR l.expires_at > NOW());

  -- 버그 수정 2: AND s.status = 'active' 추가 → 불러오기만 해도 슬롯 소비 방지
  SELECT COUNT(DISTINCT s.id)::INT INTO v_current
  FROM public.students s
  WHERE s.teacher_id = p_planner_id
    AND s.nvoimp_student_id IS NOT NULL
    AND s.status = 'active';

  RETURN QUERY SELECT
    COALESCE(v_max, 0),
    COALESCE(v_current, 0),
    GREATEST(COALESCE(v_max, 0) - COALESCE(v_current, 0), 0),
    COALESCE(v_max, 0) > 0,
    v_expires;
END;
$$;

GRANT EXECUTE ON FUNCTION get_license_student_status(UUID) TO authenticated;

COMMENT ON FUNCTION get_license_student_status(UUID)
  IS '플래너의 라이선스 학생 슬롯 현황 반환 (v2: SUM 합산, active 학생만 카운트, active_license_expires_at 추가)';

-- ============================================================================
-- 2. set_license_expiration 트리거 수정
--    명시적으로 expires_at이 설정된 경우 트리거가 덮어쓰지 않음 (Add-on 정렬 지원)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_license_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- status가 'active'로 변경되고 이전에 활성화된 적 없는 경우
  IF NEW.status = 'active' AND OLD.activated_at IS NULL THEN
    NEW.activated_at := COALESCE(NEW.activated_at, now());
    -- 핵심 수정: 명시적으로 expires_at이 설정된 경우 트리거가 오버라이드하지 않음
    -- (Add-on 라이선스의 만료일을 기존 라이선스에 맞추기 위해 필요)
    IF NEW.expires_at IS NULL THEN
      NEW.expires_at := NEW.activated_at + (NEW.duration_days || ' days')::INTERVAL;
    END IF;
    NEW.remaining_days := NEW.duration_days;
    NEW.updated_at := now();
  END IF;

  -- remaining_days 자동 계산 (매일 업데이트)
  IF NEW.status = 'active' AND NEW.activated_at IS NOT NULL AND NEW.expires_at IS NOT NULL THEN
    NEW.remaining_days := GREATEST(
      0,
      EXTRACT(DAY FROM (NEW.expires_at - now()))::INTEGER
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_license_expiration()
  IS '라이선스 활성화 시 만료일 자동 계산 트리거 (v2: 명시적 expires_at 오버라이드 방지로 Add-on 지원)';
