-- Migration: Create RLS policies for homework-submissions storage bucket
-- Date: 2026-02-13
-- Purpose: Allow authenticated students to upload homework audio files
-- Related: Migration 025 (bucket creation), AUDIO_SUBMISSION_E2E_TEST_REPORT.md

-- Enable RLS on storage.objects table (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Students can INSERT their own files
-- Path format: homework-submissions/{user_id}/{homework_id}/audio_*.webm
CREATE POLICY "Students can upload homework submissions"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'homework-submissions' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Students can SELECT (read) their own files
CREATE POLICY "Students can read their own homework submissions"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'homework-submissions' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Planners (teachers) can SELECT all homework submissions
-- This allows teachers to view/grade student submissions
CREATE POLICY "Planners can read all homework submissions"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'homework-submissions' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'planner'
  )
);

-- Policy 4: Students can UPDATE (replace) their own files (for resubmission)
CREATE POLICY "Students can update their own homework submissions"
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

-- Policy 5: Students can DELETE their own files (for re-recording before submission)
CREATE POLICY "Students can delete their own homework submissions"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'homework-submissions' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Verify policies created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname = 'Students can upload homework submissions'
  ) THEN
    RAISE EXCEPTION 'Storage policies creation failed!';
  END IF;

  RAISE NOTICE 'SUCCESS: homework-submissions storage policies created';
END $$;
