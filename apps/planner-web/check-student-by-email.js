require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkStudent(email) {
  console.log('\n=== Checking Student ===\n');
  console.log('Email:', email);

  // Get user by email
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const student = users.find(u => u.email === email);

  if (!student) {
    console.log('❌ User not found');
    return;
  }

  console.log('\n✅ User found:');
  console.log('  ID:', student.id);
  console.log('  Created:', student.created_at);
  console.log('  Metadata:', JSON.stringify(student.user_metadata, null, 2));

  // Check profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', student.id)
    .maybeSingle();

  if (profileError) {
    console.log('\n❌ Profile query error:', profileError.message);
  } else if (!profile) {
    console.log('\n❌ NO PROFILE FOUND IN profiles TABLE');
    console.log('   Trigger did NOT create profile!');
  } else {
    console.log('\n✅ Profile found:');
    console.log('  Full name:', profile.full_name);
    console.log('  Email:', profile.email);
    console.log('  Role:', profile.role);
  }

  // Check student_profiles
  const { data: studentProfile } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('id', student.id)
    .maybeSingle();

  if (studentProfile) {
    console.log('\n✅ Student profile found:');
    console.log('  Planner ID:', studentProfile.planner_id || 'NULL');
    console.log('  Level:', studentProfile.level);
  } else {
    console.log('\n❌ No student_profile found');
  }
}

const testEmail = process.argv[2] || 'nplanner-test-1770081613985-zfoxcm@mailinator.com';
checkStudent(testEmail).catch(console.error);
