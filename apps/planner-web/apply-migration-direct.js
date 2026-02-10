const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8',
  {
    db: {
      schema: 'public'
    }
  }
);

async function applyMigration() {
  console.log('마이그레이션 SQL 읽는 중...\n');

  const sqlPath = path.join(__dirname, '../../supabase/migrations/999_fix_profiles_upsert.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Supabase Management API로 SQL 실행 중...\n');

  try {
    // Use the REST API directly to execute SQL
    const response = await fetch(
      'https://ybcjkdcdruquqrdahtga.supabase.co/rest/v1/rpc/exec_sql',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
        },
        body: JSON.stringify({ query: sql })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ API 오류:', error);
      console.log('\n대안: Supabase Dashboard에서 수동 실행이 필요합니다.');
      console.log('URL: https://supabase.com/dashboard/project/ybcjkdcdruquqrdahtga/sql/new');
      console.log('\n실행할 SQL:');
      console.log('='.repeat(80));
      console.log(sql);
      console.log('='.repeat(80));
      return;
    }

    const result = await response.json();
    console.log('✅ 마이그레이션 적용 완료!\n');
    console.log('결과:', JSON.stringify(result, null, 2));

    // Verify the function was created
    console.log('\n함수 확인 중...');
    const { data: functions, error: fnError } = await supabase
      .from('pg_proc')
      .select('proname')
      .eq('proname', 'connect_student_with_info');

    if (fnError) {
      console.log('함수 확인 실패:', fnError.message);
    } else {
      console.log('✅ connect_student_with_info 함수 확인됨');
    }

  } catch (error) {
    console.error('❌ 실행 오류:', error.message);
    console.log('\n대안: Supabase Dashboard에서 수동 실행이 필요합니다.');
    console.log('URL: https://supabase.com/dashboard/project/ybcjkdcdruquqrdahtga/sql/new');
  }
}

applyMigration();
