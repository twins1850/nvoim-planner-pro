-- messages 테이블의 SELECT 정책 수정
-- receiver_id 컬럼이 제거되었으므로 conversations 테이블을 사용

-- 기존 정책 제거
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;

-- 새로운 정책: 대화 참여자가 메시지를 조회할 수 있음
CREATE POLICY "Conversation participants can view messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.teacher_id = auth.uid() OR conversations.student_id = auth.uid())
    )
  );
