require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRole, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testTrigger() {
  const testEmail = `trigger-test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  console.log('\n=== Testing Trigger Directly ===\n');
  console.log('Creating user:', testEmail);

  // Use admin.createUser to create user directly
  const { data, error } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: {
      full_name: 'Direct Test User',
      role: 'student'
    }
  });

  if (error) {
    console.log('\n❌ Create user error:', error);
    console.log('Full error:', JSON.stringify(error, null, 2));
    return;
  }

  const userId = data.user.id;
  console.log('\n✅ User created:', userId);

  // Wait a bit for trigger
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    console.log('\n❌ Profile query error:', profileError.message);
  } else if (!profile) {
    console.log('\n❌ TRIGGER FAILED - No profile created!');
  } else {
    console.log('\n✅ Profile created by trigger:');
    console.log('  Full name:', profile.full_name);
    console.log('  Email:', profile.email);
    console.log('  Role:', profile.role);
  }

  // Cleanup
  await supabase.auth.admin.deleteUser(userId);
  console.log('\n🗑️  Test user cleaned up');
}

testTrigger().catch(console.error);
