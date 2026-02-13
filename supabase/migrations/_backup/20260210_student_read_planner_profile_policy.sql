-- Allow students to read their planner's profile
-- This policy enables students to fetch their connected teacher's profile information

CREATE POLICY "Students can read their planner profile"
ON profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT planner_id
    FROM student_profiles
    WHERE student_profiles.id = auth.uid()
  )
);

COMMENT ON POLICY "Students can read their planner profile" ON profiles IS
'Allows authenticated students to read the profile of their assigned planner';
