-- ============================================
-- 앤보임 플래너 프로 - 1:1 화상수업 시스템 마이그레이션
-- 실행 날짜: 2026-02-10
-- ============================================

-- ==========================================
-- PART 1: student_profiles 테이블에 담임선생님 필드 추가
-- ==========================================

-- Add native teacher information to student profiles
ALTER TABLE public.student_profiles
ADD COLUMN IF NOT EXISTS native_teacher_name TEXT,
ADD COLUMN IF NOT EXISTS teacher_contact TEXT,
ADD COLUMN IF NOT EXISTS teacher_notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.student_profiles.native_teacher_name IS '학생의 원어민 담임선생님 이름';
COMMENT ON COLUMN public.student_profiles.teacher_contact IS '담임선생님 연락처 (이메일, 전화번호 등)';
COMMENT ON COLUMN public.student_profiles.teacher_notes IS '담임선생님 관련 메모';

-- Create index for teacher name searches
CREATE INDEX IF NOT EXISTS idx_student_profiles_teacher_name
ON public.student_profiles(native_teacher_name)
WHERE native_teacher_name IS NOT NULL;

-- ==========================================
-- PART 2: lessons 테이블 구조 변경 (1:1 화상수업용)
-- ==========================================

-- Add student_id directly to lessons table for 1:1 relationship
ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS lesson_date DATE,
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME,
ADD COLUMN IF NOT EXISTS lesson_status TEXT DEFAULT 'scheduled',
ADD COLUMN IF NOT EXISTS attendance_status TEXT,
ADD COLUMN IF NOT EXISTS lesson_notes TEXT,
ADD COLUMN IF NOT EXISTS homework_assigned BOOLEAN DEFAULT false;

-- Add comments
COMMENT ON COLUMN public.lessons.student_id IS '수업을 받는 학생 ID (1:1 수업)';
COMMENT ON COLUMN public.lessons.lesson_date IS '수업 날짜';
COMMENT ON COLUMN public.lessons.start_time IS '수업 시작 시간';
COMMENT ON COLUMN public.lessons.end_time IS '수업 종료 시간';
COMMENT ON COLUMN public.lessons.lesson_status IS '수업 상태: scheduled, completed, cancelled, no_show';
COMMENT ON COLUMN public.lessons.attendance_status IS '출석 상태: present, absent, late';
COMMENT ON COLUMN public.lessons.lesson_notes IS '수업 메모 (플래너용)';
COMMENT ON COLUMN public.lessons.homework_assigned IS '숙제 배정 여부';

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_lessons_student_date
ON public.lessons(student_id, lesson_date);

CREATE INDEX IF NOT EXISTS idx_lessons_planner_date
ON public.lessons(planner_id, lesson_date);

CREATE INDEX IF NOT EXISTS idx_lessons_status
ON public.lessons(lesson_status);

-- ==========================================
-- PART 3: RLS 정책 업데이트
-- ==========================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Planners can view their lessons" ON public.lessons;
DROP POLICY IF EXISTS "Planners can create lessons" ON public.lessons;
DROP POLICY IF EXISTS "Planners can update their lessons" ON public.lessons;
DROP POLICY IF EXISTS "Planners can delete their lessons" ON public.lessons;

-- Create new RLS policies for lessons
CREATE POLICY "Planners can view their lessons"
ON public.lessons FOR SELECT
TO authenticated
USING (planner_id = auth.uid());

CREATE POLICY "Planners can create lessons"
ON public.lessons FOR INSERT
TO authenticated
WITH CHECK (planner_id = auth.uid());

CREATE POLICY "Planners can update their lessons"
ON public.lessons FOR UPDATE
TO authenticated
USING (planner_id = auth.uid());

CREATE POLICY "Planners can delete their lessons"
ON public.lessons FOR DELETE
TO authenticated
USING (planner_id = auth.uid());

-- Enable RLS
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 마이그레이션 완료 확인
-- ==========================================

SELECT
  'student_profiles 컬럼 추가' AS step,
  COUNT(*) AS count
FROM information_schema.columns
WHERE table_name = 'student_profiles'
  AND column_name IN ('native_teacher_name', 'teacher_contact', 'teacher_notes')

UNION ALL

SELECT
  'lessons 컬럼 추가' AS step,
  COUNT(*) AS count
FROM information_schema.columns
WHERE table_name = 'lessons'
  AND column_name IN ('student_id', 'lesson_date', 'start_time', 'end_time', 'lesson_status', 'attendance_status')

UNION ALL

SELECT
  'RLS 정책 생성' AS step,
  COUNT(*) AS count
FROM pg_policies
WHERE tablename = 'lessons'
  AND policyname LIKE '%Planners can%';
