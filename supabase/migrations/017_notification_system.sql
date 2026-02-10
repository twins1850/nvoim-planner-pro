-- 알림 시스템 생성
-- 2026년 2월 7일

-- notifications 테이블 생성
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('message', 'homework', 'feedback', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_id UUID, -- 관련된 메시지, 숙제 등의 ID
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책 설정
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 알림만 볼 수 있음
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

-- 사용자는 자신의 알림을 업데이트할 수 있음
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- 알림 업데이트 트리거
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 새 메시지가 도착하면 알림 생성
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id UUID;
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
    SELECT
      COALESCE(p.name, p.email, '플래너')
    INTO v_sender_name
    FROM public.profiles p
    WHERE p.id = NEW.sender_id;
  ELSE
    v_recipient_id := v_teacher_id;

    -- 발신자 이름 조회 (학생)
    SELECT
      COALESCE(sp.name, p.email, '학생')
    INTO v_sender_name
    FROM public.student_profiles sp
    JOIN public.profiles p ON p.id = sp.id
    WHERE sp.id = NEW.sender_id;
  END IF;

  -- 알림 생성
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
    LEFT(NEW.content, 100), -- 메시지 내용 미리보기 (최대 100자)
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 메시지 삽입 시 알림 트리거
CREATE TRIGGER create_notification_on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_notification();

-- 새 숙제가 할당되면 알림 생성
CREATE OR REPLACE FUNCTION create_homework_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_planner_name TEXT;
  v_homework_title TEXT;
BEGIN
  -- 플래너 이름 조회
  SELECT
    COALESCE(p.name, p.email, '플래너')
  INTO v_planner_name
  FROM public.profiles p
  WHERE p.id = NEW.planner_id;

  -- 숙제 제목 조회 (homework_assignments 테이블에서)
  -- 간단히 '새로운 숙제'로 설정
  v_homework_title := '새로운 숙제가 등록되었습니다';

  -- 알림 생성
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    reference_id
  ) VALUES (
    NEW.student_id,
    'homework',
    v_homework_title,
    v_planner_name || '님이 새로운 숙제를 내주셨습니다.',
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- homework_assignments 테이블에 트리거 생성
-- 테이블이 존재하는지 확인하고 트리거 생성
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'homework_assignments'
  ) THEN
    CREATE TRIGGER create_notification_on_new_homework
      AFTER INSERT ON public.homework_assignments
      FOR EACH ROW
      EXECUTE FUNCTION create_homework_notification();
  END IF;
END $$;
