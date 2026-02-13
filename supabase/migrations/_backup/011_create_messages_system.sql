-- 메시지 시스템을 위한 테이블 생성
-- 2026년 1월 8일

-- 메시지 테이블 생성
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'audio')),
  file_url TEXT,
  file_name TEXT,
  file_size INT,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 대화방 테이블 생성 (conversation)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  last_message_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(teacher_id, student_id)
);

-- 메시지 테이블에 외래키 제약조건 추가
ALTER TABLE public.messages 
ADD CONSTRAINT messages_conversation_id_fkey 
FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

-- RLS 정책 설정
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- 메시지 RLS 정책
CREATE POLICY "Users can view their own messages"
  ON public.messages FOR SELECT
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their own messages"
  ON public.messages FOR UPDATE
  USING (sender_id = auth.uid());

-- 대화방 RLS 정책
CREATE POLICY "Users can view their conversations"
  ON public.conversations FOR SELECT
  USING (teacher_id = auth.uid() OR student_id = auth.uid());

CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (teacher_id = auth.uid() OR student_id = auth.uid());

CREATE POLICY "Users can update their conversations"
  ON public.conversations FOR UPDATE
  USING (teacher_id = auth.uid() OR student_id = auth.uid());

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_teacher_id ON public.conversations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_conversations_student_id ON public.conversations(student_id);

-- 메시지 업데이트 트리거
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 메시지가 추가될 때 대화방의 last_message 정보를 업데이트하는 함수
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET 
    last_message_id = NEW.id,
    last_message_time = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER update_conversation_on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();