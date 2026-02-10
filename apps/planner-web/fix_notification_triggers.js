const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

async function fixTriggers() {
  console.log('=== Fixing Notification Triggers ===\n');

  // Step 1: Drop existing trigger and function
  console.log('1. Dropping existing trigger and function...');

  const dropTriggerSQL = `
    DROP TRIGGER IF EXISTS create_notification_on_new_message ON public.messages;
  `;

  const dropFunctionSQL = `
    DROP FUNCTION IF EXISTS create_message_notification();
  `;

  try {
    await supabase.rpc('exec_sql', { sql: dropTriggerSQL });
    console.log('   ✅ Trigger dropped');

    await supabase.rpc('exec_sql', { sql: dropFunctionSQL });
    console.log('   ✅ Function dropped');
  } catch (err) {
    console.log('   ℹ️  May not exist:', err.message);
  }

  // Step 2: Create corrected function with 'message' column
  console.log('\n2. Creating corrected function...');

  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION create_message_notification()
    RETURNS TRIGGER AS $$
    DECLARE
      v_teacher_id UUID;
      v_student_id UUID;
      v_recipient_id UUID;
      v_sender_name TEXT;
    BEGIN
      -- conversation 정보 조회
      SELECT teacher_id, student_id INTO v_teacher_id, v_student_id
      FROM public.conversations
      WHERE id = NEW.conversation_id;

      -- 메시지 수신자 결정 (발신자가 아닌 사람)
      IF NEW.sender_id = v_teacher_id THEN
        v_recipient_id := v_student_id;

        -- 발신자 이름 조회 (플래너)
        SELECT COALESCE(p.name, p.email, '플래너')
        INTO v_sender_name
        FROM public.profiles p
        WHERE p.id = NEW.sender_id;
      ELSE
        v_recipient_id := v_teacher_id;

        -- 발신자 이름 조회 (학생)
        SELECT COALESCE(sp.name, p.email, '학생')
        INTO v_sender_name
        FROM public.student_profiles sp
        JOIN public.profiles p ON p.id = sp.id
        WHERE sp.id = NEW.sender_id;
      END IF;

      -- 알림 생성 (message 컬럼 사용)
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        reference_id
      ) VALUES (
        v_recipient_id,
        'message',
        v_sender_name || '님의 새 메시지',
        LEFT(NEW.content, 100),
        NEW.id
      );

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: createFunctionSQL });
    if (error) {
      console.log('   ❌ Error:', error.message);
      return;
    }
    console.log('   ✅ Function created with "message" column');
  } catch (err) {
    console.log('   ❌ Exception:', err.message);
    return;
  }

  // Step 3: Create trigger
  console.log('\n3. Creating trigger...');

  const createTriggerSQL = `
    CREATE TRIGGER create_notification_on_new_message
      AFTER INSERT ON public.messages
      FOR EACH ROW
      EXECUTE FUNCTION create_message_notification();
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: createTriggerSQL });
    if (error) {
      console.log('   ❌ Error:', error.message);
      return;
    }
    console.log('   ✅ Trigger created');
  } catch (err) {
    console.log('   ❌ Exception:', err.message);
    return;
  }

  console.log('\n\n=== ✅ Triggers Fixed! ===\n');

  // Step 4: Test by sending a message
  console.log('Testing notification trigger...\n');

  const { data: testMessage, error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: 'd0626060-69cf-4376-a3ac-b13991aad5e9',
      sender_id: 'bd8a51c1-20aa-45fb-bee0-7f5453ea1b18',
      content: '알림 시스템 테스트 - 스키마 수정 후!'
    })
    .select();

  if (msgError) {
    console.log('❌ Test message error:', msgError.message);
  } else {
    console.log('✅ Test message sent:', testMessage[0].id);

    // Wait a moment then check for notification
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (notifError) {
      console.log('❌ Notification check error:', notifError.message);
    } else if (notifications && notifications.length > 0) {
      console.log('\n✅ Notification created successfully!');
      console.log('   ID:', notifications[0].id);
      console.log('   Type:', notifications[0].type);
      console.log('   Title:', notifications[0].title);
      console.log('   Message:', notifications[0].message);
      console.log('   User ID:', notifications[0].user_id);
      console.log('\n🎯 Check student app Home screen for the notification!');
    } else {
      console.log('\n⚠️  No notifications found - trigger may not have fired');
    }
  }
}

fixTriggers().catch(console.error);
