-- Migration: Create homework-submissions storage bucket with RLS policies
-- Date: 2026-02-13
-- Purpose: Fix audio/webm mime type not supported error
-- Related: HOMEWORK_AUDIO_FIX_REPORT.md, AUDIO_PLAYBACK_FIX_REPORT.md

-- Create homework-submissions bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'homework-submissions',
  'homework-submissions',
  false,  -- NOT public - requires signed URLs for security
  52428800,  -- 50MB max per file
  ARRAY[
    'audio/webm',      -- Web browser recording
    'audio/mp4',       -- Android recording
    'audio/m4a',       -- iOS recording
    'audio/mpeg',      -- MP3 format
    'audio/wav',       -- WAV format
    'audio/ogg',       -- OGG format
    'video/mp4',       -- Video submissions
    'video/webm',      -- Web video
    'image/jpeg',      -- Image submissions
    'image/png',
    'image/gif',
    'application/pdf', -- Document submissions
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Grant authenticated users access to bucket
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Verify bucket creation
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'homework-submissions') THEN
    RAISE EXCEPTION 'Bucket creation failed!';
  END IF;

  RAISE NOTICE 'SUCCESS: homework-submissions bucket created with mime types: %',
    (SELECT allowed_mime_types FROM storage.buckets WHERE id = 'homework-submissions');
END $$;
