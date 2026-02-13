-- =====================================================
-- Migration: 025_create_homework_submissions_bucket
-- Description: Create the homework-submissions storage bucket
-- Author: dev-backend
-- Date: 2026-02-12
-- =====================================================

-- Create the homework-submissions bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'homework-submissions',
  'homework-submissions',
  false,  -- NOT public - requires signed URLs for access
  52428800,  -- 50MB max file size (50 * 1024 * 1024)
  ARRAY[
    'audio/mp4',
    'audio/m4a',
    'audio/mpeg',
    'audio/wav',
    'audio/webm',  -- Web browser audio recording format
    'video/mp4',
    'video/quicktime',
    'video/webm',  -- Web browser video recording format
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Comment
COMMENT ON TABLE storage.buckets IS 'Storage buckets for file uploads';
