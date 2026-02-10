const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

async function debugNotificationSystem() {
  console.log('=== Debugging Notification System ===\n');

  // Step 1: Check conversation exists
  console.log('1. Checking conversation...');
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', 'd0626060-69cf-4376-a3ac-b13991aad5e9')
    .single();

  if (convError) {
    console.log('   ❌ Conversation error:', convError.message);
    return;
  }

  if (!conversation) {
    console.log('   ❌ Conversation not found!');
    return;
  }

  console.log('   ✅ Conversation found:');
  console.log('      ID:', conversation.id);
  console.log('      Teacher ID:', conversation.teacher_id);
  console.log('      Student ID:', conversation.student_id);

  // Step 2: Try to manually insert a notification
  console.log('\n2. Testing manual notification insert...');
  const { data: manualNotif, error: manualError } = await supabase
    .from('notifications')
    .insert({
      user_id: conversation.student_id,
      type: 'system',
      title: '수동 테스트 알림',
      message: '이것은 수동으로 추가한 테스트 알림입니다.',
      is_read: false
    })
    .select();

  if (manualError) {
    console.log('   ❌ Manual insert error:', manualError.message);
    console.log('   This suggests RLS policies are still blocking inserts');
  } else {
    console.log('   ✅ Manual insert successful!');
    console.log('      Notification ID:', manualNotif[0].id);
  }

  // Step 3: Check if trigger exists
  console.log('\n3. Checking trigger existence...');
  const { data: triggers } = await supabase
    .from('pg_trigger')
    .select('tgname')
    .eq('tgname', 'create_notification_on_new_message');

  if (triggers && triggers.length > 0) {
    console.log('   ✅ Trigger exists:', triggers[0].tgname);
  } else {
    console.log('   ⚠️  Could not verify trigger (table may not be accessible)');
  }

  // Step 4: Send a message and immediately check for notification
  console.log('\n4. Sending message and checking for notification...');

  const { data: newMessage, error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      sender_id: conversation.teacher_id,  // Teacher sends to student
      content: '디버그 테스트 메시지 - 트리거 확인용'
    })
    .select();

  if (msgError) {
    console.log('   ❌ Message error:', msgError.message);
    return;
  }

  console.log('   ✅ Message sent:', newMessage[0].id);

  // Wait for trigger
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check for notification
  const { data: notifications, error: notifError } = await supabase
    .from('notifications')
    .select('*')
    .eq('reference_id', newMessage[0].id);

  if (notifError) {
    console.log('   ❌ Notification query error:', notifError.message);
  } else if (notifications && notifications.length > 0) {
    console.log('\n   🎉 SUCCESS! Notification was created:');
    console.log('      ID:', notifications[0].id);
    console.log('      Type:', notifications[0].type);
    console.log('      Title:', notifications[0].title);
    console.log('      Message:', notifications[0].message);
    console.log('      User ID:', notifications[0].user_id);
    console.log('      (Should be student:', conversation.student_id, ')');
  } else {
    console.log('\n   ❌ No notification created by trigger');
    console.log('      This means the trigger function is not executing or has an error');
  }

  // Step 5: List all notifications
  console.log('\n5. Listing all notifications in table...');
  const { data: allNotifs, error: allError } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (allError) {
    console.log('   ❌ Error:', allError.message);
  } else {
    console.log(`   Found ${allNotifs.length} total notifications`);
    allNotifs.forEach((n, i) => {
      console.log(`   ${i + 1}. ${n.type} - ${n.title} (${n.is_read ? 'read' : 'unread'})`);
    });
  }
}

debugNotificationSystem().catch(console.error);
