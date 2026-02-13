-- Fix student_profiles RLS SELECT policies - Clean slate approach
-- 2026-02-09
-- Issue: 500 error when querying student_profiles due to complex/conflicting policies
-- Fix: Drop all SELECT policies and recreate with simple logic

-- Drop ALL existing SELECT policies for student_profiles
DROP POLICY IF EXISTS "Students can view own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can view their own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Teachers can view student profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Planners can view their students" ON public.student_profiles;
DROP POLICY IF EXISTS "student_profiles_select_policy" ON public.student_profiles;

-- Create ONE simple policy for students to view their own profiles
CREATE POLICY "student_can_view_own_profile"
  ON public.student_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create ONE simple policy for planners to view their students' profiles
CREATE POLICY "planner_can_view_student_profiles"
  ON public.student_profiles FOR SELECT
  TO authenticated
  USING (planner_id = auth.uid());
