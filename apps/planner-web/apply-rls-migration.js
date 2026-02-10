const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('\n🔄 Applying RLS migration to production...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../../supabase/migrations/20260210_fix_student_profiles_rls_production.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Migration SQL:');
    console.log('─'.repeat(60));
    console.log(migrationSQL);
    console.log('─'.repeat(60));
    console.log('\n');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      console.error('❌ Error executing migration:', error);

      // Try direct query if RPC fails
      console.log('\n⚠️  RPC failed, trying direct query...\n');

      const { data: directData, error: directError } = await supabase.from('_sql').insert({ query: migrationSQL });

      if (directError) {
        console.error('❌ Direct query also failed:', directError);
        process.exit(1);
      }

      console.log('✅ Migration applied successfully (direct method)');
    } else {
      console.log('✅ Migration applied successfully!');
      console.log('Result:', data);
    }

    // Verify the policies were created
    console.log('\n🔍 Verifying RLS policies...\n');

    const verifySQL = `
      SELECT
        policyname,
        cmd,
        qual::text
      FROM pg_policies
      WHERE tablename = 'student_profiles'
        AND schemaname = 'public'
      ORDER BY policyname;
    `;

    const { data: policies, error: verifyError } = await supabase.rpc('exec_sql', {
      sql_query: verifySQL
    });

    if (!verifyError && policies) {
      console.log('Current policies on student_profiles:');
      console.log(JSON.stringify(policies, null, 2));
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

applyMigration();
