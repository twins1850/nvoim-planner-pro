-- ============================================================================
-- Phase 2: homework 테이블 SELECT RLS 정책 추가 (학생 숙제 조회 활성화)
-- ============================================================================
--
-- 문제: homework 테이블에 학생용 SELECT 정책이 없어 JOIN이 실패함
-- 증상: student app에서 homework_assignments는 조회되나 homework 데이터는 null
-- 해결: 학생이 자신에게 할당된 숙제만 볼 수 있는 SELECT 정책 추가
--
-- 생성일: 2026-01-16
-- ============================================================================

-- 정책: 학생이 자신에게 할당된 숙제 조회
CREATE POLICY "Students can view assigned homework"
  ON public.homework
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.homework_assignments ha
      WHERE ha.homework_id = homework.id
      AND ha.student_id = auth.uid()
    )
  );

-- ============================================================================
-- 검증 쿼리
-- ============================================================================
--
-- 정책 확인:
-- SELECT policyname, cmd
-- FROM pg_policies
-- WHERE tablename = 'homework'
-- AND policyname = 'Students can view assigned homework';
--
-- 학생 앱 테스트 쿼리 (학생으로 로그인 후):
-- SELECT
--   ha.*,
--   h.title,
--   h.description
-- FROM homework_assignments ha
-- LEFT JOIN homework h ON h.id = ha.homework_id
-- WHERE ha.student_id = auth.uid()
-- LIMIT 5;
--
-- 예상 결과: homework 데이터가 정상적으로 JOIN되어 표시됨
-- ============================================================================
