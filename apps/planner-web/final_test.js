const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

async function finalTest() {
  console.log('=== Final Notification System Test ===\n');

  // Get initial count
  const { count: beforeCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true });

  console.log('1. Current notification count:', beforeCount);

  // Send a test message
  console.log('\n2. Sending test message from planner to student...');
  const { data: message, error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: 'd0626060-69cf-4376-a3ac-b13991aad5e9',
      sender_id: 'bd8a51c1-20aa-45fb-bee0-7f5453ea1b18',  // Teacher
      content: '최종 테스트 메시지! 학생 앱에서 알림 확인!'
    })
    .select();

  if (msgError) {
    console.log('   ❌ Error:', msgError.message);
    return;
  }

  console.log('   ✅ Message sent:', message[0].id);

  // Wait for trigger
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Get new count
  const { count: afterCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true });

  console.log('\n3. New notification count:', afterCount);

  if (afterCount > beforeCount) {
    console.log('   🎉 SUCCESS! Notification was created!');

    // Get the latest notification
    const { data: latest } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (latest && latest.length > 0) {
      console.log('\n4. Latest notification details:');
      console.log('   ID:', latest[0].id);
      console.log('   Type:', latest[0].type);
      console.log('   Title:', latest[0].title);
      console.log('   Message:', latest[0].message);
      console.log('   User ID:', latest[0].user_id);
      console.log('   Data:', JSON.stringify(latest[0].data, null, 2));
      console.log('   Created:', latest[0].created_at);

      console.log('\n🎯 Check student app Home screen for the notification!');
    }
  } else {
    console.log('   ❌ No new notification created');
    console.log('   Trigger may still have an error');
  }
}

finalTest().catch(console.error);
