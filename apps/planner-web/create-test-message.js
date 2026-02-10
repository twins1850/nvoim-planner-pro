const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

const conversationId = 'd0626060-69cf-4376-a3ac-b13991aad5e9';
const studentId = 'ea03a8c4-1390-47df-83e2-79ac1712c6a3';

async function createMessage() {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: studentId,
      content: '테스트 메시지',
      read_at: null
    })
    .select()
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('✅ 메시지 생성:', data);
  }
}

createMessage();
