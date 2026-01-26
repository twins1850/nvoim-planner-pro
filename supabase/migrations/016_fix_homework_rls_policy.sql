-- Fix homework RLS policy to properly check student access through students table
-- The homework_assignments.student_id references students.id (NOT auth.users.id)
-- So we need to join through students table to check students.user_id = auth.uid()

-- Drop the incorrect policy
DROP POLICY IF EXISTS "Students can view assigned homework" ON public.homework;

-- Create the correct policy that uses students table junction
CREATE POLICY "Students can view assigned homework"
  ON public.homework FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = homework.student_id
      AND students.user_id = auth.uid()
    )
  );
