const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function checkRLS() {
  console.log('🔍 Checking RLS status on student_profiles...\n');

  // 1. Check if RLS is enabled
  const { data: tables, error: tableError } = await supabase
    .from('pg_tables')
    .select('tablename, rowsecurity')
    .eq('schemaname', 'public')
    .eq('tablename', 'student_profiles');

  if (tableError) {
    console.error('❌ Error checking table:', tableError);
  } else {
    console.log('📋 Table RLS Status:');
    console.log(JSON.stringify(tables, null, 2));
  }

  // 2. Check RLS policies
  console.log('\n📜 RLS Policies:');
  const { data: policies, error: policyError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT 
        policyname,
        cmd,
        qual as using_clause,
        with_check
      FROM pg_policies 
      WHERE tablename = 'student_profiles'
      ORDER BY policyname;
    `
  });

  if (policyError) {
    console.log('⚠️  Cannot query pg_policies directly, trying alternative method...');
    
    // Alternative: Use service role to check data
    const { data: studentData, error: studentError } = await supabase
      .from('student_profiles')
      .select('id, planner_id, full_name')
      .eq('id', 'ea03a8c4-1390-47df-83e2-79ac1712c6a3');

    if (studentError) {
      console.error('❌ Error querying student_profiles:', studentError);
    } else {
      console.log('\n✅ Student data (service role bypass):');
      console.log(JSON.stringify(studentData, null, 2));
    }
  } else {
    console.log(JSON.stringify(policies, null, 2));
  }

  // 3. Check student record exists
  console.log('\n👤 Checking student record:');
  const { data: student, error: studentErr } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('id', 'ea03a8c4-1390-47df-83e2-79ac1712c6a3')
    .single();

  if (studentErr) {
    console.error('❌ Error:', studentErr);
  } else {
    console.log('✅ Student found:');
    console.log(`   ID: ${student.id}`);
    console.log(`   Planner ID: ${student.planner_id}`);
    console.log(`   Full Name: ${student.full_name}`);
    console.log(`   Level: ${student.level}`);
  }
}

checkRLS().catch(console.error);
