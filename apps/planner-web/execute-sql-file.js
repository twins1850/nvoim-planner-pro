// Execute SQL file directly
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const filename = process.argv[2];
if (!filename) {
  console.error('Usage: node execute-sql-file.js <migration-file>');
  process.exit(1);
}

// Database connection string (from Supabase dashboard)
const connectionString = `postgresql://postgres.ybcjkdcdruquqrdahtga:${process.env.SUPABASE_SERVICE_ROLE_KEY}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`;

async function executeSQLFile() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const filepath = path.join(__dirname, '../../supabase/migrations', filename);
    const sql = fs.readFileSync(filepath, 'utf8');

    console.log(`📄 Executing: ${filename}\n`);
    console.log('SQL Preview:');
    console.log(sql.substring(0, 200) + '...\n');

    const result = await client.query(sql);
    console.log('✅ SQL executed successfully!');
    console.log(`Result: ${JSON.stringify(result.rows?.slice(0, 3) || 'No rows')}\n`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Detail:', err.detail || '');
  } finally {
    await client.end();
  }
}

executeSQLFile();
