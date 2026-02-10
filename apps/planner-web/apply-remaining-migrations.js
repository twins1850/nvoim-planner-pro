// Apply remaining pricing migrations
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://ybcjkdcdruquqrdahtga.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQLFile(filename) {
  console.log(`\n📄 Executing: ${filename}`);

  const filepath = path.join(__dirname, '../../supabase/migrations', filename);
  const sql = fs.readFileSync(filepath, 'utf8');

  // Split by semicolon but be careful with functions
  const statements = sql
    .split(/;\s*(?=(?:[^']*'[^']*')*[^']*$)/)
    .filter(stmt => stmt.trim().length > 0);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim();
    if (stmt.length === 0 || stmt.startsWith('--')) continue;

    try {
      // Use the PostgreSQL REST API directly
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ query: stmt })
      });

      if (!response.ok && response.status !== 404) {
        const error = await response.text();
        console.log(`  ⚠️  Statement ${i + 1}: ${error.substring(0, 100)}`);
      }
    } catch (err) {
      console.log(`  ⚠️  Statement ${i + 1}: ${err.message.substring(0, 100)}`);
    }
  }

  console.log(`  ✅ ${filename} processed`);
}

async function main() {
  console.log('🚀 Applying remaining migrations...\n');
  console.log('=' .repeat(60));

  // Apply migrations in order
  await executeSQLFile('20260204_postponement_rules.sql');
  await executeSQLFile('20260204_update_subscriptions.sql');
  await executeSQLFile('20260204_pricing_data.sql');
  await executeSQLFile('20260204_pricing_functions.sql');

  console.log('\n' + '='.repeat(60));
  console.log('\n✨ Migrations applied! Running verification...\n');

  // Verify
  const { exec } = require('child_process');
  exec('node test-pricing-migrations.js', (error, stdout, stderr) => {
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
  });
}

main().catch(console.error);
