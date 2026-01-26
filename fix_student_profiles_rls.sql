-- ========================================
-- student_profiles RLS 정책 추가
-- ========================================
-- 문제: student_profiles 테이블에 RLS는 활성화되어 있지만 정책이 없음
-- 결과: 플래너가 학생 목록을 조회할 수 없음 (0명 표시)
-- 해결: 3개의 RLS 정책 추가

-- 1. 플래너가 자신의 학생 프로필을 조회할 수 있도록
CREATE POLICY "Planners can view their students' profiles"
ON public.student_profiles
FOR SELECT
USING (planner_id = auth.uid());

-- 2. 학생이 자신의 프로필을 조회할 수 있도록
CREATE POLICY "Students can view their own profile"
ON public.student_profiles
FOR SELECT
USING (id = auth.uid());

-- 3. 플래너가 학생 프로필을 생성/수정/삭제할 수 있도록
CREATE POLICY "Planners can manage their students' profiles"
ON public.student_profiles
FOR ALL
USING (planner_id = auth.uid());

-- ========================================
-- 테스트 쿼리
-- ========================================
-- 적용 후 플래너로 로그인해서 실행:
-- SELECT * FROM student_profiles WHERE planner_id = auth.uid();
