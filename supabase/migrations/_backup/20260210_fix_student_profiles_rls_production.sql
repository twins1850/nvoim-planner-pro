-- Fix student_profiles RLS SELECT policies for production
-- 2026-02-10
-- Issue: Planners cannot view student list in production (Dashboard shows 2, Students page shows 0)
-- Root Cause: RLS SELECT policy not applied or conflicting policies
-- Fix: Clean slate - drop all and recreate with verified logic

-- 1. Drop ALL existing SELECT policies for student_profiles
DROP POLICY IF EXISTS "Students can view own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can view their own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Teachers can view student profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Planners can view their students" ON public.student_profiles;
DROP POLICY IF EXISTS "student_profiles_select_policy" ON public.student_profiles;
DROP POLICY IF EXISTS "student_can_view_own_profile" ON public.student_profiles;
DROP POLICY IF EXISTS "planner_can_view_student_profiles" ON public.student_profiles;

-- 2. Create policy for students to view their own profile
CREATE POLICY "student_can_view_own_profile"
  ON public.student_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 3. Create policy for planners to view their students' profiles
-- This is the critical policy that was missing or not applied
CREATE POLICY "planner_can_view_student_profiles"
  ON public.student_profiles FOR SELECT
  TO authenticated
  USING (planner_id = auth.uid());

-- 4. Verify policies were created
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'student_profiles'
    AND schemaname = 'public'
    AND policyname IN ('student_can_view_own_profile', 'planner_can_view_student_profiles');

  IF policy_count = 2 THEN
    RAISE NOTICE 'SUCCESS: Both RLS policies created successfully for student_profiles';
  ELSE
    RAISE WARNING 'FAILED: Only % policies found. Expected 2.', policy_count;
  END IF;
END $$;
