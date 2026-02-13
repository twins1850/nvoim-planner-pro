-- ============================================================================
-- Migration 021: Homework Grading Columns and Notification System
-- ============================================================================
-- Purpose: Add grading functionality and notification triggers for homework
-- Date: 2026-02-11
-- Phase: 9A - Core CRUD Completion
-- ============================================================================

-- ============================================================================
-- 1. Add Grading Columns to homework_assignments
-- ============================================================================

-- Add grading-related columns if they don't exist
DO $$
BEGIN
  -- score column (0-100)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'homework_assignments' AND column_name = 'score') THEN
    ALTER TABLE public.homework_assignments
    ADD COLUMN score INTEGER CHECK (score >= 0 AND score <= 100);
  END IF;

  -- teacher_feedback column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'homework_assignments' AND column_name = 'teacher_feedback') THEN
    ALTER TABLE public.homework_assignments
    ADD COLUMN teacher_feedback TEXT;
  END IF;

  -- reviewed_at timestamp
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'homework_assignments' AND column_name = 'reviewed_at') THEN
    ALTER TABLE public.homework_assignments
    ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- completed_at timestamp
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'homework_assignments' AND column_name = 'completed_at') THEN
    ALTER TABLE public.homework_assignments
    ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- ============================================================================
-- 2. Add Missing Columns to homework table
-- ============================================================================

DO $$
BEGIN
  -- estimated_time_minutes column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'homework' AND column_name = 'estimated_time_minutes') THEN
    ALTER TABLE public.homework
    ADD COLUMN estimated_time_minutes INTEGER DEFAULT 30;
  END IF;

  -- lesson_id column (nullable foreign key)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'homework' AND column_name = 'lesson_id') THEN
    ALTER TABLE public.homework
    ADD COLUMN lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 3. Performance Optimization Indexes
-- ============================================================================

