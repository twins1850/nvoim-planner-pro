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
  console.log('📝 Creating get_all_subscription_prices function...\n');

  try {
    // SQL 파일 읽기
    const sqlPath = path.join(__dirname, '../../supabase/migrations/20260204_get_all_prices_function.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('✅ SQL loaded successfully');
    console.log(`📏 SQL length: ${sql.length} characters\n`);

    // PostgreSQL에 직접 연결하여 실행
    // Supabase의 REST API로는 복잡한 SQL 실행이 어려우므로
    // 파일 내용을 출력하여 수동으로 실행하도록 안내
    console.log('⚠️  Supabase REST API로는 CREATE FUNCTION 실행이 제한됩니다.');
    console.log('📋 다음 방법 중 하나를 사용해주세요:\n');
    console.log('1️⃣  Supabase Dashboard SQL Editor에서 직접 실행:');
    console.log('   https://supabase.com/dashboard/project/ybcjkdcdruquqrdahtga/sql\n');
    console.log('2️⃣  psql 명령어로 실행:');
    console.log('   psql "postgresql://postgres.ybcjkdcdruquqrdahtga:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres" \\');
    console.log('     -f supabase/migrations/20260204_get_all_prices_function.sql\n');
    console.log('3️⃣  Supabase CLI로 실행:');
    console.log('   supabase db push\n');

    console.log('📄 SQL 파일 위치:');
    console.log(`   ${sqlPath}\n`);

    console.log('✨ SQL 미리보기 (처음 500자):');
    console.log('━'.repeat(80));
    console.log(sql.substring(0, 500));
    console.log('...\n');
    console.log('━'.repeat(80));

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

applyMigration();
