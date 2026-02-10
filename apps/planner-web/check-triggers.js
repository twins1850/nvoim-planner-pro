require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRole);

async function checkTriggers() {
  console.log('\n=== Checking Triggers ===\n');

  // Query pg_trigger to see all triggers
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        t.tgname as trigger_name,
        c.relname as table_name,
        p.proname as function_name
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE t.tgname LIKE '%auth%' OR t.tgname LIKE '%new_user%'
      ORDER BY c.relname, t.tgname;
    `
  });

  if (error) {
    console.log('❌ Error:', error.message);
    console.log('\nTrying alternative method...\n');

    // Try listing functions instead
    const { data: functions, error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT
          proname as function_name,
          prosrc as function_body
        FROM pg_proc
        WHERE proname LIKE '%handle%user%'
        LIMIT 5;
      `
    });

    if (funcError) {
      console.log('❌ Also failed:', funcError.message);
    } else {
      console.log('Functions:', functions);
    }
  } else {
    console.log('Triggers:', data);
  }
}

checkTriggers().catch(console.error);
