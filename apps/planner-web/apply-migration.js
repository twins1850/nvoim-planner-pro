const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Read the migration SQL
const migrationSQL = fs.readFileSync(
  path.join(__dirname, '../../supabase/migrations/20260205_update_create_subscription_function.sql'),
  'utf-8'
);

console.log('Executing migration...\n');

// Execute the SQL
supabase.rpc('exec_sql', { sql: migrationSQL })
  .then(({ data, error }) => {
    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
    console.log('✅ Migration executed successfully!');
    console.log('Result:', data);
  })
  .catch(err => {
    console.error('Error:', err.message);
    // Try alternative approach: execute via REST API
    console.log('\nTrying direct SQL execution...');
    
    fetch(`${supabaseUrl}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ query: migrationSQL })
    })
    .then(res => res.json())
    .then(data => {
      console.log('✅ Migration executed!');
      console.log('Result:', data);
    })
    .catch(err2 => {
      console.error('❌ Both methods failed');
      console.error('Please execute the SQL manually in Supabase SQL Editor');
      console.log('\nSQL file location:');
      console.log('supabase/migrations/20260205_update_create_subscription_function.sql');
      process.exit(1);
    });
  });
