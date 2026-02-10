require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRole);

async function verifyTrigger() {
  console.log('\n=== Verifying Trigger Exists ===\n');

  // Query to check if trigger exists
  const { data: triggers, error: triggerError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        t.tgname as trigger_name,
        c.relname as table_name,
        p.proname as function_name,
        pg_get_triggerdef(t.oid) as trigger_definition
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE t.tgname = 'on_auth_user_created';
    `
  });

  if (triggerError) {
    console.log('❌ Error checking trigger:', triggerError.message);
    console.log('Trying alternative method...\n');

    // Try direct query
    const { data, error } = await supabase
      .from('pg_trigger')
      .select('*')
      .eq('tgname', 'on_auth_user_created');

    if (error) {
      console.log('❌ Also failed:', error.message);
    } else {
      console.log('Triggers found:', data);
    }
  } else {
    console.log('✅ Trigger query result:', JSON.stringify(triggers, null, 2));
  }

  // Check if function exists
  const { data: functions, error: funcError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        proname as function_name,
        pg_get_functiondef(oid) as function_definition
      FROM pg_proc
      WHERE proname = 'handle_new_user';
    `
  });

  if (funcError) {
    console.log('\n❌ Error checking function:', funcError.message);
  } else {
    console.log('\n✅ Function exists:', JSON.stringify(functions, null, 2));
  }

  // Check RLS policies on profiles
  const { data: policies, error: policyError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        polname as policy_name,
        polcmd as command,
        pg_get_expr(polqual, polrelid) as using_expression,
        pg_get_expr(polwithcheck, polrelid) as with_check_expression
      FROM pg_policy
      WHERE polrelid = 'public.profiles'::regclass;
    `
  });

  if (policyError) {
    console.log('\n❌ Error checking policies:', policyError.message);
  } else {
    console.log('\n✅ Policies on profiles table:', JSON.stringify(policies, null, 2));
  }
}

verifyTrigger().catch(console.error);
