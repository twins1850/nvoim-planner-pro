const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://ybcjkdcdruquqrdahtga.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeMigration() {
  console.log('🚀 Executing get_all_subscription_prices function via Supabase API...\\n');

  try {
    // Read the migration file
    const sqlPath = path.join(__dirname, '../../supabase/migrations/20260204_get_all_prices_function.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('✅ SQL file loaded');
    console.log(`📏 SQL length: ${sql.length} characters\\n');

    // Split SQL into DROP and CREATE parts
    const parts = sql.split('CREATE OR REPLACE FUNCTION');
    const dropPart = parts[0].trim();
    const createPart = 'CREATE OR REPLACE FUNCTION' + parts[1];

    console.log('📋 Executing in two parts:\\n');

    // Part 1: DROP the old function
    console.log('1️⃣  Dropping old function...');
    const { data: dropData, error: dropError } = await supabase.rpc('exec_sql', {
      sql_query: dropPart
    });

    if (dropError) {
      // exec_sql might not exist, try direct query
      console.log('   ⚠️  exec_sql RPC not available, trying alternative...\\n');
      throw new Error('Supabase REST API cannot execute DDL statements directly. Please use Supabase SQL Editor instead.');
    }

    console.log('   ✅ Old function dropped\\n');

    // Part 2: CREATE the new function
    console.log('2️⃣  Creating new function...');
    const { data: createData, error: createError } = await supabase.rpc('exec_sql', {
      sql_query: createPart
    });

    if (createError) {
      throw new Error('Create failed: ' + createError.message);
    }

    console.log('   ✅ New function created\\n');

    console.log('🎉 Migration completed successfully!\\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\\n⚠️  The Supabase REST API cannot execute CREATE FUNCTION statements.');
    console.log('📋 Please use one of these methods instead:\\n');
    console.log('1️⃣  Supabase SQL Editor (Web UI):');
    console.log('   https://supabase.com/dashboard/project/ybcjkdcdruquqrdahtga/sql\\n');
    console.log('2️⃣  Copy the SQL from:');
    console.log('   supabase/migrations/20260204_get_all_prices_function.sql\\n');
    console.log('3️⃣  Paste and execute it in the SQL Editor\\n');
    process.exit(1);
  }
}

executeMigration();
