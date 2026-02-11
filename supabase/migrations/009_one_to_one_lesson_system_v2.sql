-- ============================================
-- 앤보임 플래너 프로 - 1:1 화상수업 시스템 마이그레이션 (v2 - 기존 데이터 처리)
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
-- PART 2: lessons 테이블 생성 또는 업데이트
-- ==========================================

-- Create lessons table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled Lesson',
    description TEXT,
    lesson_date DATE,
    start_time TIME,
    end_time TIME,
    lesson_status TEXT DEFAULT 'scheduled',
    attendance_status TEXT,
    lesson_notes TEXT,
    homework_assigned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- PART 3: 기존 데이터 처리 및 컬럼 추가
-- ==========================================

DO $$
DECLARE
    first_user_id UUID;
BEGIN
    -- Get first user ID for default values
    SELECT id INTO first_user_id FROM auth.users LIMIT 1;

    -- Add planner_id column if it doesn't exist (nullable first)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lessons' AND column_name = 'planner_id'
    ) THEN
        -- Add as nullable
        ALTER TABLE public.lessons ADD COLUMN planner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

        -- Update existing rows with first user ID (if any user exists)
        IF first_user_id IS NOT NULL THEN
            UPDATE public.lessons SET planner_id = first_user_id WHERE planner_id IS NULL;
        ELSE
            -- If no users exist, delete orphaned lessons
            DELETE FROM public.lessons WHERE planner_id IS NULL;
        END IF;

        -- Now make it NOT NULL
        ALTER TABLE public.lessons ALTER COLUMN planner_id SET NOT NULL;
    END IF;

    -- Add student_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lessons' AND column_name = 'student_id'
    ) THEN
        ALTER TABLE public.lessons ADD COLUMN student_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE;
    END IF;

    -- Add lesson_date if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lessons' AND column_name = 'lesson_date'
    ) THEN
        ALTER TABLE public.lessons ADD COLUMN lesson_date DATE;
    END IF;

    -- Add start_time if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lessons' AND column_name = 'start_time'
    ) THEN
        ALTER TABLE public.lessons ADD COLUMN start_time TIME;
    END IF;

    -- Add end_time if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lessons' AND column_name = 'end_time'
    ) THEN
        ALTER TABLE public.lessons ADD COLUMN end_time TIME;
    END IF;

    -- Add lesson_status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lessons' AND column_name = 'lesson_status'
    ) THEN
        ALTER TABLE public.lessons ADD COLUMN lesson_status TEXT DEFAULT 'scheduled';
    END IF;

    -- Add attendance_status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lessons' AND column_name = 'attendance_status'
    ) THEN
        ALTER TABLE public.lessons ADD COLUMN attendance_status TEXT;
    END IF;

    -- Add lesson_notes if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lessons' AND column_name = 'lesson_notes'
    ) THEN
        ALTER TABLE public.lessons ADD COLUMN lesson_notes TEXT;
    END IF;

    -- Add homework_assigned if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lessons' AND column_name = 'homework_assigned'
    ) THEN
        ALTER TABLE public.lessons ADD COLUMN homework_assigned BOOLEAN DEFAULT false;
    END IF;

    -- Ensure title column has a default if it doesn't
    BEGIN
        ALTER TABLE public.lessons ALTER COLUMN title SET DEFAULT 'Untitled Lesson';
    EXCEPTION WHEN OTHERS THEN
        -- Ignore if column doesn't exist or already has default
        NULL;
    END;
END $$;

-- Add comments
COMMENT ON COLUMN public.lessons.planner_id IS '플래너 ID (수업을 관리하는 플래너)';
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
ON public.lessons(student_id, lesson_date)
WHERE student_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lessons_planner_date
ON public.lessons(planner_id, lesson_date)
WHERE planner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lessons_status
ON public.lessons(lesson_status)
WHERE lesson_status IS NOT NULL;

-- ==========================================
-- PART 4: RLS 정책 업데이트
-- ==========================================

-- Enable RLS
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

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
  'lessons 테이블 존재' AS step,
  COUNT(*) AS count
FROM information_schema.tables
WHERE table_name = 'lessons'

UNION ALL

SELECT
  'lessons 컬럼 존재' AS step,
  COUNT(*) AS count
FROM information_schema.columns
WHERE table_name = 'lessons'
  AND column_name IN ('student_id', 'lesson_date', 'start_time', 'end_time', 'lesson_status', 'attendance_status', 'planner_id')

UNION ALL

SELECT
  'RLS 정책 생성' AS step,
  COUNT(*) AS count
FROM pg_policies
WHERE tablename = 'lessons'
  AND policyname LIKE '%Planners can%'

UNION ALL

SELECT
  'lessons 레코드 수' AS step,
  COUNT(*)::bigint AS count
FROM public.lessons;
