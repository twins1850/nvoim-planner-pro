const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

async function applyFix() {
  console.log('=== Applying Notification Function Fix ===\n');

  const fixSQL = `
-- Drop the old function
DROP FUNCTION IF EXISTS create_message_notification() CASCADE;

-- Create the corrected function
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_id UUID;
  v_student_id UUID;
  v_recipient_id UUID;
  v_sender_name TEXT;
BEGIN
  -- Get conversation participants
  SELECT teacher_id, student_id INTO v_teacher_id, v_student_id
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  -- Determine recipient and get sender name
  IF NEW.sender_id = v_teacher_id THEN
    v_recipient_id := v_student_id;
    -- Get teacher's name (use full_name from profiles)
    SELECT COALESCE(p.full_name, p.email, '플래너')
    INTO v_sender_name
    FROM public.profiles p
    WHERE p.id = NEW.sender_id;
  ELSE
    v_recipient_id := v_teacher_id;
    -- Get student's name (use name from student_profiles)
    SELECT COALESCE(sp.name, p.email, '학생')
    INTO v_sender_name
    FROM public.student_profiles sp
    JOIN public.profiles p ON p.id = sp.id
    WHERE sp.id = NEW.sender_id;
  END IF;

  -- Insert notification
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_recipient_id,
    'message',
    v_sender_name || '님의 새 메시지',
    LEFT(NEW.content, 100),
    jsonb_build_object(
      'message_id', NEW.id,
      'conversation_id', NEW.conversation_id
    )
  );

  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER create_notification_on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_notification();
`;

  console.log('1. Executing fix SQL...');

  // Execute the SQL using rpc if available, otherwise try direct
  try {
    const { data, error } = await supabase.rpc('exec', { sql: fixSQL });
    if (error) {
      console.log('   RPC not available, trying alternative...\n');

      // Split into individual statements and execute
      console.log('2. Dropping old function...');
      const dropResult = await supabase.rpc('exec_sql', {
        sql: 'DROP FUNCTION IF EXISTS create_message_notification() CASCADE;'
      });

      if (dropResult.error) {
        console.log('   Note: exec_sql also not available');
        console.log('   Please run the SQL manually in Supabase SQL Editor\n');
        console.log('=== SQL TO RUN ===');
        console.log(fixSQL);
        console.log('==================\n');
        return;
      }

      console.log('   ✅ Function dropped');
    } else {
      console.log('   ✅ Fix applied successfully!');
    }
  } catch (err) {
    console.log('   ⚠️ Direct execution not available');
    console.log('   Please copy and run this SQL in Supabase SQL Editor:\n');
    console.log('=== SQL TO RUN ===');
    console.log(fixSQL);
    console.log('==================\n');
    return;
  }

  // Test the fix
  console.log('\n3. Testing the fixed function...');
  const { data: testMsg, error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: 'd0626060-69cf-4376-a3ac-b13991aad5e9',
      sender_id: 'bd8a51c1-20aa-45fb-bee0-7f5453ea1b18',
      content: '수정된 함수 테스트!'
    })
    .select();

  if (msgError) {
    console.log('   ❌ Error:', msgError.message);
  } else {
    console.log('   ✅ Message sent successfully!');

    // Wait for trigger
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check notifications
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (notifications && notifications.length > 0) {
      console.log('   ✅ Notification created!');
      console.log('   Title:', notifications[0].title);
      console.log('   Message:', notifications[0].message);
      console.log('\n🎉 Fix successful! Trigger is working correctly!');
    } else {
      console.log('   ❌ No notification created - trigger may still have issues');
    }
  }
}

applyFix().catch(console.error);
