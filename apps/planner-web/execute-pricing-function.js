const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function executeMigration() {
  console.log('🚀 Executing get_all_subscription_prices function migration...\\n');

  try {
    // Read the migration file
    const sqlPath = path.join(__dirname, '../../supabase/migrations/20260204_get_all_prices_function.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('✅ SQL file loaded successfully');
    console.log(`📏 SQL length: ${sql.length} characters\\n`);

    // PostgreSQL connection string
    const connectionString = process.env.DATABASE_URL ||
      `postgresql://postgres.ybcjkdcdruquqrdahtga:${process.env.SUPABASE_DB_PASSWORD}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`;

    if (!process.env.DATABASE_URL && !process.env.SUPABASE_DB_PASSWORD) {
      console.error('❌ Error: DATABASE_URL or SUPABASE_DB_PASSWORD environment variable required');
      console.log('\\n💡 Set one of these environment variables:');
      console.log('   export SUPABASE_DB_PASSWORD="your-password"');
      console.log('   export DATABASE_URL="postgresql://..."\\n');
      process.exit(1);
    }

    // Connect to PostgreSQL
    const client = new Client({ connectionString });
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully\\n');

    // Execute the SQL
    console.log('⚡ Executing migration...');
    await client.query(sql);
    console.log('✅ Migration executed successfully!\\n');

    // Verify the function was created
    console.log('🔍 Verifying function creation...');
    const result = await client.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name = 'get_all_subscription_prices';
    `);

    if (result.rows.length > 0) {
      console.log('✅ Function verified:');
      console.log(`   Name: ${result.rows[0].routine_name}`);
      console.log(`   Type: ${result.rows[0].routine_type}\\n`);
    } else {
      console.log('⚠️  Function not found in database');
    }

    await client.end();
    console.log('🎉 Complete! The get_all_subscription_prices function is now deployed.\\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('\\n📋 Detailed error:', err);
    process.exit(1);
  }
}

executeMigration();
