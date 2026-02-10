const fs = require('fs');
const path = require('path');

async function executeSQLFile() {
  console.log('📝 Executing SQL file...\n');

  try {
    // SQL 파일 읽기
    const sqlPath = path.join(__dirname, '../../supabase/migrations/20260204_get_all_prices_function.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('✅ SQL loaded successfully');
    console.log(`📏 SQL length: ${sql.length} characters\n`);

    // PostgreSQL 연결 문자열 (환경변수에서 가져오기)
    const connectionString = process.env.DATABASE_URL ||
      `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD}@db.ybcjkdcdruquqrdahtga.supabase.co:5432/postgres`;

    console.log('🔌 Connection string:', connectionString.replace(/:[^:@]+@/, ':****@'));

    // pg 라이브러리 사용
    const { Client } = require('pg');
    const client = new Client({ connectionString });

    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('🚀 Executing SQL...');
    const result = await client.query(sql);
    console.log('✅ SQL executed successfully!\n');

    await client.end();
    console.log('🎉 Function created successfully!\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('\n📋 Detailed error:', err);
    process.exit(1);
  }
}

executeSQLFile();
