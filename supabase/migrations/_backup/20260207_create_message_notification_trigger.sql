-- Create notification trigger for messages
-- Matches actual notifications table schema: id, user_id, type, title, message, data, is_read, created_at

-- Step 1: Create the notification function
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_id UUID;
  v_student_id UUID;
  v_recipient_id UUID;
  v_sender_name TEXT;
BEGIN
  -- Get conversation participants
  SELECT teacher_id, student_id INTO v_teacher_id, v_student_id
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  -- Determine recipient (the one who didn't send the message)
  IF NEW.sender_id = v_teacher_id THEN
    v_recipient_id := v_student_id;
    -- Get teacher's name
    SELECT COALESCE(p.name, p.email, '플래너')
    INTO v_sender_name
    FROM public.profiles p
    WHERE p.id = NEW.sender_id;
  ELSE
    v_recipient_id := v_teacher_id;
    -- Get student's name
    SELECT COALESCE(sp.name, p.email, '학생')
    INTO v_sender_name
    FROM public.student_profiles sp
    JOIN public.profiles p ON p.id = sp.id
    WHERE sp.id = NEW.sender_id;
  END IF;

  -- Insert notification with correct schema
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_recipient_id,
    'message',
    v_sender_name || '님의 새 메시지',
    LEFT(NEW.content, 100),
    jsonb_build_object(
      'message_id', NEW.id,
      'conversation_id', NEW.conversation_id
    )
  );

  RETURN NEW;
END;
$$;

-- Step 2: Drop existing trigger if exists
DROP TRIGGER IF EXISTS create_notification_on_new_message ON public.messages;

-- Step 3: Create the trigger
CREATE TRIGGER create_notification_on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_notification();

-- Step 4: Add INSERT policy for notifications if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications'
    AND policyname = 'System can insert notifications'
  ) THEN
    CREATE POLICY "System can insert notifications"
      ON public.notifications FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;
