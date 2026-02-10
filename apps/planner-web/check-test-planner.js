/**
 * Check if test planner has proper setup
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

async function checkTestPlanner() {
  console.log('🔍 테스트 플래너 확인 중...\n');

  // Find recent test planners (created in last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  console.log('1️⃣ 최근 생성된 테스트 플래너 찾기:');
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .eq('role', 'planner')
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: false })
    .limit(5);

  if (profileError) {
    console.log(`   ❌ 에러: ${profileError.message}`);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log('   ℹ️  최근 1시간 내 생성된 테스트 플래너 없음');
    console.log('   💡 더 넓은 범위로 검색...\n');

    const { data: allPlanners } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .eq('role', 'planner')
      .order('created_at', { ascending: false })
      .limit(3);

    if (allPlanners && allPlanners.length > 0) {
      console.log(`   ✅ 가장 최근 플래너 ${allPlanners.length}개 발견:`);
      allPlanners.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.email} (${p.full_name}) - ${p.created_at}`);
      });

      // Check the most recent one
      const testPlanner = allPlanners[0];
      await checkPlannerDetails(testPlanner);
    }
    return;
  }

  console.log(`   ✅ 테스트 플래너 ${profiles.length}개 발견:`);
  profiles.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.email} (${p.full_name}) - ${p.created_at}`);
  });

  // Check details for the first one
  if (profiles.length > 0) {
    await checkPlannerDetails(profiles[0]);
  }
}

async function checkPlannerDetails(planner) {
  console.log(`\n2️⃣ 플래너 상세 정보 확인: ${planner.email}`);
  console.log(`   ID: ${planner.id}`);

  // Check planner_profiles entry
  console.log('\n   📋 planner_profiles 테이블:');
  const { data: plannerProfile, error: ppError } = await supabase
    .from('planner_profiles')
    .select('*')
    .eq('id', planner.id)
    .single();

  if (ppError) {
    console.log(`      ❌ planner_profiles 레코드 없음: ${ppError.message}`);
    console.log('      ⚠️  이것이 문제입니다! planner_profiles 레코드가 없으면 초대코드를 생성할 수 없습니다.');
  } else {
    console.log('      ✅ planner_profiles 레코드 존재');
    console.log(`      📊 invite_code: ${plannerProfile.invite_code || '(없음)'}`);
    console.log(`      📊 total_students: ${plannerProfile.total_students || 0}`);
  }

  // Check licenses
  console.log('\n   📋 licenses 테이블:');
  const { data: licenses, error: licError } = await supabase
    .from('licenses')
    .select('id, license_key, status, max_students, expires_at, trial_expires_at, is_trial')
    .eq('planner_id', planner.id);

  if (licError) {
    console.log(`      ❌ 에러: ${licError.message}`);
  } else if (!licenses || licenses.length === 0) {
    console.log('      ⚠️  라이선스 없음');
  } else {
    console.log(`      ✅ 라이선스 ${licenses.length}개 발견:`);
    licenses.forEach((lic, i) => {
      const expiryInfo = lic.is_trial
        ? `체험: ${lic.trial_expires_at?.substring(0, 10)}`
        : `만료: ${lic.expires_at?.substring(0, 10)}`;
      console.log(`      ${i + 1}. ${lic.license_key} - ${lic.status} (최대 ${lic.max_students}명, ${expiryInfo})`);
    });
  }

  // Check connected students
  console.log('\n   📋 연결된 학생:');
  const { data: students, error: stuError } = await supabase
    .from('student_profiles')
    .select('id, email, full_name')
    .eq('planner_id', planner.id);

  if (stuError) {
    console.log(`      ❌ 에러: ${stuError.message}`);
  } else if (!students || students.length === 0) {
    console.log('      ℹ️  연결된 학생 없음');
  } else {
    console.log(`      ✅ 학생 ${students.length}명:`);
    students.forEach((stu, i) => {
      console.log(`      ${i + 1}. ${stu.email} (${stu.full_name})`);
    });
  }

  console.log('\n✅ 플래너 상세 정보 확인 완료!\n');
}

checkTestPlanner().catch(console.error);
