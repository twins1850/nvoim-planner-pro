-- Create Supabase Storage bucket for level test images
-- Migration: 20260210_create_level_test_bucket

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('level-test-images', 'level-test-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Planners can upload level test images
CREATE POLICY "Planners can upload level test images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'level-test-images'
  AND auth.uid() IS NOT NULL
);

-- RLS Policy: Planners can view level test images
CREATE POLICY "Planners can view level test images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'level-test-images');

-- RLS Policy: Planners can update their level test images
CREATE POLICY "Planners can update their level test images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'level-test-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Planners can delete their level test images
CREATE POLICY "Planners can delete their level test images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'level-test-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
