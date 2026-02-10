-- Fix notification function with correct column names
-- profiles table uses: full_name (not name)
-- student_profiles table uses: name

-- Drop and recreate to ensure clean update
DROP FUNCTION IF EXISTS create_message_notification() CASCADE;

CREATE FUNCTION create_message_notification()
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

  -- Determine recipient and get sender name
  IF NEW.sender_id = v_teacher_id THEN
    v_recipient_id := v_student_id;
    -- Get teacher's name (use full_name from profiles)
    SELECT COALESCE(p.full_name, p.email, '플래너')
    INTO v_sender_name
    FROM public.profiles p
    WHERE p.id = NEW.sender_id;
  ELSE
    v_recipient_id := v_teacher_id;
    -- Get student's name (use name from student_profiles)
    SELECT COALESCE(sp.name, p.email, '학생')
    INTO v_sender_name
    FROM public.student_profiles sp
    JOIN public.profiles p ON p.id = sp.id
    WHERE sp.id = NEW.sender_id;
  END IF;

  -- Insert notification
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

-- Recreate the trigger
CREATE TRIGGER create_notification_on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_notification();
