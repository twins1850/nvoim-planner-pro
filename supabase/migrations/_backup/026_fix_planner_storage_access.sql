-- =====================================================
-- Migration: 026_fix_planner_storage_access
-- Description: Fix RLS policy for planners to access student homework submissions
-- Author: dev-backend
-- Date: 2026-02-12
-- Issue: Policy was checking non-existent 'profiles' table instead of 'teacher_profiles'
-- =====================================================

-- Drop the incorrect policy
DROP POLICY IF EXISTS "Planners can read all submissions" ON storage.objects;

-- Recreate with correct table reference
CREATE POLICY "Planners can read all submissions"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'homework-submissions' AND
  EXISTS (
    SELECT 1
    FROM public.teacher_profiles
    WHERE id = auth.uid()
  )
);

-- Add comment
COMMENT ON POLICY "Planners can read all submissions" ON storage.objects IS
'Allows authenticated planners (users in teacher_profiles table) to read all student homework submissions for grading and review';
