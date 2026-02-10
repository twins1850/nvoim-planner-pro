// Apply remaining migrations using direct SQL execution
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://ybcjkdcdruquqrdahtga.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSQL(sql, description) {
  console.log(`\n📝 ${description}...`);

  try {
    // Try using the postgres-meta API endpoint for raw SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    console.log(`  ✅ Success`);
    return true;
  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Applying remaining migrations directly...\n');
  console.log('='.repeat(60));

  // 1. Add columns to subscriptions table
  await executeSQL(`
    ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'managed',
    ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash',
    ADD COLUMN IF NOT EXISTS per_lesson_price DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS per_month_price DECIMAL(10,2);
  `, 'Adding columns to subscriptions table');

  // 2. Insert postponement rules data
  await executeSQL(`
    INSERT INTO public.postponement_rules (total_lessons, max_postponements) VALUES
    (1, 0), (4, 1), (8, 1), (12, 2), (20, 3), (24, 3), (36, 6), (60, 10), (72, 12)
    ON CONFLICT (total_lessons) DO NOTHING;
  `, 'Inserting postponement rules data');

  // 3. Read and execute pricing_data.sql
  const pricingDataPath = path.join(__dirname, '../../supabase/migrations/20260204_pricing_data.sql');
  const pricingDataSQL = fs.readFileSync(pricingDataPath, 'utf8');

  // Split into smaller chunks to avoid timeout
  const dataStatements = pricingDataSQL.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));

  console.log(`\n📝 Inserting pricing data (${dataStatements.length} statements)...`);
  for (let i = 0; i < dataStatements.length; i++) {
    const stmt = dataStatements[i].trim();
    if (stmt.length > 0) {
      await executeSQL(stmt + ';', `  Statement ${i+1}/${dataStatements.length}`);
    }
  }

  // 4. Read and execute pricing_functions.sql
  const functionsPath = path.join(__dirname, '../../supabase/migrations/20260204_pricing_functions.sql');
  const functionsSQL = fs.readFileSync(functionsPath, 'utf8');

  await executeSQL(functionsSQL, 'Creating RPC functions');

  console.log('\n' + '='.repeat(60));
  console.log('\n✨ Migration application completed!\n');
  console.log('Running verification...\n');

  // Run verification
  const { exec } = require('child_process');
  exec('node test-pricing-migrations.js', (error, stdout) => {
    console.log(stdout);
  });
}

main().catch(console.error);
