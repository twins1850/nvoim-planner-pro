-- ============================================================================
-- Phase 8.4: Supabase Storage Bucket Setup
-- Created: 2026-01-14
-- Purpose: Create and configure lesson-videos storage bucket for video uploads
-- ============================================================================

-- ============================================================================
-- Storage Bucket: lesson-videos
-- ============================================================================
-- Create storage bucket for lesson video files
-- Note: If bucket already exists, this will fail - that's OK, skip to policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lesson-videos',
  'lesson-videos',
  false, -- Private bucket, access controlled by RLS
  524288000, -- 500MB file size limit (500 * 1024 * 1024 bytes)
  ARRAY[
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'video/webm',
    'video/x-flv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Storage Policies: lesson-videos bucket
-- ============================================================================

-- Policy 1: Planners can upload videos to their own folder
CREATE POLICY "Planners can upload lesson videos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'lesson-videos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy 2: Planners can view their own videos
CREATE POLICY "Planners can view their lesson videos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'lesson-videos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy 3: Planners can update their own videos (e.g., metadata)
CREATE POLICY "Planners can update their lesson videos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'lesson-videos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy 4: Planners can delete their own videos
CREATE POLICY "Planners can delete their lesson videos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'lesson-videos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Check bucket exists
-- SELECT * FROM storage.buckets WHERE id = 'lesson-videos';

-- Check policies exist
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname LIKE '%lesson videos%';

-- Test upload (replace with actual planner_id)
-- SELECT storage.foldername(name) FROM storage.objects WHERE bucket_id = 'lesson-videos';

-- ============================================================================
-- Usage Notes
-- ============================================================================
-- File naming convention: {planner_id}/{timestamp}_{filename}
-- Example: 123e4567-e89b-12d3-a456-426614174000/1705234567000_lesson_recording.mp4
--
-- Upload from client:
-- const { data, error } = await supabase.storage
--   .from('lesson-videos')
--   .upload(`${user.id}/${Date.now()}_${file.name}`, file);
--
-- Download from client:
-- const { data } = await supabase.storage
--   .from('lesson-videos')
--   .download(`${user.id}/${filename}`);
--
-- Get public URL (for private buckets, need signed URL):
-- const { data } = await supabase.storage
--   .from('lesson-videos')
--   .createSignedUrl(`${user.id}/${filename}`, 3600); // 1 hour expiry
