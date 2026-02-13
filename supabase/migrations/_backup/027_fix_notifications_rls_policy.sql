-- ============================================================================
-- Migration: Fix Notifications RLS Policy
-- ============================================================================
-- Purpose: Secure notifications table to prevent unauthorized notification sending
-- Date: 2026-02-13
-- Issue: Current "System can insert notifications" policy allows anyone to send
--        notifications to any user (with_check = true security vulnerability)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Drop Vulnerable Policy
-- ============================================================================

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- ============================================================================
-- 2. Create Secure Planner-to-Student Notification Policy
-- ============================================================================

CREATE POLICY "Planners can send notifications to their students"
  ON public.notifications FOR INSERT
  WITH CHECK (
    -- Only authenticated users can insert
    auth.uid() IS NOT NULL
    AND (
      -- Case 1: Planner sending homework_assigned notification to their student
      (
        type = 'homework_assigned'
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'planner'
        )
        AND EXISTS (
          SELECT 1 FROM public.student_profiles sp
          WHERE sp.id = user_id
          AND sp.planner_id = auth.uid()
        )
      )
      -- Case 2: System notifications (requires admin role)
      OR (
        type IN ('system', 'message')
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      )
    )
  );

COMMENT ON POLICY "Planners can send notifications to their students" ON public.notifications IS
'Secure policy: Planners can only send notifications to their own students.
Admin can send system/message notifications.
Trigger-created notifications (homework_submitted, homework_graded) use SECURITY DEFINER functions.';

-- ============================================================================
-- 3. Verify Trigger Functions Have SECURITY DEFINER
-- ============================================================================

-- Verify notify_teacher_on_submission function
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'notify_teacher_on_submission'
    AND p.prosecdef = true  -- SECURITY DEFINER
  ) THEN
    RAISE WARNING 'notify_teacher_on_submission should be SECURITY DEFINER for trigger-based notifications';
  END IF;
END $$;

-- Verify notify_student_on_grading function
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'notify_student_on_grading'
    AND p.prosecdef = true  -- SECURITY DEFINER
  ) THEN
    RAISE WARNING 'notify_student_on_grading should be SECURITY DEFINER for trigger-based notifications';
  END IF;
END $$;

-- ============================================================================
-- 4. Grant Necessary Permissions
-- ============================================================================

-- Ensure authenticated users can insert (policy will control the details)
GRANT INSERT ON public.notifications TO authenticated;

COMMIT;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- ✅ Removed vulnerable "System can insert notifications" policy
-- ✅ Created secure planner-to-student notification policy
-- ✅ Verified SECURITY DEFINER on trigger functions
-- ✅ Granted necessary permissions
-- ✅ Policy now prevents unauthorized notification sending
-- ============================================================================
