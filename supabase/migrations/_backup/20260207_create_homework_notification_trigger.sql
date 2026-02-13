-- Create notification trigger for homework assignments
-- This will automatically create notifications when a planner assigns homework to a student

-- Step 1: Create the notification function
CREATE OR REPLACE FUNCTION create_homework_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_planner_name TEXT;
  v_student_id UUID;
BEGIN
  -- Get student_id from the homework assignment
  v_student_id := NEW.student_id;

  -- Get planner's name
  SELECT COALESCE(p.full_name, p.email, '플래너')
  INTO v_planner_name
  FROM public.profiles p
  WHERE p.id = NEW.planner_id;

  -- Insert notification
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_student_id,
    'homework',
    v_planner_name || '님의 새 숙제',
    COALESCE(LEFT(NEW.title, 100), '새로운 숙제가 도착했습니다'),
    jsonb_build_object(
      'homework_id', NEW.id,
      'planner_id', NEW.planner_id,
      'due_date', NEW.due_date
    )
  );

  RETURN NEW;
END;
$$;

-- Step 2: Drop existing trigger if exists
DROP TRIGGER IF EXISTS create_notification_on_new_homework ON public.homework_assignments;

-- Step 3: Create the trigger
CREATE TRIGGER create_notification_on_new_homework
  AFTER INSERT ON public.homework_assignments
  FOR EACH ROW
  EXECUTE FUNCTION create_homework_notification();

-- Note: RLS policy "System can insert notifications" already exists from message notification setup
