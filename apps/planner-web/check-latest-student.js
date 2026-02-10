require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkLatestStudent() {
  console.log('\n=== Checking Latest Test Student ===\n');

  // Get all users and find latest test student
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const testStudents = users.filter(u => u.email?.includes('nplanner-test'));

  // Sort by created_at desc
  testStudents.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (testStudents.length === 0) {
    console.log('❌ No test students found');
    return;
  }

  const latestStudent = testStudents[0];
  console.log('Latest test student:');
  console.log('  Email:', latestStudent.email);
  console.log('  ID:', latestStudent.id);
  console.log('  Created:', latestStudent.created_at);
  console.log('  Metadata:', latestStudent.user_metadata);

  // Check profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', latestStudent.id)
    .maybeSingle();

  if (profileError) {
    console.log('\n❌ Profile query error:', profileError.message);
  } else if (!profile) {
    console.log('\n❌ NO PROFILE FOUND IN profiles TABLE');
    console.log('   This means handle_new_user() trigger did not create profile');
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
    .eq('id', latestStudent.id)
    .maybeSingle();

  if (studentProfile) {
    console.log('\n✅ Student profile found:');
    console.log('  Planner ID:', studentProfile.planner_id);
    console.log('  Level:', studentProfile.level);
  } else {
    console.log('\n❌ No student_profile found');
  }
}

checkLatestStudent().catch(console.error);
