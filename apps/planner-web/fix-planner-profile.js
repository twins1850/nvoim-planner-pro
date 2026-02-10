// Fix planner_profiles for twins1850@naver.com
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ybcjkdcdruquqrdahtga.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const email = 'twins1850@naver.com';

  console.log(`Creating planner_profiles for ${email}...`);

  // Get user ID from profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (profileError || !profile) {
    console.error('Profile not found:', profileError);
    return;
  }

  console.log('User ID:', profile.id);

  // Create planner_profiles row
  const { data, error } = await supabase
    .from('planner_profiles')
    .insert({ id: profile.id })
    .select();

  if (error) {
    if (error.code === '23505') {
      console.log('✅ planner_profiles row already exists');
    } else {
      console.error('❌ Insert failed:', error);
      return;
    }
  } else {
    console.log('✅ planner_profiles row created successfully');
  }

  // Verify the row exists
  const { data: verifyData, error: verifyError } = await supabase
    .from('planner_profiles')
    .select('id, invite_code, created_at')
    .eq('id', profile.id)
    .single();

  if (verifyError) {
    console.error('❌ Verification failed:', verifyError);
  } else {
    console.log('✅ Verification successful:', verifyData);
  }
}

main();
