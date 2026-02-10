// Check messages and conversations data
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ybcjkdcdruquqrdahtga.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const studentId = '3418a06e-7485-40bf-9126-c0ca06da31db';
  const plannerId = 'a3480c6a-4a29-4109-9f1b-dbcaddd56baa';

  console.log('\n📋 데이터베이스 상태 확인\n');

  // 1. Check conversations
  console.log('1️⃣ Conversations 테이블:');
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .or(`teacher_id.eq.${plannerId},student_id.eq.${studentId}`);

  if (convError) {
    console.error('❌ Conversations 조회 에러:', convError);
  } else {
    console.log(`✅ Conversations 수: ${conversations.length}`);
    conversations.forEach(conv => {
      console.log(`   - ID: ${conv.id}`);
      console.log(`     Teacher: ${conv.teacher_id}`);
      console.log(`     Student: ${conv.student_id}`);
      console.log(`     Created: ${conv.created_at}`);
    });
  }

  // 2. Check messages
  console.log('\n2️⃣ Messages 테이블:');
  if (conversations && conversations.length > 0) {
    const conversationId = conversations[0].id;
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false });

    if (msgError) {
      console.error('❌ Messages 조회 에러:', msgError);
    } else {
      console.log(`✅ Messages 수: ${messages.length}`);
      messages.forEach(msg => {
        console.log(`   - ID: ${msg.id}`);
        console.log(`     Sender: ${msg.sender_id}`);
        console.log(`     Content: ${msg.content}`);
        console.log(`     Created: ${msg.created_at}`);
      });
    }
  } else {
    console.log('❌ No conversations found');
  }
}

main();
