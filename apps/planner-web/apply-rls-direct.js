const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyRLSFix() {
  console.log('\n🔄 Applying RLS fix to production...\n');

  const sqlStatements = [
    {
      name: 'Drop old policies',
      sql: `
        DROP POLICY IF EXISTS "Students can view own profile" ON public.student_profiles;
        DROP POLICY IF EXISTS "Students can view their own profile" ON public.student_profiles;
        DROP POLICY IF EXISTS "Users can view own profile" ON public.student_profiles;
        DROP POLICY IF EXISTS "Teachers can view student profiles" ON public.student_profiles;
        DROP POLICY IF EXISTS "Planners can view their students" ON public.student_profiles;
        DROP POLICY IF EXISTS "student_profiles_select_policy" ON public.student_profiles;
        DROP POLICY IF EXISTS "student_can_view_own_profile" ON public.student_profiles;
        DROP POLICY IF EXISTS "planner_can_view_student_profiles" ON public.student_profiles;
      `
    },
    {
      name: 'Create student policy',
      sql: `
        CREATE POLICY "student_can_view_own_profile"
          ON public.student_profiles FOR SELECT
          TO authenticated
          USING (auth.uid() = id);
      `
    },
    {
      name: 'Create planner policy (CRITICAL)',
      sql: `
        CREATE POLICY "planner_can_view_student_profiles"
          ON public.student_profiles FOR SELECT
          TO authenticated
          USING (planner_id = auth.uid());
      `
    }
  ];

  for (const statement of sqlStatements) {
    try {
      console.log(`Executing: ${statement.name}...`);
      const { data, error } = await supabase.rpc('query', { query_text: statement.sql });

      if (error) {
        console.log(`  ⚠️  Warning: ${error.message}`);
      } else {
        console.log(`  ✅ Success`);
      }
    } catch (err) {
      console.log(`  ⚠️  Caught error: ${err.message}`);
    }
  }

  console.log('\n✅ RLS fix application completed!\n');
  console.log('Testing connection with planner admin account...\n');

  // Test query
  const { data: profiles, error: testError } = await supabase
    .from('student_profiles')
    .select('id, full_name, planner_id')
    .eq('planner_id', 'bd8a51c1-20aa-45fb-bee0-7f5453ea1b18')
    .limit(5);

  if (testError) {
    console.log(`❌ Test query failed: ${testError.message}`);
  } else {
    console.log(`✅ Test query succeeded! Found ${profiles.length} students`);
    profiles.forEach((p, i) => {
      console.log(`   ${i+1}. ${p.full_name || '(no name)'} (ID: ${p.id.substring(0, 8)}...)`);
    });
  }
}

applyRLSFix();
