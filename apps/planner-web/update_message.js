const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

async function updateMessage() {
  console.log('=== Updating message to simulate planner sending it ===\n');

  // Step 1: Find the latest message
  console.log('1. Finding latest message...');
  const { data: messages, error: findError } = await supabase
    .from('messages')
    .select('id, content, sender_id, read_at, created_at')
    .eq('content', 'RLS 정책 테스트 메시지!')
    .order('created_at', { ascending: false })
    .limit(1);

  if (findError) {
    console.error('   ❌ Error finding message:', findError);
    return;
  }

  if (!messages || messages.length === 0) {
    console.log('   ❌ Message not found!');
    return;
  }

  console.log('   ✅ Found message:', messages[0]);

  // Step 2: Update it
  console.log('\n2. Updating message...');
  const { error: updateError } = await supabase
    .from('messages')
    .update({
      sender_id: 'bd5a51c1-20aa-45fb-bee0-7f5453ea1b18',
      read_at: null
    })
    .eq('id', messages[0].id);

  if (updateError) {
    console.error('   ❌ Update error:', updateError);
    return;
  }

  console.log('   ✅ Message updated successfully!');

  // Step 3: Verify
  console.log('\n3. Verifying update...');
  const { data: updated, error: verifyError } = await supabase
    .from('messages')
    .select('id, content, sender_id, read_at, created_at')
    .eq('id', messages[0].id)
    .single();

  if (verifyError) {
    console.error('   ❌ Verification error:', verifyError);
    return;
  }

  console.log('   ✅ Updated message:', updated);
  console.log('\n=== Complete! ===');
  console.log('The message now appears as if the planner sent it.');
  console.log('Student app should show unread badge on Messages tab!');
}

updateMessage();
