-- ============================================================================
-- Phase 5: licenses 테이블 스키마 수정 (License-First)
-- ============================================================================
-- 설명: 라이선스 키를 먼저 생성하고 나중에 활성화하는 License-First 방식으로 변경
-- 작성일: 2026-01-16

-- Step 1: planner_id 제약 조건 제거 (NULL 허용)
ALTER TABLE public.licenses
ALTER COLUMN planner_id DROP NOT NULL;

-- Step 2: 새 컬럼 추가
ALTER TABLE public.licenses
ADD COLUMN IF NOT EXISTS purchased_by_email TEXT,
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS activated_by_user_id UUID,
ADD COLUMN IF NOT EXISTS device_tokens JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS max_devices INTEGER DEFAULT 2;

-- Step 3: 제약 조건 추가
-- active 상태의 라이선스는 반드시 planner_id가 있어야 함
ALTER TABLE public.licenses
ADD CONSTRAINT active_license_must_have_planner
CHECK (status != 'active' OR planner_id IS NOT NULL);

-- Step 4: 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_licenses_status ON public.licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_purchased_by_email ON public.licenses(purchased_by_email);
CREATE INDEX IF NOT EXISTS idx_licenses_activated_at ON public.licenses(activated_at);

-- Step 5: 기존 RLS 정책 수정
-- 기존 정책 삭제
DROP POLICY IF EXISTS "Planners can view their own licenses" ON public.licenses;
DROP POLICY IF EXISTS "Planners can activate their licenses" ON public.licenses;

-- 새 정책 생성: 플래너가 자신의 라이선스 조회 (이메일로도 조회 가능)
CREATE POLICY "Planners can view their own licenses"
  ON public.licenses
  FOR SELECT
  USING (
    planner_id = auth.uid()
    OR purchased_by_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- 새 정책 생성: 플래너가 라이선스 활성화 (활성화 전 또는 자신의 라이선스)
CREATE POLICY "Planners can activate their licenses"
  ON public.licenses
  FOR UPDATE
  USING (
    (planner_id IS NULL AND status = 'pending') -- 활성화 전
    OR (planner_id = auth.uid()) -- 활성화 후
  );

-- Step 6: 검증 SQL (주석 처리됨)
-- 테이블 구조 확인:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'licenses'
-- ORDER BY ordinal_position;

-- 제약 조건 확인:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.licenses'::regclass;

-- 인덱스 확인:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'licenses';

-- 정책 확인:
-- SELECT policyname, cmd
-- FROM pg_policies
-- WHERE tablename = 'licenses'
-- ORDER BY policyname;
