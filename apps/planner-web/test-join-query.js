require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function testJoinQuery() {
  console.log('\n=== Testing JOIN Query ===\n');

  // Get testplanner ID
  const testPlannerEmail = 'testplanner-1770025511657@example.com';
  const { data: users } = await supabase.auth.admin.listUsers();
  const testPlanner = users?.users.find(u => u.email === testPlannerEmail);

  if (!testPlanner) {
    console.log('❌ Testplanner not found');
    return;
  }

  console.log('✅ Testplanner ID:', testPlanner.id);

  // Step 1: student_profiles에서 planner에 연결된 학생 ID 가져오기
  const { data: studentProfiles, error: spError } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('planner_id', testPlanner.id)
    .order('created_at', { ascending: false });

  if (spError) {
    console.log('❌ Student profiles query error:', spError.message);
    return;
  }

  console.log(`\n✅ Found ${studentProfiles?.length || 0} student profile(s)\n`);

  if (!studentProfiles || studentProfiles.length === 0) {
    console.log('ℹ️  No students connected to this planner');

    // Check if there are ANY student_profiles
    const { data: allProfiles } = await supabase
      .from('student_profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    console.log(`\nℹ️  Total student_profiles in DB: ${allProfiles?.length || 0}`);

    if (allProfiles && allProfiles.length > 0) {
      console.log('\nRecent student_profiles:');
      allProfiles.forEach((sp, idx) => {
        console.log(`  ${idx + 1}. ID: ${sp.id}, Planner ID: ${sp.planner_id || 'NULL'}, Created: ${sp.created_at}`);
      });
    }
  } else {
    // Step 2: Get profile information for connected students
    const studentIds = studentProfiles.map(sp => sp.id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', studentIds);

    if (profilesError) {
      console.log('❌ Profiles query error:', profilesError.message);
      return;
    }

    // Step 3: Manually join
    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
    studentProfiles.forEach((sp, idx) => {
      const profile = profilesMap.get(sp.id);
      console.log(`Student ${idx + 1}:`);
      console.log('  ID:', sp.id);
      console.log('  Planner ID:', sp.planner_id);
      console.log('  Level:', sp.level);
      console.log('  Created:', sp.created_at);
      console.log('  Name:', profile?.full_name);
      console.log('  Email:', profile?.email);
      console.log('');
    });
  }
}

testJoinQuery().catch(console.error);
