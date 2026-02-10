const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

const studentId = 'ea03a8c4-1390-47df-83e2-79ac1712c6a3';
const plannerId = 'bd8a51c1-20aa-45fb-bee0-7f5453ea1b18';

async function checkMessages() {
  console.log('=== 메시지 읽음 상태 확인 ===\n');

  // 대화방 찾기
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('teacher_id', plannerId)
    .eq('student_id', studentId)
    .single();

  if (!conversation) {
    console.log('❌ 대화방을 찾을 수 없습니다.');
    return;
  }

  console.log('✅ 대화방 ID:', conversation.id, '\n');

  // 모든 메시지 조회
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: true });

  console.log(`총 ${messages?.length || 0}개의 메시지:\n`);

  messages?.forEach((msg, index) => {
    console.log(`${index + 1}. ${msg.content}`);
    console.log(`   sender_id: ${msg.sender_id}`);
    console.log(`   created_at: ${msg.created_at}`);
    console.log(`   read_at: ${msg.read_at || 'NULL (읽지 않음)'}`);
    console.log('');
  });

  // 읽지 않은 메시지 (학생이 보낸 것만)
  const { data: unreadFromStudent } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversation.id)
    .eq('sender_id', studentId)
    .is('read_at', null);

  console.log(`\n📊 학생이 보낸 읽지 않은 메시지: ${unreadFromStudent?.length || 0}개`);

  if (unreadFromStudent && unreadFromStudent.length > 0) {
    console.log('\n이 메시지들을 읽음 처리해야 합니다:');
    unreadFromStudent.forEach(msg => {
      console.log(`  - "${msg.content}" (${msg.created_at})`);
    });
  }
}

checkMessages();
