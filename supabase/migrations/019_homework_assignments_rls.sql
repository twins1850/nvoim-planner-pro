-- ============================================================================
-- Phase 2: homework_assignments 테이블 RLS 정책 추가 (최우선 - 워크플로우 차단 해제)
-- ============================================================================
--
-- 문제: homework_assignments 테이블에 RLS 정책이 없어 학생이 숙제를 볼 수 없음
-- 해결: 5개 RLS 정책 추가하여 학생-플래너 숙제 워크플로우 활성화
--
-- 생성일: 2026-01-16
-- ============================================================================

-- 정책 1: 학생이 자신의 숙제 과제 조회
CREATE POLICY "Students can view their homework assignments"
  ON public.homework_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = homework_assignments.student_id
      AND s.user_id = auth.uid()
    )
  );

-- 정책 2: 플래너가 자신이 만든 과제 조회
CREATE POLICY "Planners can view homework assignments they created"
  ON public.homework_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.homework h
      WHERE h.id = homework_assignments.homework_id
      AND h.teacher_id = auth.uid()
    )
  );

-- 정책 3: 플래너가 과제 생성
CREATE POLICY "Planners can create homework assignments"
  ON public.homework_assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.homework h
      WHERE h.id = homework_id
      AND h.teacher_id = auth.uid()
    )
  );

-- 정책 4: 플래너가 과제 상태 업데이트
CREATE POLICY "Planners can update homework assignments"
  ON public.homework_assignments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.homework h
      WHERE h.id = homework_assignments.homework_id
      AND h.teacher_id = auth.uid()
    )
  );

-- 정책 5: 플래너가 과제 삭제
CREATE POLICY "Planners can delete homework assignments"
  ON public.homework_assignments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.homework h
      WHERE h.id = homework_assignments.homework_id
      AND h.teacher_id = auth.uid()
    )
  );

-- ============================================================================
-- 검증 쿼리
-- ============================================================================
--
-- 정책 확인:
-- SELECT policyname, cmd
-- FROM pg_policies
-- WHERE tablename = 'homework_assignments'
-- ORDER BY policyname;
--
-- 예상 결과: 5개 정책
-- - Planners can create homework assignments (INSERT)
-- - Planners can delete homework assignments (DELETE)
-- - Planners can update homework assignments (UPDATE)
-- - Planners can view homework assignments they created (SELECT)
-- - Students can view their homework assignments (SELECT)
-- ============================================================================
