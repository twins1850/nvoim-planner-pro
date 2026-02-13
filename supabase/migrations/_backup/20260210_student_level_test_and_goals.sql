-- Add level test and learning goals fields to student_profiles table
-- Migration: 20260210_student_level_test_and_goals

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