-- Index for status filtering (already exists, but ensure it's there)
CREATE INDEX IF NOT EXISTS idx_homework_assignments_status
ON public.homework_assignments(status);

-- Composite index for homework-student queries
CREATE INDEX IF NOT EXISTS idx_homework_assignments_homework_student
ON public.homework_assignments(homework_id, student_id);

-- Index for lesson-based homework queries
CREATE INDEX IF NOT EXISTS idx_homework_lesson_id
ON public.homework(lesson_id);

-- Index for teacher's homework queries (performance boost)
CREATE INDEX IF NOT EXISTS idx_homework_teacher_id_grading
ON public.homework(teacher_id);

-- ============================================================================
-- 4. RPC Function: Get Homework with All Submissions
-- ============================================================================

CREATE OR REPLACE FUNCTION get_homework_with_submissions(homework_uuid UUID)
RETURNS TABLE (
  homework_id UUID,
  homework_title TEXT,
  homework_description TEXT,
  homework_instructions TEXT,
  homework_due_date TIMESTAMP WITH TIME ZONE,
  homework_estimated_time INTEGER,
  homework_resources JSONB,
  homework_created_at TIMESTAMP WITH TIME ZONE,
  assignment_id UUID,
  student_id UUID,
  student_name TEXT,
  student_email TEXT,
  student_avatar_url TEXT,
  assignment_status TEXT,
  assignment_assigned_at TIMESTAMP WITH TIME ZONE,
  submission_text TEXT,
  submission_audio_url TEXT,
  submission_video_url TEXT,
  submission_file_url TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  score INTEGER,
  teacher_feedback TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  ai_feedback JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id AS homework_id,
    h.title AS homework_title,
    h.description AS homework_description,
    h.instructions AS homework_instructions,
    h.due_date AS homework_due_date,
    h.estimated_time_minutes AS homework_estimated_time,
    h.resources AS homework_resources,
    h.created_at AS homework_created_at,
    ha.id AS assignment_id,
    ha.student_id,
    COALESCE(p.full_name, p.email, '학생') AS student_name,
    p.email AS student_email,
    p.avatar_url AS student_avatar_url,
    ha.status AS assignment_status,
    ha.assigned_at AS assignment_assigned_at,
    ha.submission_text,
    ha.submission_audio_url,
    ha.submission_video_url,
    ha.submission_file_url,
    ha.submitted_at,
    ha.score,
    ha.teacher_feedback,
    ha.reviewed_at,
    ha.completed_at,
    ha.ai_feedback
  FROM public.homework h
  LEFT JOIN public.homework_assignments ha ON h.id = ha.homework_id
  LEFT JOIN public.profiles p ON ha.student_id = p.id
  WHERE h.id = homework_uuid
  ORDER BY p.full_name ASC, ha.assigned_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_homework_with_submissions(UUID) TO authenticated;

-- ============================================================================
-- 5. Notification Trigger: Notify Teacher on Student Submission
-- ============================================================================

-- Create notification trigger function
CREATE OR REPLACE FUNCTION notify_teacher_on_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_homework_title TEXT;
  v_teacher_id UUID;
  v_student_name TEXT;
  v_homework_id UUID;
BEGIN
  -- Only trigger when status changes from 'pending' to 'submitted'
  IF OLD.status IS DISTINCT FROM 'pending' OR NEW.status IS DISTINCT FROM 'submitted' THEN
    RETURN NEW;
  END IF;

  -- Get homework info and teacher ID
  SELECT h.title, h.teacher_id, h.id
  INTO v_homework_title, v_teacher_id, v_homework_id
  FROM public.homework h
  WHERE h.id = NEW.homework_id;

  -- Get student name
  SELECT COALESCE(p.full_name, p.email, '학생')
  INTO v_student_name
  FROM public.profiles p
  WHERE p.id = NEW.student_id;

  -- Insert notification for teacher
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_teacher_id,
    'homework_submitted',
    v_student_name || '님이 숙제를 제출했습니다',
    v_homework_title,
    jsonb_build_object(
      'homework_id', v_homework_id,
      'assignment_id', NEW.id,
      'student_id', NEW.student_id,
      'student_name', v_student_name,
      'submitted_at', NEW.submitted_at
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the submission
    RAISE WARNING 'Failed to create notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS notify_on_homework_submission ON public.homework_assignments;

-- Create trigger on homework_assignments table
CREATE TRIGGER notify_on_homework_submission
  AFTER UPDATE OF status ON public.homework_assignments
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status = 'submitted')
  EXECUTE FUNCTION notify_teacher_on_submission();

-- ============================================================================
-- 6. Notification Trigger: Notify Student on Grading Complete
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_student_on_grading()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_homework_title TEXT;
  v_teacher_name TEXT;
BEGIN
  -- Only trigger when status changes to 'reviewed' or 'completed' AND score is set
  IF NEW.status NOT IN ('reviewed', 'completed') OR NEW.score IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only trigger if this is a new review (avoid duplicate notifications)
  IF OLD.reviewed_at IS NOT NULL AND NEW.reviewed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get homework title
  SELECT h.title
  INTO v_homework_title
  FROM public.homework h
  WHERE h.id = NEW.homework_id;

  -- Get teacher name
  SELECT COALESCE(p.full_name, p.email, '선생님')
  INTO v_teacher_name
  FROM public.homework h
  JOIN public.profiles p ON h.teacher_id = p.id
  WHERE h.id = NEW.homework_id;

  -- Insert notification for student
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    NEW.student_id,
    'homework_graded',
    '숙제가 채점되었습니다',
    v_homework_title || ' - 점수: ' || NEW.score || '점',
    jsonb_build_object(
      'homework_id', NEW.homework_id,
      'assignment_id', NEW.id,
      'score', NEW.score,
      'teacher_name', v_teacher_name,
      'reviewed_at', NEW.reviewed_at
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create grading notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS notify_on_homework_grading ON public.homework_assignments;

-- Create trigger for grading notifications
CREATE TRIGGER notify_on_homework_grading
  AFTER UPDATE OF score, status, reviewed_at ON public.homework_assignments
  FOR EACH ROW
  WHEN (NEW.score IS NOT NULL AND NEW.status IN ('reviewed', 'completed'))
  EXECUTE FUNCTION notify_student_on_grading();

-- ============================================================================
-- 7. Update RLS Policies (if needed)
-- ============================================================================

-- Ensure teachers can update their homework assignments (grading)
DROP POLICY IF EXISTS "Teachers can grade homework assignments" ON public.homework_assignments;

CREATE POLICY "Teachers can grade homework assignments"
  ON public.homework_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.homework h
      WHERE h.id = homework_assignments.homework_id
      AND h.teacher_id = auth.uid()
    )
  );

-- Ensure students can view their graded assignments
DROP POLICY IF EXISTS "Students can view their assignments" ON public.homework_assignments;

CREATE POLICY "Students can view their assignments"
  ON public.homework_assignments FOR SELECT
  USING (student_id = auth.uid());

-- ============================================================================
-- 8. Comments and Documentation
-- ============================================================================

COMMENT ON COLUMN public.homework_assignments.score IS 'Student score (0-100)';
COMMENT ON COLUMN public.homework_assignments.teacher_feedback IS 'Teacher written feedback';
COMMENT ON COLUMN public.homework_assignments.reviewed_at IS 'Timestamp when teacher reviewed the submission';
COMMENT ON COLUMN public.homework_assignments.completed_at IS 'Timestamp when assignment was marked complete';
COMMENT ON COLUMN public.homework.estimated_time_minutes IS 'Estimated time to complete homework (in minutes)';
COMMENT ON COLUMN public.homework.lesson_id IS 'Optional link to lesson this homework is associated with';

COMMENT ON FUNCTION get_homework_with_submissions(UUID) IS 'Retrieves homework details with all student submissions and profiles in a single query';
COMMENT ON FUNCTION notify_teacher_on_submission() IS 'Sends notification to teacher when student submits homework';
COMMENT ON FUNCTION notify_student_on_grading() IS 'Sends notification to student when teacher grades their homework';

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- This migration adds:
-- ✅ Grading columns (score, teacher_feedback, reviewed_at, completed_at)
-- ✅ Missing homework columns (estimated_time_minutes, lesson_id)
-- ✅ Performance indexes
-- ✅ RPC function for efficient data retrieval
-- ✅ Notification triggers (submission & grading)
-- ✅ Updated RLS policies
-- ============================================================================
