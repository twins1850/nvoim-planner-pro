-- ============================================================================
-- Migration 022: Add Homework Submission Columns
-- ============================================================================
-- Purpose: Add columns for storing student homework submissions
-- Date: 2026-02-12
-- Phase: 9A - Core CRUD Completion (Submission Data Storage)
-- ============================================================================

-- ============================================================================
-- 1. Add Submission Data Columns to homework_assignments
-- ============================================================================

DO $$
BEGIN
  -- submission_text column (학생의 텍스트 답변)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'homework_assignments' AND column_name = 'submission_text') THEN
    ALTER TABLE public.homework_assignments
    ADD COLUMN submission_text TEXT;
  END IF;

  -- submission_audio_url column (음성 녹음 URL)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'homework_assignments' AND column_name = 'submission_audio_url') THEN
    ALTER TABLE public.homework_assignments
    ADD COLUMN submission_audio_url TEXT;
  END IF;

  -- submission_video_url column (비디오 URL)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'homework_assignments' AND column_name = 'submission_video_url') THEN
    ALTER TABLE public.homework_assignments
    ADD COLUMN submission_video_url TEXT;
  END IF;

  -- submission_file_url column (파일 URL)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'homework_assignments' AND column_name = 'submission_file_url') THEN
    ALTER TABLE public.homework_assignments
    ADD COLUMN submission_file_url TEXT;
  END IF;

  -- ai_feedback column (AI 피드백 데이터)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'homework_assignments' AND column_name = 'ai_feedback') THEN
    ALTER TABLE public.homework_assignments
    ADD COLUMN ai_feedback JSONB;
  END IF;
END $$;

-- ============================================================================
-- 2. Add Comments for Documentation
-- ============================================================================

COMMENT ON COLUMN public.homework_assignments.submission_text IS 'Student text submission/answer';
COMMENT ON COLUMN public.homework_assignments.submission_audio_url IS 'URL to student audio recording submission';
COMMENT ON COLUMN public.homework_assignments.submission_video_url IS 'URL to student video submission';
COMMENT ON COLUMN public.homework_assignments.submission_file_url IS 'URL to student file submission (PDF, images, etc.)';
COMMENT ON COLUMN public.homework_assignments.ai_feedback IS 'AI-generated feedback data (JSON format)';

-- ============================================================================
-- 3. Create Index for AI Feedback Queries (Optional)
-- ============================================================================

-- GIN index for efficient JSONB queries on ai_feedback
CREATE INDEX IF NOT EXISTS idx_homework_assignments_ai_feedback
ON public.homework_assignments USING GIN(ai_feedback)
WHERE ai_feedback IS NOT NULL;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- This migration adds:
-- ✅ submission_text (TEXT) - 학생 텍스트 답변
-- ✅ submission_audio_url (TEXT) - 음성 녹음 URL
-- ✅ submission_video_url (TEXT) - 비디오 URL
-- ✅ submission_file_url (TEXT) - 파일 URL
-- ✅ ai_feedback (JSONB) - AI 피드백 데이터
-- ✅ Column documentation comments
-- ✅ GIN index for JSONB ai_feedback queries
-- ============================================================================
