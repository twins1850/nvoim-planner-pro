const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://ybcjkdcdruquqrdahtga.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('📝 Applying get_all_subscription_prices function migration...\n');

  try {
    // SQL 파일 읽기
    const sqlPath = path.join(__dirname, '../../supabase/migrations/20260204_get_all_prices_function.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // SQL 실행
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).single();

    if (error) {
      // exec_sql RPC가 없을 수 있으므로 직접 실행 시도
      console.log('⚠️  exec_sql not available, trying direct execution...');

      // Supabase REST API로 직접 실행
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ sql_query: sql })
      });

      if (!response.ok) {
        throw new Error(`Failed to execute SQL: ${response.statusText}`);
      }
    }

    console.log('✅ Migration applied successfully!\n');
    console.log('🎉 get_all_subscription_prices 함수가 생성되었습니다.\n');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.log('\n⚠️  Supabase SQL Editor에서 직접 실행해주세요:');
    console.log('   https://supabase.com/dashboard/project/ybcjkdcdruquqrdahtga/sql\n');
    process.exit(1);
  }
}

applyMigration();
