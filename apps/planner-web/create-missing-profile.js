const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

const studentId = 'ea03a8c4-1390-47df-83e2-79ac1712c6a3';

async function createProfile() {
  console.log('=== profiles 테이블에 레코드 생성 ===\n');

  // student_profiles에서 정보 가져오기
  const { data: studentProfile } = await supabase
    .from('student_profiles')
    .select('email, full_name, phone')
    .eq('id', studentId)
    .single();

  console.log('student_profiles 데이터:');
  console.log('  - email:', studentProfile?.email);
  console.log('  - full_name:', studentProfile?.full_name);
  console.log('  - phone:', studentProfile?.phone);
  console.log('');

  // profiles 테이블에 레코드 생성
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: studentId,
      email: studentProfile?.email || '',
      full_name: studentProfile?.full_name || '',
      phone: studentProfile?.phone,
      role: 'student'
    })
    .select()
    .single();

  if (error) {
    console.error('❌ 생성 실패:', error);
  } else {
    console.log('✅ profiles 레코드 생성 완료!');
    console.log(JSON.stringify(data, null, 2));
  }

  // 검증
  console.log('\n=== 검증 ===');
  const { data: verifyData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', studentId)
    .single();

  if (verifyData && verifyData.full_name) {
    console.log('✅ profiles.full_name:', verifyData.full_name);
    console.log('✅ 이제 학생 목록에서 이름이 정상적으로 표시됩니다!');
  } else {
    console.log('❌ 검증 실패');
  }
}

createProfile();
