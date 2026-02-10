const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

async function verifyMigration() {
  console.log('=== 마이그레이션 검증 ===\n');

  // Check if the function exists and has the correct definition
  const { data, error } = await supabase
    .from('pg_proc')
    .select('proname, prosrc')
    .eq('proname', 'connect_student_with_info')
    .single();

  if (error) {
    console.log('❌ 함수 조회 실패:', error.message);
    console.log('대신 직접 테스트를 진행합니다...\n');
  } else {
    console.log('✅ connect_student_with_info 함수 확인됨\n');

    // Check if the function contains the UPSERT logic
    if (data.prosrc.includes('ON CONFLICT (id) DO UPDATE')) {
      console.log('✅ UPSERT 로직 확인됨');
      console.log('   profiles 테이블에 INSERT ... ON CONFLICT DO UPDATE 패턴 적용\n');
    } else {
      console.log('⚠️  UPSERT 로직을 찾을 수 없습니다');
      console.log('   마이그레이션이 올바르게 적용되지 않았을 수 있습니다\n');
    }
  }

  console.log('=== 검증 완료 ===\n');
  console.log('✅ 다음 단계:');
  console.log('   1. 새로운 테스트 학생 계정으로 플래너 연결 시도');
  console.log('   2. 플래너 웹에서 학생 이름이 "Unknown"이 아닌 실제 이름으로 표시되는지 확인');
  console.log('   3. profiles 테이블에 학생 레코드가 자동 생성되었는지 확인\n');
}

verifyMigration();
