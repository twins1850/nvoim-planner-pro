const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

async function testNotificationTrigger() {
  console.log('=== Testing Notification Trigger ===\n');

  // Step 1: Send a test message
  console.log('1. Sending test message...');

  const { data: testMessage, error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: 'd0626060-69cf-4376-a3ac-b13991aad5e9',
      sender_id: 'bd8a51c1-20aa-45fb-bee0-7f5453ea1b18',
      content: '알림 시스템 테스트 - message 컬럼 수정 후!'
    })
    .select();

  if (msgError) {
    console.log('   ❌ Error sending message:', msgError.message);
    return;
  }

  console.log('   ✅ Message sent:', testMessage[0].id);
  console.log('   Content:', testMessage[0].content);

  // Step 2: Wait a moment for trigger to execute
  console.log('\n2. Waiting for trigger to execute...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 3: Check for notifications
  console.log('\n3. Checking for notifications...');

  const { data: notifications, error: notifError } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (notifError) {
    console.log('   ❌ Error fetching notifications:', notifError.message);
    return;
  }

  if (notifications && notifications.length > 0) {
    console.log(`\n✅ Found ${notifications.length} notification(s):`);

    notifications.forEach((notif, index) => {
      console.log(`\n   Notification ${index + 1}:`);
      console.log('   ID:', notif.id);
      console.log('   Type:', notif.type);
      console.log('   Title:', notif.title);
      console.log('   Message:', notif.message);
      console.log('   User ID:', notif.user_id);
      console.log('   Reference ID:', notif.reference_id);
      console.log('   Is Read:', notif.is_read);
      console.log('   Created:', notif.created_at);
    });

    console.log('\n🎯 SUCCESS! Notification system is working!');
    console.log('   Check student app Home screen for notifications.');
  } else {
    console.log('\n⚠️  No notifications found in database');
    console.log('   This could mean:');
    console.log('   1. Trigger was not created successfully');
    console.log('   2. Function has an error');
    console.log('   3. RLS policies are blocking the insert');
  }

  // Step 4: Check if trigger exists
  console.log('\n4. Checking if trigger exists...');

  const { data: triggers, error: trigError } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT trigger_name, event_manipulation, event_object_table
        FROM information_schema.triggers
        WHERE trigger_name = 'create_notification_on_new_message';
      `
    });

  if (!trigError && triggers) {
    console.log('   ✅ Trigger found:', triggers);
  } else {
    console.log('   ⚠️  Could not check trigger (exec_sql may not be available)');
  }
}

testNotificationTrigger().catch(console.error);
