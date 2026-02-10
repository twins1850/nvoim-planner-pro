const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ybcjkdcdruquqrdahtga.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

const studentUserId = 'ea03a8c4-1390-47df-83e2-79ac1712c6a3';

async function checkData() {
  console.log('Checking student_profiles for user:', studentUserId);
  
  // Query with service role (bypasses RLS)
  const { data, error } = await supabase
    .from('student_profiles')
    .select('id, planner_id, full_name, level')
    .eq('id', studentUserId);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('\nData found (service role, RLS bypassed):');
    console.log(JSON.stringify(data, null, 2));
    console.log('\nRow count:', data.length);
  }
}

checkData();
