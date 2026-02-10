-- Fix student_profiles RLS SELECT policy
-- 2026-02-09
-- Issue: Students cannot read their own profiles, causing "No connected teacher" error
-- Fix: Ensure students can view their own profile data

-- Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Students can view own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.student_profiles;

-- Create policy for students to view their own profile
CREATE POLICY "Students can view own profile"
  ON public.student_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Also ensure teachers can view their students' profiles
DROP POLICY IF EXISTS "Teachers can view student profiles" ON public.student_profiles;

CREATE POLICY "Teachers can view student profiles"
  ON public.student_profiles FOR SELECT
  TO authenticated
  USING (
    planner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'planner'
    )
  );
