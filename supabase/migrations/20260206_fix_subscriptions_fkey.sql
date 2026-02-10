-- Fix subscriptions.student_id foreign key to reference student_profiles instead of students
-- This aligns with the updated create_subscription function that uses student_profiles.planner_id

-- Step 1: Delete orphaned subscriptions (student_id not in student_profiles)
DELETE FROM subscriptions
WHERE NOT EXISTS (
  SELECT 1 FROM student_profiles sp WHERE sp.id = subscriptions.student_id
);

-- Step 2: Drop the old foreign key constraint
ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_student_id_fkey;

-- Step 3: Add new foreign key constraint referencing student_profiles
ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_student_id_fkey
FOREIGN KEY (student_id)
REFERENCES student_profiles(id)
ON DELETE CASCADE;

-- Add comment to document the change
COMMENT ON CONSTRAINT subscriptions_student_id_fkey ON subscriptions IS
'References student_profiles(id) - aligned with create_subscription function';
