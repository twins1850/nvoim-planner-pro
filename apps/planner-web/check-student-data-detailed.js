const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

const studentId = 'ea03a8c4-1390-47df-83e2-79ac1712c6a3';

async function checkStudentData() {
  console.log('=== 학생 데이터 상세 확인 ===\n');
  console.log('학생 ID:', studentId, '\n');

  // 1. student_profiles 테이블 확인
  console.log('1. student_profiles 테이블:');
  const { data: studentProfile } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('id', studentId)
    .single();

  console.log(JSON.stringify(studentProfile, null, 2));
  console.log('\n');

  // 2. profiles 테이블 확인
  console.log('2. profiles 테이블:');
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', studentId)
    .single();

  console.log(JSON.stringify(profile, null, 2));
  console.log('\n');

  // 3. 문제 진단
  console.log('=== 문제 진단 ===\n');

  if (!profile) {
    console.log('❌ profiles 테이블에 레코드가 없습니다!');
    console.log('   → profiles 테이블에 레코드를 생성해야 합니다.\n');
  } else {
    console.log('✅ profiles 테이블에 레코드가 있습니다.');

    if (!profile.full_name) {
      console.log('❌ profiles.full_name이 NULL입니다!');
      console.log('   → full_name을 업데이트해야 합니다.\n');

      if (studentProfile?.full_name) {
        console.log('ℹ️  student_profiles.full_name:', studentProfile.full_name);
        console.log('   → 이 값을 profiles.full_name에 복사하면 됩니다.\n');
      }
    } else {
      console.log('✅ profiles.full_name:', profile.full_name, '\n');
    }
  }

  // 4. 수정 방법 안내
  console.log('=== 수정 방법 ===\n');

  if (studentProfile?.full_name && (!profile || !profile.full_name)) {
    console.log('다음 쿼리를 실행하세요:\n');

    if (!profile) {
      console.log(`INSERT INTO profiles (id, email, full_name, role)
VALUES (
  '${studentId}',
  '${studentProfile.email || ''}',
  '${studentProfile.full_name}',
  'student'
);`);
    } else {
      console.log(`UPDATE profiles
SET full_name = '${studentProfile.full_name}'
WHERE id = '${studentId}';`);
    }
  }
}

checkStudentData();
