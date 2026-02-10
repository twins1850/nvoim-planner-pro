require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkProfiles() {
  const studentId = 'd0a3930d-a460-487d-8b23-948a58b42f70';

  console.log('\n=== Checking Profiles ===\n');
  console.log('Student ID:', studentId);

  // Check profiles table
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', studentId)
    .maybeSingle();

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  if (!profile) {
    console.log('❌ No profile found for this student ID');

    // Check auth.users
    const { data: authData } = await supabase.auth.admin.getUserById(studentId);
    if (authData && authData.user) {
      console.log('\n✅ Auth user exists:');
      console.log('  Email:', authData.user.email);
      console.log('  Created:', authData.user.created_at);
      console.log('  Metadata:', authData.user.user_metadata);
    } else {
      console.log('❌ No auth user found either');
    }

    // Check recent profiles
    const { data: recentProfiles } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    console.log(`\n📋 Recent profiles (${recentProfiles?.length || 0}):`);
    recentProfiles?.forEach(p => {
      console.log(`  ${p.id}: ${p.email} (${p.role})`);
    });

  } else {
    console.log('✅ Profile found:');
    console.log('  Full name:', profile.full_name);
    console.log('  Email:', profile.email);
    console.log('  Role:', profile.role);
    console.log('  Created:', profile.created_at);
  }
}

checkProfiles().catch(console.error);
