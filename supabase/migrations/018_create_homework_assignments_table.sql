-- ============================================================================
-- Migration 018: Create homework_assignments Table
-- ============================================================================
-- Purpose: Create homework_assignments table for tracking student homework assignments
-- Date: 2026-02-13
-- Phase: 9A - Core Infrastructure
-- ============================================================================

-- homework_assignments 테이블 생성
-- 이 테이블은 homework (숙제 템플릿)와 students (학생) 간의 배정 관계를 관리
CREATE TABLE IF NOT EXISTS public.homework_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 관계
  homework_id UUID NOT NULL REFERENCES public.homework(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,

  -- 상태 관리
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'reviewed', 'completed')),

  -- 배정 정보
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 제출 정보
  submission_text TEXT,
  audio_url TEXT,
  video_url TEXT,
  document_url TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,

  -- AI 피드백
  ai_feedback JSONB,

  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 유니크 제약조건: 한 학생이 같은 숙제를 중복으로 배정받지 않도록
  UNIQUE(homework_id, student_id)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_homework_assignments_homework_id
ON public.homework_assignments(homework_id);

CREATE INDEX IF NOT EXISTS idx_homework_assignments_student_id
ON public.homework_assignments(student_id);

CREATE INDEX IF NOT EXISTS idx_homework_assignments_status
ON public.homework_assignments(status);

CREATE INDEX IF NOT EXISTS idx_homework_assignments_submitted_at
ON public.homework_assignments(submitted_at);

-- ============================================================================
-- Enable RLS
-- ============================================================================

ALTER TABLE public.homework_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Update Trigger
-- ============================================================================

CREATE TRIGGER update_homework_assignments_updated_at
  BEFORE UPDATE ON public.homework_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.homework_assignments IS 'Tracks homework assignments for each student';
COMMENT ON COLUMN public.homework_assignments.homework_id IS 'Reference to homework template';
COMMENT ON COLUMN public.homework_assignments.student_id IS 'Reference to student receiving assignment';
COMMENT ON COLUMN public.homework_assignments.status IS 'Assignment status: pending, submitted, reviewed, completed';
COMMENT ON COLUMN public.homework_assignments.assigned_at IS 'When homework was assigned to student';
COMMENT ON COLUMN public.homework_assignments.submitted_at IS 'When student submitted the homework';
COMMENT ON COLUMN public.homework_assignments.ai_feedback IS 'AI-generated feedback in JSON format';

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- This migration creates:
-- ✅ homework_assignments table with proper schema
-- ✅ 4 performance indexes
-- ✅ RLS enabled
-- ✅ Updated_at trigger
-- ✅ Unique constraint to prevent duplicate assignments
-- ============================================================================
