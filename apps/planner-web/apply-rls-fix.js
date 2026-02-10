const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

async function applyFix() {
  console.log('=== RLS 정책 수정 적용 ===\n');

  // 기존 정책 제거
  console.log('1. 기존 정책 제거...');
  const { error: dropError } = await supabase.rpc('exec_sql', {
    query: 'DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;'
  });

  if (dropError) {
    console.log('   주의: 기존 정책 제거 중 오류 (무시 가능):', dropError.message);
  } else {
    console.log('   ✅ 기존 정책 제거 완료');
  }

  // 새 정책 생성
  console.log('\n2. 새 정책 생성...');
  const newPolicy = `
    CREATE POLICY "Conversation participants can update messages"
      ON public.messages FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.conversations
          WHERE conversations.id = messages.conversation_id
          AND (conversations.teacher_id = auth.uid() OR conversations.student_id = auth.uid())
        )
      );
  `;

  const { error: createError } = await supabase.rpc('exec_sql', {
    query: newPolicy
  });

  if (createError) {
    console.error('   ❌ 새 정책 생성 실패:', createError);
  } else {
    console.log('   ✅ 새 정책 생성 완료');
  }

  console.log('\n=== 완료 ===');
}

applyFix();
