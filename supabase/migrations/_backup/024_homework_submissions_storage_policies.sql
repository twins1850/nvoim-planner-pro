-- =====================================================
-- Migration: 024_homework_submissions_storage_policies
-- Description: Storage bucket RLS policies for homework submissions
-- Author: dev-backend
-- Date: 2026-02-12
-- =====================================================

-- Enable RLS on storage.objects (should already be enabled, but just in case)
-- NOTE: Commented out because storage.objects is a system table with RLS already enabled in local Supabase
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Policy 1: Students can upload files to their own folder
-- =====================================================
CREATE POLICY "Students can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  -- Bucket must be homework-submissions
  bucket_id = 'homework-submissions' AND
  -- File path must start with user's own ID
  (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- Policy 2: Students can read their own submissions
-- =====================================================
CREATE POLICY "Students can read own submissions"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  -- Bucket must be homework-submissions
  bucket_id = 'homework-submissions' AND
  -- File path must start with user's own ID
  (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- Policy 3: Students can update their own files
-- =====================================================
CREATE POLICY "Students can update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'homework-submissions' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'homework-submissions' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- Policy 4: Students can delete their own files
-- =====================================================
CREATE POLICY "Students can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'homework-submissions' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- Policy 5: Planners can read all submissions
-- =====================================================
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

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON POLICY "Students can upload to own folder" ON storage.objects IS
'Allows students to upload files to their own folder (user_id/homework_id/filename)';

COMMENT ON POLICY "Students can read own submissions" ON storage.objects IS
'Allows students to read their own uploaded files';

COMMENT ON POLICY "Planners can read all submissions" ON storage.objects IS
'Allows planners to read all student submissions for grading';
