-- 메시지 테이블 구조 수정
-- 2026년 1월 8일

-- 1. 기존 불필요한 컬럼 제거
ALTER TABLE public.messages DROP COLUMN IF EXISTS class_id;
ALTER TABLE public.messages DROP COLUMN IF EXISTS receiver_id;
ALTER TABLE public.messages DROP COLUMN IF EXISTS attachments;

-- 2. 필요한 컬럼 추가
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. RLS 정책 수정
DROP POLICY IF EXISTS "Students and teachers can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Students and teachers can insert their messages" ON public.messages;

-- 4. 새로운 RLS 정책 생성
CREATE POLICY "Messages conversation participants can view"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND (c.teacher_id = auth.uid() OR c.student_id = auth.uid())
    )
  );

CREATE POLICY "Messages conversation participants can insert"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.teacher_id = auth.uid() OR c.student_id = auth.uid())
    )
    AND sender_id = auth.uid()
  );

-- 5. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);