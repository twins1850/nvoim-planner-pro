// Check student-planner connection in database
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ybcjkdcdruquqrdahtga.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const studentEmail = 'teststudent@example.com';
  const plannerEmail = 'twins1850@naver.com';

  console.log('\n📊 학생-플래너 연결 상태 확인\n');

  // Get student ID first
  console.log('🔍 학생 ID 조회 중...');
  const { data: studentData, error: studentLookupError } = await supabase
    .from('profiles')
    .select('id, email, role, full_name')
    .eq('email', studentEmail)
    .maybeSingle();

  if (studentLookupError) {
    console.error('❌ 학생 조회 실패:', studentLookupError);
    return;
  }

  if (!studentData) {
    console.log('❌ 학생을 찾을 수 없습니다:', studentEmail);
    console.log('💡 auth.users 테이블을 확인해보세요');
    return;
  }

  console.log('✅ 학생 정보:', studentData);

  // Get planner ID
  console.log('\n🔍 플래너 ID 조회 중...');
  const { data: plannerData, error: plannerLookupError } = await supabase
    .from('profiles')
    .select('id, email, role, full_name')
    .eq('email', plannerEmail)
    .single();

  if (plannerLookupError) {
    console.error('❌ 플래너 조회 실패:', plannerLookupError);
    return;
  }

  console.log('✅ 플래너 정보:', plannerData);

  // 1. Check student profile
  console.log('\n1️⃣ Student Profile 확인:');
  const { data: studentProfile, error: studentError } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('id', studentData.id)
    .maybeSingle();

  if (studentError) {
    console.error('❌ Student profile 조회 실패:', studentError);
  } else if (!studentProfile) {
    console.log('❌ Student profile이 존재하지 않습니다');
  } else {
    console.log('✅ Student Profile:', {
      id: studentProfile.id,
      full_name: studentProfile.full_name,
      planner_id: studentProfile.planner_id,
      email: studentProfile.email
    });
  }

  // 2. Check planner profile
  console.log('\n2️⃣ Planner Profile 확인:');
  const { data: plannerProfile, error: plannerError } = await supabase
    .from('planner_profiles')
    .select('*')
    .eq('id', plannerData.id)
    .single();

  if (plannerError) {
    console.error('❌ Planner profile 조회 실패:', plannerError);
  } else {
    console.log('✅ Planner Profile:', {
      id: plannerProfile.id,
      invite_code: plannerProfile.invite_code,
      created_at: plannerProfile.created_at
    });
  }

  // 3. Check if they are connected
  console.log('\n3️⃣ 연결 상태:');
  if (studentProfile && plannerProfile) {
    if (studentProfile.planner_id === plannerProfile.id) {
      console.log('✅ 학생과 플래너가 올바르게 연결되어 있습니다!');
    } else {
      console.log('❌ 연결 문제 발견!');
      console.log(`   학생의 planner_id: ${studentProfile.planner_id}`);
      console.log(`   실제 플래너 ID: ${plannerProfile.id}`);
    }
  }

  // 4. Check if student_profiles exists at all
  console.log('\n4️⃣ 추가 확인 - student_profiles 테이블:');
  const { data: allStudentProfiles, error: allStudentError } = await supabase
    .from('student_profiles')
    .select('id, full_name, planner_id, email')
    .limit(10);

  if (allStudentError) {
    console.error('❌ student_profiles 조회 실패:', allStudentError);
  } else {
    console.log(`📋 전체 student_profiles 개수: ${allStudentProfiles.length}`);
    allStudentProfiles.forEach((sp, i) => {
      console.log(`  ${i + 1}. ID: ${sp.id.substring(0, 8)}..., Name: ${sp.full_name}, Planner: ${sp.planner_id ? sp.planner_id.substring(0, 8) + '...' : 'null'}`);
    });
  }
}

main();
