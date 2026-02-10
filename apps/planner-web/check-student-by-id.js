// Check student by user ID from logs
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ybcjkdcdruquqrdahtga.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  // From logs: 현재 학생 사용자: 92190d3d-d46f-4c2d-8c07-456010...
  const studentId = '92190d3d-d46f-4c2d-8c07-456010ebbd4b';

  console.log('\n🔍 학생 사용자 확인 (ID:', studentId, ')\n');

  // 1. Check profiles table
  console.log('1️⃣ Profiles 테이블:');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', studentId)
    .maybeSingle();

  if (profileError) {
    console.error('❌ 에러:', profileError);
  } else if (!profile) {
    console.log('❌ profiles 테이블에 없음');
  } else {
    console.log('✅ Profile:', profile);
  }

  // 2. Check student_profiles table
  console.log('\n2️⃣ Student_profiles 테이블:');
  const { data: studentProfile, error: studentError } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('id', studentId)
    .maybeSingle();

  if (studentError) {
    console.error('❌ 에러:', studentError);
  } else if (!studentProfile) {
    console.log('❌ student_profiles 테이블에 없음');
  } else {
    console.log('✅ Student Profile:', studentProfile);
  }

  // 3. Check auth.users (via RPC or admin API)
  console.log('\n3️⃣ Auth Users 확인:');
  const { data: authData, error: authError } = await supabase.auth.admin.getUserById(studentId);

  if (authError) {
    console.error('❌ 에러:', authError);
  } else if (!authData) {
    console.log('❌ auth.users 테이블에 없음');
  } else {
    console.log('✅ Auth User:', {
      id: authData.user.id,
      email: authData.user.email,
      role: authData.user.role,
      created_at: authData.user.created_at,
      user_metadata: authData.user.user_metadata
    });
  }

  // 4. If profile doesn't exist, create it
  if (!profile && authData?.user) {
    console.log('\n💡 Profile이 없으므로 생성하겠습니다...');

    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
        role: authData.user.user_metadata?.role || 'student',
        full_name: authData.user.user_metadata?.full_name || 'Unknown'
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Profile 생성 실패:', createError);
    } else {
      console.log('✅ Profile 생성 성공:', newProfile);
    }
  }

  // 5. If student_profile doesn't exist, create it
  if (!studentProfile && profile) {
    console.log('\n💡 Student_profile이 없으므로 생성하겠습니다...');

    const { data: newStudentProfile, error: createStudentError } = await supabase
      .from('student_profiles')
      .insert({
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email
      })
      .select()
      .single();

    if (createStudentError) {
      console.error('❌ Student_profile 생성 실패:', createStudentError);
    } else {
      console.log('✅ Student_profile 생성 성공:', newStudentProfile);
    }
  }
}

main();
