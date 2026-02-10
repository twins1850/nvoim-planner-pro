const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

const conversationId = 'd0626060-69cf-4376-a3ac-b13991aad5e9';
const plannerId = 'bd8a51c1-20aa-45fb-bee0-7f5453ea1b18';

async function markAsRead() {
  console.log('=== 메시지 읽음 처리 ===\n');

  // 플래너가 아닌 사람(학생)이 보낸 읽지 않은 메시지를 읽음 처리
  const { data, error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', plannerId)
    .is('read_at', null)
    .select();

  if (error) {
    console.error('❌ 오류:', error);
    return;
  }

  console.log(`✅ ${data?.length || 0}개의 메시지를 읽음 처리했습니다:\n`);
  data?.forEach((msg, index) => {
    console.log(`${index + 1}. "${msg.content}"`);
    console.log(`   read_at: ${msg.read_at}`);
    console.log('');
  });

  // 확인
  const { data: unreadCount } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', plannerId)
    .is('read_at', null);

  console.log(`\n📊 남은 읽지 않은 메시지: ${unreadCount?.count || 0}개`);
}

markAsRead();
