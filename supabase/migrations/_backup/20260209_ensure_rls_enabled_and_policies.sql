-- Ensure RLS is enabled and policies are correctly set
-- 2026-02-09
-- Issue: student_profiles queries return empty array from student app
-- Root cause: RLS might not be enabled or policies not applied correctly

-- 1. ENABLE RLS on student_profiles (this is critical!)
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing SELECT policies to start fresh
DROP POLICY IF EXISTS "Students can view own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can view their own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Teachers can view student profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Planners can view their students" ON public.student_profiles;
DROP POLICY IF EXISTS "student_profiles_select_policy" ON public.student_profiles;
DROP POLICY IF EXISTS "student_can_view_own_profile" ON public.student_profiles;
DROP POLICY IF EXISTS "planner_can_view_student_profiles" ON public.student_profiles;

-- 3. Create TWO simple, clear policies
-- Policy 1: Students can view their own profile
CREATE POLICY "student_can_view_own_profile"
  ON public.student_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 2: Planners can view their students' profiles
CREATE POLICY "planner_can_view_student_profiles"
  ON public.student_profiles FOR SELECT
  TO authenticated
  USING (planner_id = auth.uid());

-- 4. Verify RLS is enabled
DO $$
BEGIN
  IF NOT (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_profiles') THEN
    RAISE EXCEPTION 'RLS is not enabled on student_profiles!';
  END IF;

  RAISE NOTICE 'RLS is enabled on student_profiles';
END $$;
