-- Step 1: Drop existing trigger and function
DROP TRIGGER IF EXISTS create_notification_on_new_message ON public.messages;
DROP FUNCTION IF EXISTS create_message_notification();

-- Step 2: Create corrected function with 'message' column
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_teacher_id UUID;
  v_student_id UUID;
  v_recipient_id UUID;
  v_sender_name TEXT;
BEGIN
  -- conversation 정보 조회
  SELECT teacher_id, student_id INTO v_teacher_id, v_student_id
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  -- 메시지 수신자 결정 (발신자가 아닌 사람)
  IF NEW.sender_id = v_teacher_id THEN
    v_recipient_id := v_student_id;

    -- 발신자 이름 조회 (플래너)
    SELECT COALESCE(p.name, p.email, '플래너')
    INTO v_sender_name
    FROM public.profiles p
    WHERE p.id = NEW.sender_id;
  ELSE
    v_recipient_id := v_teacher_id;

    -- 발신자 이름 조회 (학생)
    SELECT COALESCE(sp.name, p.email, '학생')
    INTO v_sender_name
    FROM public.student_profiles sp
    JOIN public.profiles p ON p.id = sp.id
    WHERE sp.id = NEW.sender_id;
  END IF;

  -- 알림 생성 (message 컬럼 사용)
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    reference_id
  ) VALUES (
    v_recipient_id,
    'message',
    v_sender_name || '님의 새 메시지',
    LEFT(NEW.content, 100),
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create trigger
CREATE TRIGGER create_notification_on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_notification();
