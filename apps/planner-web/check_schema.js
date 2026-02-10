const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

async function checkSchema() {
  // Check if planner ID exists in profiles
  console.log('=== Checking planner profile ===');
  const { data: plannerProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', 'bd5a51c1-20aa-45fb-bee0-7f5453ea1b18')
    .single();

  if (profileError) {
    console.log('❌ Planner profile error:', profileError);
  } else {
    console.log('✅ Planner profile:', plannerProfile);
  }

  // Check conversations table
  console.log('\n=== Checking conversation ===');
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', 'd0626060-69cf-4376-a3ac-b13991aad5e9')
    .single();

  if (convError) {
    console.log('❌ Conversation error:', convError);
  } else {
    console.log('✅ Conversation:', conversation);
  }

  // Try to INSERT a new message directly as planner
  console.log('\n=== Attempting to insert new message as planner ===');
  const { data: newMsg, error: insertError } = await supabase
    .from('messages')
    .insert({
      conversation_id: 'd0626060-69cf-4376-a3ac-b13991aad5e9',
      sender_id: 'bd5a51c1-20aa-45fb-bee0-7f5453ea1b18',
      content: 'RLS 테스트 - 플래너가 보낸 메시지!'
    })
    .select();

  if (insertError) {
    console.log('❌ Insert error:', insertError);
  } else {
    console.log('✅ New message inserted:', newMsg);
  }
}

checkSchema();
