const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

async function verifyTrigger() {
  console.log('=== Verifying Trigger and Function ===\n');

  // Check if function exists
  console.log('1. Checking if function exists...');
  const { data: functions, error: funcError } = await supabase
    .rpc('exec_sql', {
      sql: `SELECT proname, prosrc FROM pg_proc WHERE proname = 'create_message_notification';`
    });

  if (funcError) {
    console.log('   Cannot check (exec_sql not available)');
    console.log('   Using alternative method...');

    // Try direct query (may not work with RLS)
    const testResult = await supabase.rpc('create_message_notification');
    console.log('   Function callable:', !testResult.error);
  } else {
    console.log('   Function check result:', functions);
  }

  // Try to manually trigger the function logic
  console.log('\n2. Testing notification insert directly...');

  const { data: notif, error: notifError } = await supabase
    .from('notifications')
    .insert({
      user_id: 'ea03a8c4-1390-47df-83e2-79ac1712c6a3',
      type: 'message',
      title: '직접 삽입 테스트',
      message: '수동으로 삽입한 메시지 알림',
      data: { test: true }
    })
    .select();

  if (notifError) {
    console.log('   ❌ Error:', notifError.message);
  } else {
    console.log('   ✅ Direct insert works!');
    console.log('   Notification ID:', notif[0].id);
  }

  // Send a message and immediately check if trigger fired
  console.log('\n3. Sending message to test trigger...');

  const beforeCount = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true });

  console.log('   Notifications before:', beforeCount.count);

  const { data: msg } = await supabase
    .from('messages')
    .insert({
      conversation_id: 'd0626060-69cf-4376-a3ac-b13991aad5e9',
      sender_id: 'bd8a51c1-20aa-45fb-bee0-7f5453ea1b18',
      content: '트리거 검증 테스트'
    })
    .select();

  console.log('   Message sent:', msg[0].id);

  await new Promise(resolve => setTimeout(resolve, 2000));

  const afterCount = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true });

  console.log('   Notifications after:', afterCount.count);

  if (afterCount.count > beforeCount.count) {
    console.log('   🎉 TRIGGER IS WORKING!');
  } else {
    console.log('   ❌ Trigger did not fire');
  }
}

verifyTrigger().catch(console.error);
