const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyRLS() {
  console.log('\n=== 1. Check RLS Policies ===\n');

  // Check policies
  const { data: policies, error: policiesError } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'student_profiles')
    .eq('schemaname', 'public');

  if (policiesError) {
    console.error('Error checking policies:', policiesError);
  } else {
    console.log(`Found ${policies.length} policies on student_profiles:`);
    policies.forEach(p => {
      console.log(`\n  - Policy: ${p.policyname}`);
      console.log(`    Command: ${p.cmd}`);
      console.log(`    Using: ${p.qual}`);
    });
  }

  console.log('\n=== 2. Check Student Data (Service Role) ===\n');

  const plannerId = 'bd8a51c1-20aa-45fb-bee0-7f5453ea1b18';

  // Query with service role (should bypass RLS)
  const { data: students, error: studentsError } = await supabase
    .from('student_profiles')
    .select('id, full_name, planner_id')
    .eq('planner_id', plannerId);

  if (studentsError) {
    console.error('Error getting students:', studentsError);
  } else {
    console.log(`Found ${students.length} students with service role:`);
    students.forEach(s => {
      console.log(`  - ${s.full_name} (planner_id: ${s.planner_id.substring(0, 8)}...)`);
    });
  }

  console.log('\n=== 3. Simulate User Query ===\n');
  console.log('Note: This test uses service role but shows what the query would return');
  console.log('The actual issue may be in the frontend code or session state\n');
}

verifyRLS();
