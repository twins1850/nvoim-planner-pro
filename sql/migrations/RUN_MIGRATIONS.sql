-- ============================================
-- 앤보임 플래너 프로 - AI 추천 시스템 마이그레이션
-- 실행 날짜: 2026-02-10
-- ============================================

-- ==========================================
-- PART 1: student_profiles 테이블 확장
-- ==========================================

-- Add new columns for level test information
ALTER TABLE public.student_profiles
ADD COLUMN IF NOT EXISTS level_test_image_url TEXT,
ADD COLUMN IF NOT EXISTS level_test_date DATE,
ADD COLUMN IF NOT EXISTS goal_description TEXT,
ADD COLUMN IF NOT EXISTS goal_target_date DATE,
ADD COLUMN IF NOT EXISTS goal_category TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.student_profiles.level_test_image_url IS '앤보임 레벨테스트 결과표 이미지 URL (Supabase Storage)';
COMMENT ON COLUMN public.student_profiles.level_test_date IS '레벨테스트 실시 날짜';
COMMENT ON COLUMN public.student_profiles.goal_description IS '학생이 이루고자 하는 목표 상세 설명';
COMMENT ON COLUMN public.student_profiles.goal_target_date IS '목표 달성 희망 날짜';
COMMENT ON COLUMN public.student_profiles.goal_category IS '목표 카테고리 (토익스피킹, 해외여행, 일상영어, 워킹홀리데이, 비즈니스영어, 유학준비, 기타)';

-- Create index for efficient querying of students with level tests
CREATE INDEX IF NOT EXISTS idx_student_profiles_level_test
ON public.student_profiles(level_test_date)
WHERE level_test_image_url IS NOT NULL;

-- Create index for goal categories
CREATE INDEX IF NOT EXISTS idx_student_profiles_goal_category
ON public.student_profiles(goal_category)
WHERE goal_category IS NOT NULL;

-- ==========================================
-- PART 2: Storage 버킷 및 RLS 정책
-- ==========================================

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('level-test-images', 'level-test-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Planners can upload level test images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname = 'Planners can upload level test images'
  ) THEN
    CREATE POLICY "Planners can upload level test images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'level-test-images'
      AND auth.uid() IS NOT NULL
    );
  END IF;
END $$;

-- RLS Policy: Planners can view level test images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname = 'Planners can view level test images'
  ) THEN
    CREATE POLICY "Planners can view level test images"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'level-test-images');
  END IF;
END $$;

-- RLS Policy: Planners can update their level test images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname = 'Planners can update their level test images'
  ) THEN
    CREATE POLICY "Planners can update their level test images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'level-test-images'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- RLS Policy: Planners can delete their level test images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname = 'Planners can delete their level test images'
  ) THEN
    CREATE POLICY "Planners can delete their level test images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'level-test-images'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- ==========================================
-- 마이그레이션 완료 확인
-- ==========================================

SELECT
  'student_profiles 컬럼 추가' AS step,
  COUNT(*) AS count
FROM information_schema.columns
WHERE table_name = 'student_profiles'
  AND column_name IN ('level_test_image_url', 'level_test_date', 'goal_description', 'goal_target_date', 'goal_category')

UNION ALL

SELECT
  'Storage 버킷 생성' AS step,
  COUNT(*) AS count
FROM storage.buckets
WHERE id = 'level-test-images'

UNION ALL

SELECT
  'RLS 정책 생성' AS step,
  COUNT(*) AS count
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%level test images%';
