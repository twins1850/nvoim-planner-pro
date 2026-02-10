const fs = require('fs');
const path = require('path');

async function applyMigration() {
  console.log('='.repeat(80));
  console.log('Supabase 마이그레이션 수동 실행 안내');
  console.log('='.repeat(80));
  console.log('\n⚠️  자동 실행 실패 - 수동으로 Supabase Dashboard에서 실행해주세요.\n');

  console.log('📍 실행 위치:');
  console.log('   https://supabase.com/dashboard/project/ybcjkdcdruquqrdahtga/sql/new\n');

  console.log('📋 실행 단계:');
  console.log('   1. 위 URL을 브라우저에서 열기');
  console.log('   2. 아래 SQL 전체를 복사');
  console.log('   3. SQL Editor에 붙여넣기');
  console.log('   4. "Run" 버튼 클릭\n');

  const sqlPath = path.join(__dirname, '../../supabase/migrations/999_fix_profiles_upsert.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('='.repeat(80));
  console.log('실행할 SQL:');
  console.log('='.repeat(80));
  console.log(sql);
  console.log('='.repeat(80));

  console.log('\n✅ 실행 완료 후 예상 결과:');
  console.log('   - connect_student_with_info 함수가 업데이트됨');
  console.log('   - profiles 테이블에 UPSERT 로직 적용');
  console.log('   - 학생 연결 시 profiles 레코드가 자동 생성됨');
  console.log('   - "Unknown" 이름 문제 해결\n');

  console.log('🔍 검증 방법:');
  console.log('   1. 새로운 테스트 학생으로 플래너 연결 시도');
  console.log('   2. 플래너 웹에서 학생 이름이 정상적으로 표시되는지 확인');
  console.log('   3. profiles 테이블에 학생 레코드가 존재하는지 확인\n');
}

applyMigration();
