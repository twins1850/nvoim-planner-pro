const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

async function runMigration() {
  console.log('=== Running Notification System Migration ===\n');

  const migrationPath = path.join(__dirname, '../../supabase/migrations/017_notification_system.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  console.log(`Found ${statements.length} statements to execute\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (!stmt) continue;

    // Show first line of each statement for context
    const firstLine = stmt.split('\n')[0].substring(0, 60);
    console.log(`\n[${i + 1}/${statements.length}] ${firstLine}...`);

    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: stmt + ';'
      });

      if (error) {
        console.log(`   ❌ Error: ${error.message}`);

        // For some statements, we might want to continue even if they fail
        // (e.g., if table already exists)
        if (error.message.includes('already exists')) {
          console.log('   ⚠️  Already exists, continuing...');
        } else {
          console.log('\n❌ Migration failed!');
          return;
        }
      } else {
        console.log('   ✅ Success');
      }
    } catch (err) {
      console.log(`   ❌ Exception: ${err.message}`);
      return;
    }
  }

  console.log('\n\n=== ✅ Migration Completed Successfully! ===\n');

  // Test: Send a test message to trigger notification
  console.log('Testing notification trigger...\n');

  const { data: testMessage, error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: 'd0626060-69cf-4376-a3ac-b13991aad5e9',
      sender_id: 'bd8a51c1-20aa-45fb-bee0-7f5453ea1b18',
      content: '알림 테스트 메시지입니다!'
    })
    .select();

  if (msgError) {
    console.log('❌ Test message error:', msgError.message);
  } else {
    console.log('✅ Test message sent:', testMessage[0].id);

    // Check if notification was created
    setTimeout(async () => {
      const { data: notifications, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (notifError) {
        console.log('❌ Notification check error:', notifError.message);
      } else if (notifications && notifications.length > 0) {
        console.log('✅ Notification created:', notifications[0]);
        console.log('\n🎯 Check student app Home screen for notification!');
      } else {
        console.log('⚠️  No notifications found');
      }
    }, 1000);
  }
}

runMigration();
