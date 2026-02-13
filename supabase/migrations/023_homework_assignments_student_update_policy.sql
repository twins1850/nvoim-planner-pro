-- ============================================================================
-- Migration 023: Add Student UPDATE Policy for Homework Assignments
-- ============================================================================
-- Purpose: Allow students to submit homework by updating their assignments
-- Date: 2026-02-12
-- Phase: 9A - Student Homework Submission
-- ============================================================================
--
-- Problem:
--   - Students get PGRST116 error when trying to submit homework
--   - Current UPDATE policy only allows planners to update
--   - Students need to update: status, submitted_at, submission_text, etc.
--
-- Solution:
--   - Add RLS policy allowing students to UPDATE their own assignments
--   - Student can only modify assignments where student_id = auth.uid()
--
-- ============================================================================

-- ============================================================================
-- 1. Add Student UPDATE Policy
-- ============================================================================

CREATE POLICY "Students can update own submissions"
  ON public.homework_assignments
  FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- ============================================================================
-- Policy Explanation:
-- ============================================================================
--
-- USING (student_id = auth.uid())
--   → Students can only UPDATE rows where they are the assigned student
--
-- WITH CHECK (student_id = auth.uid())
--   → After UPDATE, the student_id must still match the authenticated user
--   → Prevents students from changing student_id to another user
--
-- ============================================================================

COMMENT ON POLICY "Students can update own submissions" ON public.homework_assignments IS
  'Allows students to submit homework by updating status, submission_text, submission_audio_url, etc.';

-- ============================================================================
-- Verification Query
-- ============================================================================
--
-- Check all UPDATE policies on homework_assignments:
--
-- SELECT policyname, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'homework_assignments' AND cmd = 'UPDATE'
-- ORDER BY policyname;
--
-- Expected Result: 2 policies
-- 1. "Planners can update homework assignments" (planner_id check)
-- 2. "Students can update own submissions" (student_id check) ← NEW
--
-- ============================================================================

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- This migration adds:
-- ✅ Student UPDATE policy for homework_assignments table
-- ✅ Students can now submit homework (update status to 'submitted')
-- ✅ Students can update submission_text, submission_audio_url, etc.
-- ✅ Students can only modify their own assignments (student_id = auth.uid())
-- ============================================================================
