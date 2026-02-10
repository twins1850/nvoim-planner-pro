const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

const studentId = 'ea03a8c4-1390-47df-83e2-79ac1712c6a3';

async function checkStudentSubscription() {
  console.log('=== 학생 정보 조회 ===');

  // 1. 학생 프로필 확인
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email, role, created_at')
    .eq('id', studentId)
    .single();

  if (profileError) {
    console.error('프로필 조회 오류:', profileError);
    return;
  }

  console.log('학생 이메일:', profile.email);
  console.log('역할:', profile.role);
  console.log('가입일:', new Date(profile.created_at).toLocaleString());

  // 2. 학생-플래너 연결 확인
  const { data: studentProfile, error: spError } = await supabase
    .from('student_profiles')
    .select('planner_id, created_at')
    .eq('id', studentId)
    .single();

  if (spError) {
    console.error('학생 프로필 조회 오류:', spError);
  } else {
    console.log('\n=== 플래너 연결 ===');
    console.log('플래너 ID:', studentProfile.planner_id);
    console.log('연결일:', new Date(studentProfile.created_at).toLocaleString());
  }

  // 3. 수강권 조회
  console.log('\n=== 수강권 목록 ===');
  const { data: subscriptions, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (subError) {
    console.error('수강권 조회 오류:', subError);
    return;
  }

  if (subscriptions.length === 0) {
    console.log('등록된 수강권이 없습니다.');
    return;
  }

  subscriptions.forEach((sub, index) => {
    console.log(`\n[수강권 ${index + 1}]`);
    console.log('ID:', sub.id);
    console.log('이름:', sub.subscription_name);
    console.log('상태:', sub.status);
    console.log('시작일:', new Date(sub.start_date).toLocaleDateString());
    console.log('종료일:', new Date(sub.end_date).toLocaleDateString());
    console.log('총 수업:', `${sub.remaining_lessons}/${sub.total_lessons}회`);
    console.log('주당 빈도:', sub.frequency);
    console.log('수업 시간:', sub.duration);
    console.log('최대 연기:', `${sub.postponements_used}/${sub.max_postponements}회`);
    console.log('생성일:', new Date(sub.created_at).toLocaleString());
  });

  // 4. 활성 수강권 통계
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  console.log(`\n=== 통계 ===`);
  console.log('전체 수강권:', subscriptions.length);
  console.log('활성 수강권:', activeSubscriptions.length);
}

checkStudentSubscription();
