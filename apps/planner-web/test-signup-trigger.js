require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

async function testSignupTrigger() {
  const testEmail = `trigger-test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testName = 'Trigger Test User';

  console.log('\n=== Testing Signup Trigger ===\n');
  console.log('Creating user with:');
  console.log('  Email:', testEmail);
  console.log('  Full name:', testName);

  // Step 1: Sign up (this should trigger handle_new_user())
  const { data: signupData, error: signupError } = await supabaseAnon.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        full_name: testName,
        role: 'student',
      },
    },
  });

  if (signupError) {
    console.log('\n❌ Signup error:', signupError.message);
    return;
  }

  const userId = signupData.user.id;
  console.log('\n✅ User created:', userId);

  // Step 2: Check profiles (wait a bit for trigger)
  await new Promise(resolve => setTimeout(resolve, 2000));

  const { data: profile, error: profileError } = await supabaseAdmin
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
  await supabaseAdmin.auth.admin.deleteUser(userId);
  console.log('\n🗑️  Test user cleaned up');
}

testSignupTrigger().catch(console.error);
