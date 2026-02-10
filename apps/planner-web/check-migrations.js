const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMigrations() {
  console.log('🔍 Checking migration history...\n');

  const { data, error } = await supabase
    .from('schema_migrations')
    .select('version')
    .order('version', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('📜 Recent migrations:');
  data.forEach((m, i) => {
    const marker = m.version.includes('20260209') ? '👉' : '  ';
    console.log(`${marker} ${i + 1}. ${m.version}`);
  });

  // Check for today's RLS fixes
  const rlsFixes = data.filter(m => m.version.includes('fix_student_profiles_rls'));
  console.log(`\n✅ Found ${rlsFixes.length} RLS fix migrations applied:`);
  rlsFixes.forEach(m => console.log(`   - ${m.version}`));
}

checkMigrations();
