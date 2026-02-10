/**
 * Test connect_student_with_info RPC function directly
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function testConnectRPC() {
  console.log('🔍 connect_student_with_info RPC 테스트\n');

  // 1. Find a test planner with planner_profiles entry
  console.log('1️⃣ 테스트 플래너 찾기:');
  const { data: planners, error: plannerError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('role', 'planner')
    .ilike('email', '%test%')
    .limit(5);

  if (plannerError) {
    console.log(`   ❌ 에러: ${plannerError.message}`);
    return;
  }

  console.log(`   ✅ 테스트 플래너 ${planners.length}개 발견`);

  if (planners.length === 0) {
    console.log('   ⚠️  테스트 플래너 없음. 먼저 플래너를 생성해주세요.');
    return;
  }

  // Check each planner for planner_profiles entry
  for (const planner of planners) {
    console.log(`\n📋 플래너: ${planner.email}`);

    const { data: plannerProfile, error: ppError } = await supabase
      .from('planner_profiles')
      .select('*')
      .eq('id', planner.id)
      .single();

    if (ppError) {
      console.log(`   ❌ planner_profiles 없음: ${ppError.message}`);
      continue;
    }

    console.log(`   ✅ planner_profiles 존재`);
    console.log(`   📊 invite_code: ${plannerProfile.invite_code || '(없음 - 생성 필요)'}`);
    console.log(`   📊 total_students: ${plannerProfile.total_students || 0}`);

    // Check active license
    const { data: licenses, error: licError } = await supabase
      .from('licenses')
      .select('*')
      .eq('planner_id', planner.id)
      .eq('status', 'active');

    if (licError || !licenses || licenses.length === 0) {
      console.log(`   ⚠️  활성 라이선스 없음`);
      continue;
    }

    console.log(`   ✅ 활성 라이선스: ${licenses[0].license_key} (최대 ${licenses[0].max_students}명)`);

    // Generate invite code if not exists
    let inviteCode = plannerProfile.invite_code;
    if (!inviteCode) {
      console.log('\n2️⃣ 초대 코드 생성:');
      const { data: newCode, error: codeError } = await supabase
        .rpc('create_invite_code');

      if (codeError) {
        console.log(`   ❌ 에러: ${codeError.message}`);
        continue;
      }

      inviteCode = newCode;
      console.log(`   ✅ 생성된 코드: ${inviteCode}`);
    }

    // Now test connect_student_with_info
    console.log('\n3️⃣ connect_student_with_info RPC 테스트:');
    const testStudentData = {
      p_student_name: 'Test Student Direct',
      p_student_phone: '010-9999-8888',
      p_student_email: `test-direct-${Date.now()}@example.com`,
      p_invite_code: inviteCode
    };

    console.log(`   📝 테스트 데이터:`, testStudentData);

    const { data: result, error: connectError } = await supabase
      .rpc('connect_student_with_info', testStudentData);

    if (connectError) {
      console.log(`   ❌ 연결 실패: ${connectError.message}`);
      console.log(`   🔍 상세 에러:`, JSON.stringify(connectError, null, 2));
    } else {
      console.log(`   ✅ 연결 성공!`);
      console.log(`   📊 결과:`, JSON.stringify(result, null, 2));
    }

    // Only test with first valid planner
    break;
  }

  console.log('\n✅ 테스트 완료!\n');
}

testConnectRPC().catch(console.error);
