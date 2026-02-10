// Test invite code connection with RPC
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

  console.log('\n🔍 초대 코드 연결 테스트\n');

  // 1. Check if invite code exists
  console.log('1️⃣ 초대 코드 확인:', inviteCode);
  const { data: plannerProfile, error: codeError } = await supabase
    .from('planner_profiles')
    .select('id, invite_code')
    .eq('invite_code', inviteCode)
    .single();

  if (codeError || !plannerProfile) {
    console.error('❌ 초대 코드를 찾을 수 없습니다:', codeError);
    return;
  }

  console.log('✅ 초대 코드 유효:', {
    planner_id: plannerProfile.id,
    invite_code: plannerProfile.invite_code
  });

  // 2. Get student user ID
  console.log('\n2️⃣ 학생 사용자 확인:', studentEmail);
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

  const student = users.find(u => u.email === studentEmail);

  if (!student) {
    console.error('❌ 학생을 찾을 수 없습니다:', studentEmail);
    return;
  }

  console.log('✅ 학생 사용자:', {
    id: student.id,
    email: student.email,
    created_at: student.created_at
  });

  // 3. Call RPC function
  console.log('\n3️⃣ RPC 함수 호출: connect_student_with_info');

  const { data: rpcData, error: rpcError } = await supabase.rpc('connect_student_with_info', {
    invite_code_input: inviteCode,
    student_name: '신규학생',
    student_phone: '010-9999-8888',
    student_email: studentEmail
  });

  console.log('\nRPC 응답:');
  console.log('  data:', JSON.stringify(rpcData, null, 2));
  console.log('  error:', rpcError);

  if (rpcError) {
    console.error('\n❌ RPC 호출 실패:', rpcError);
    return;
  }

  if (rpcData && rpcData.success) {
    console.log('\n✅ 연결 성공!');

    // 4. Verify connection
    console.log('\n4️⃣ 연결 검증:');

    const { data: studentProfile } = await supabase
      .from('student_profiles')
      .select('id, full_name, planner_id, email, phone')
      .eq('id', student.id)
      .single();

    if (studentProfile) {
      console.log('✅ Student Profile:', studentProfile);
    } else {
      console.log('❌ Student profile not found');
    }

  } else {
    console.log('\n❌ 연결 실패:', rpcData?.message);
  }
}

main();
