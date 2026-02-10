const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

const studentId = '92190d3d-d46f-4c2d-8c07-456010971e85';

async function fixStudentProfile() {
  console.log('학생 프로필 수정 중...\n');

  // student_profiles에서 정보 가져오기
  const { data: studentProfile } = await supabase
    .from('student_profiles')
    .select('email, full_name, phone')
    .eq('id', studentId)
    .single();

  console.log('student_profiles 데이터:', studentProfile);

  // profiles 테이블 확인
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', studentId)
    .single();

  if (existingProfile) {
    // 업데이트
    console.log('\nprofiles 테이블 업데이트 중...');
    const { data: updated, error } = await supabase
      .from('profiles')
      .update({
        email: studentProfile.email,
        full_name: studentProfile.full_name,
        role: 'student'
      })
      .eq('id', studentId)
      .select()
      .single();

    if (error) {
      console.error('업데이트 오류:', error);
    } else {
      console.log('✅ 업데이트 완료:', updated);
    }
  } else {
    // 생성
    console.log('\nprofiles 테이블 생성 중...');
    const { data: created, error } = await supabase
      .from('profiles')
      .insert({
        id: studentId,
        email: studentProfile.email,
        full_name: studentProfile.full_name,
        role: 'student'
      })
      .select()
      .single();

    if (error) {
      console.error('생성 오류:', error);
    } else {
      console.log('✅ 생성 완료:', created);
    }
  }
}

fixStudentProfile();
