-- Fix student_profiles RLS SELECT policy - Simplified version
-- 2026-02-09
-- Issue: 500 error when querying student_profiles
-- Fix: Simpler RLS policy without complex EXISTS queries

-- Drop all existing policies
DROP POLICY IF EXISTS "Students can view own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Teachers can view student profiles" ON public.student_profiles;

-- Simple policy: authenticated users can view student profiles where:
-- 1. It's their own profile (auth.uid() = id)
-- 2. OR they are the connected planner (planner_id = auth.uid())
CREATE POLICY "student_profiles_select_policy"
  ON public.student_profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR planner_id = auth.uid()
  );
