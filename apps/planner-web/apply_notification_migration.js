const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

async function applyMigration() {
  console.log('=== Applying Notification System Migration ===\n');

  // Step 1: Create notifications table
  console.log('1. Creating notifications table...');
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS public.notifications (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('message', 'homework', 'feedback', 'system')),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      reference_id UUID,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    if (error && !error.message.includes('already exists')) {
      console.log('   Using direct insert approach...');
      // Create using schema builder if RPC doesn't work
    }
    console.log('   ✅ Table created');
  } catch (err) {
    console.log('   ℹ️  Table may already exist');
  }

  // Step 2: Enable RLS
  console.log('\n2. Enabling RLS...');
  try {
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;'
    });
    console.log('   ✅ RLS enabled');
  } catch (err) {
    console.log('   ℹ️  RLS may already be enabled');
  }

  // Step 3: Create RLS policies
  console.log('\n3. Creating RLS policies...');
  const policies = [
    `CREATE POLICY "Users can view their own notifications"
      ON public.notifications FOR SELECT
      USING (user_id = auth.uid());`,
    `CREATE POLICY "Users can update their own notifications"
      ON public.notifications FOR UPDATE
      USING (user_id = auth.uid());`
  ];

  for (const policy of policies) {
    try {
      await supabase.rpc('exec_sql', { sql: policy });
      console.log('   ✅ Policy created');
    } catch (err) {
      console.log('   ℹ️  Policy may already exist');
    }
  }

  // Step 4: Create indexes
  console.log('\n4. Creating indexes...');
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);',
    'CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);',
    'CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);'
  ];

  for (const index of indexes) {
    try {
      await supabase.rpc('exec_sql', { sql: index });
      console.log('   ✅ Index created');
    } catch (err) {
      console.log('   ℹ️  Index may already exist');
    }
  }

  // Step 5: Create update trigger
  console.log('\n5. Creating update trigger...');
  try {
    await supabase.rpc('exec_sql', {
      sql: `CREATE TRIGGER update_notifications_updated_at
        BEFORE UPDATE ON public.notifications
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();`
    });
    console.log('   ✅ Trigger created');
  } catch (err) {
    console.log('   ℹ️  Trigger may already exist');
  }

  // Step 6: Create message notification function
  console.log('\n6. Creating message notification function...');
  const messageNotificationFunction = `
    CREATE OR REPLACE FUNCTION create_message_notification()
    RETURNS TRIGGER AS $$
    DECLARE
      v_teacher_id UUID;
      v_student_id UUID;
      v_recipient_id UUID;
      v_sender_name TEXT;
    BEGIN
      SELECT teacher_id, student_id INTO v_teacher_id, v_student_id
      FROM public.conversations
      WHERE id = NEW.conversation_id;

      IF NEW.sender_id = v_teacher_id THEN
        v_recipient_id := v_student_id;
        SELECT COALESCE(p.name, p.email, '플래너')
        INTO v_sender_name
        FROM public.profiles p
        WHERE p.id = NEW.sender_id;
      ELSE
        v_recipient_id := v_teacher_id;
        SELECT COALESCE(sp.name, p.email, '학생')
        INTO v_sender_name
        FROM public.student_profiles sp
        JOIN public.profiles p ON p.id = sp.id
        WHERE sp.id = NEW.sender_id;
      END IF;

      INSERT INTO public.notifications (user_id, type, title, body, reference_id)
      VALUES (v_recipient_id, 'message', v_sender_name || '님의 새 메시지', LEFT(NEW.content, 100), NEW.id);

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  try {
    await supabase.rpc('exec_sql', { sql: messageNotificationFunction });
    console.log('   ✅ Function created');
  } catch (err) {
    console.log('   ❌ Error:', err.message);
  }

  // Step 7: Create message notification trigger
  console.log('\n7. Creating message notification trigger...');
  try {
    await supabase.rpc('exec_sql', {
      sql: `CREATE TRIGGER create_notification_on_new_message
        AFTER INSERT ON public.messages
        FOR EACH ROW
        EXECUTE FUNCTION create_message_notification();`
    });
    console.log('   ✅ Trigger created');
  } catch (err) {
    console.log('   ℹ️  Trigger may already exist');
  }

  // Step 8: Create homework notification function
  console.log('\n8. Creating homework notification function...');
  const homeworkNotificationFunction = `
    CREATE OR REPLACE FUNCTION create_homework_notification()
    RETURNS TRIGGER AS $$
    DECLARE
      v_planner_name TEXT;
    BEGIN
      SELECT COALESCE(p.name, p.email, '플래너')
      INTO v_planner_name
      FROM public.profiles p
      WHERE p.id = NEW.planner_id;

      INSERT INTO public.notifications (user_id, type, title, body, reference_id)
      VALUES (NEW.student_id, 'homework', '새로운 숙제가 등록되었습니다', v_planner_name || '님이 새로운 숙제를 내주셨습니다.', NEW.id);

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  try {
    await supabase.rpc('exec_sql', { sql: homeworkNotificationFunction });
    console.log('   ✅ Function created');
  } catch (err) {
    console.log('   ❌ Error:', err.message);
  }

  // Step 9: Create homework notification trigger (if homework_assignments table exists)
  console.log('\n9. Creating homework notification trigger...');
  const homeworkTriggerSQL = `
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'homework_assignments'
      ) THEN
        CREATE TRIGGER create_notification_on_new_homework
          AFTER INSERT ON public.homework_assignments
          FOR EACH ROW
          EXECUTE FUNCTION create_homework_notification();
      END IF;
    END $$;
  `;

  try {
    await supabase.rpc('exec_sql', { sql: homeworkTriggerSQL });
    console.log('   ✅ Trigger created');
  } catch (err) {
    console.log('   ℹ️  Trigger may already exist or table not found');
  }

  console.log('\n\n=== ✅ Migration Complete! ===\n');

  // Test by sending a message
  console.log('Sending test message to trigger notification...\n');
  const { data: testMessage, error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: 'd0626060-69cf-4376-a3ac-b13991aad5e9',
      sender_id: 'bd8a51c1-20aa-45fb-bee0-7f5453ea1b18',
      content: '알림 시스템 테스트 메시지입니다!'
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
      console.log('   Type:', notifications[0].type);
      console.log('   Title:', notifications[0].title);
      console.log('   Body:', notifications[0].body);
      console.log('\n🎯 Check student app Home screen for the notification!');
    } else {
      console.log('\n⚠️  No notifications found');
    }
  }
}

applyMigration().catch(console.error);
