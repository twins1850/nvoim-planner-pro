// Force connect student to planner directly via database
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
  const inviteCode = '3YXTBM';
  const studentEmail = 'newstudent@example.com';

  console.log('\n🔗 학생-플래너 강제 연결 시작\n');

  // 1. Get planner ID from invite code
  console.log('1️⃣ 초대 코드로 플래너 찾기:', inviteCode);
  const { data: plannerProfile, error: codeError } = await supabase
    .from('planner_profiles')
    .select('id')
    .eq('invite_code', inviteCode)
    .single();

  if (codeError || !plannerProfile) {
    console.error('❌ 플래너를 찾을 수 없습니다:', codeError);
    return;
  }

  const plannerId = plannerProfile.id;
  console.log('✅ 플래너 ID:', plannerId);

  // 2. Get student ID from email
  console.log('\n2️⃣ 학생 사용자 찾기:', studentEmail);
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  const student = users.find(u => u.email === studentEmail);

  if (!student) {
    console.error('❌ 학생을 찾을 수 없습니다:', studentEmail);
    return;
  }

  const studentId = student.id;
  console.log('✅ 학생 ID:', studentId);

  // 3. Create or update profiles entry
  console.log('\n3️⃣ Profiles 테이블 확인/생성');
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', studentId)
    .maybeSingle();

  if (!existingProfile) {
    console.log('  profiles 테이블에 학생 정보 추가 중...');
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: studentId,
        email: studentEmail,
        role: 'student',
        full_name: '신규학생'
      });

    if (profileError) {
      console.error('❌ profiles 생성 실패:', profileError);
      return;
    }
    console.log('✅ profiles 생성 완료');
  } else {
    console.log('✅ profiles 이미 존재함');
  }

  // 4. Create or update student_profiles entry with planner connection
  console.log('\n4️⃣ Student_profiles 테이블 확인/업데이트');
  const { data: existingStudentProfile } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('id', studentId)
    .maybeSingle();

  if (!existingStudentProfile) {
    console.log('  student_profiles 테이블에 학생 정보 생성 중...');
    const { error: studentProfileError } = await supabase
      .from('student_profiles')
      .insert({
        id: studentId,
        full_name: '신규학생',
        email: studentEmail,
        phone: '010-9999-8888',
        planner_id: plannerId
      });

    if (studentProfileError) {
      console.error('❌ student_profiles 생성 실패:', studentProfileError);
      return;
    }
    console.log('✅ student_profiles 생성 완료 (planner_id 연결됨)');
  } else {
    console.log('  student_profiles 테이블에 planner_id 업데이트 중...');
    const { error: updateError } = await supabase
      .from('student_profiles')
      .update({
        planner_id: plannerId,
        full_name: '신규학생',
        phone: '010-9999-8888'
      })
      .eq('id', studentId);

    if (updateError) {
      console.error('❌ student_profiles 업데이트 실패:', updateError);
      return;
    }
    console.log('✅ student_profiles 업데이트 완료 (planner_id 연결됨)');
  }

  // 5. Verify the connection
  console.log('\n5️⃣ 연결 검증');
  const { data: verifyStudent } = await supabase
    .from('student_profiles')
    .select('id, full_name, email, phone, planner_id')
    .eq('id', studentId)
    .single();

  const { data: verifyPlanner } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', plannerId)
    .single();

  console.log('\n✅ 연결 완료!');
  console.log('\n학생 정보:');
  console.log('  ID:', verifyStudent.id);
  console.log('  이름:', verifyStudent.full_name);
  console.log('  이메일:', verifyStudent.email);
  console.log('  전화:', verifyStudent.phone);
  console.log('  플래너 ID:', verifyStudent.planner_id);

  console.log('\n플래너 정보:');
  console.log('  ID:', verifyPlanner.id);
  console.log('  이메일:', verifyPlanner.email);
  console.log('  이름:', verifyPlanner.full_name);

  console.log('\n✅ 학생과 플래너가 성공적으로 연결되었습니다!');
}

main();
