-- 기존 정책 제거
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- 새로운 정책: 대화 참여자가 메시지를 업데이트할 수 있음
CREATE POLICY "Conversation participants can update messages"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.teacher_id = auth.uid() OR conversations.student_id = auth.uid())
    )
  );
