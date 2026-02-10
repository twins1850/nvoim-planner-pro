const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

async function insertPlannerMessage() {
  console.log('=== Inserting message as planner ===\n');

  const { data: newMsg, error: insertError } = await supabase
    .from('messages')
    .insert({
      conversation_id: 'd0626060-69cf-4376-a3ac-b13991aad5e9',
      sender_id: 'bd8a51c1-20aa-45fb-bee0-7f5453ea1b18',  // Correct teacher ID
      content: '새로운 메시지 - RLS 정책 테스트!'
    })
    .select();

  if (insertError) {
    console.log('❌ Insert error:', insertError);
    return;
  }

  console.log('✅ Message inserted successfully!');
  console.log(newMsg);
  console.log('\n=== Complete! ===');
  console.log('Student app should now show unread badge on Messages tab!');
}

insertPlannerMessage();
