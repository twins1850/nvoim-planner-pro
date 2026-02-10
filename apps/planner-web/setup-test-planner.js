/**
 * Setup test planner with active license and invite code
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

async function setupTestPlanner() {
  console.log('🔧 테스트 플래너 설정 시작...\n');

  const email = `testplanner-${Date.now()}@example.com`;
  const password = 'TestPassword123!';

  // 1. Create planner user
  console.log('1️⃣ 플래너 사용자 생성:');
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: 'Test Planner',
      role: 'planner'
    }
  });

  if (authError) {
    console.log(`   ❌ 에러: ${authError.message}`);
    return;
  }

  console.log(`   ✅ 사용자 생성: ${email}`);
  console.log(`   📊 ID: ${authData.user.id}`);

  // 2. Create profile
  console.log('\n2️⃣ 프로필 생성:');
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      full_name: 'Test Planner',
      role: 'planner',
      email
    });

  if (profileError) {
    console.log(`   ❌ 에러: ${profileError.message}`);
    return;
  }

  console.log('   ✅ profiles 레코드 생성');

  // 3. Create planner_profiles entry
  console.log('\n3️⃣ planner_profiles 엔트리 생성:');
  const { error: plannerProfileError } = await supabase
    .from('planner_profiles')
    .insert({
      id: authData.user.id,
      invite_code: null,
      total_students: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  if (plannerProfileError) {
    console.log(`   ❌ 에러: ${plannerProfileError.message}`);
    return;
  }

  console.log('   ✅ planner_profiles 레코드 생성');

  // 4. Create active license
  console.log('\n4️⃣ 활성 라이선스 생성:');
  const licenseKey = `30D-10P-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const { error: licenseError } = await supabase
    .from('licenses')
    .insert({
      license_key: licenseKey,
      duration_days: 30,
      max_students: 10,
      planner_id: authData.user.id,
      status: 'active',
      is_trial: false,
      device_tokens: [],
      activated_at: new Date().toISOString(),
      activated_by_user_id: authData.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  if (licenseError) {
    console.log(`   ❌ 에러: ${licenseError.message}`);
    return;
  }

  console.log(`   ✅ 라이선스 생성: ${licenseKey}`);

  // 5. Generate invite code (using RPC as planner)
  console.log('\n5️⃣ 초대 코드 생성:');

  // Create a client with the planner's auth
  const plannerClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // Sign in as the planner
  const { error: signInError } = await plannerClient.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) {
    console.log(`   ❌ 로그인 에러: ${signInError.message}`);
    return;
  }

  // Now call create_invite_code RPC
  const { data: inviteCode, error: codeError } = await plannerClient
    .rpc('create_invite_code');

  if (codeError) {
    console.log(`   ❌ 초대 코드 생성 에러: ${codeError.message}`);
    return;
  }

  console.log(`   ✅ 초대 코드 생성: ${inviteCode}`);

  console.log('\n✅ 테스트 플래너 설정 완료!\n');
  console.log('📋 테스트 정보:');
  console.log(`   이메일: ${email}`);
  console.log(`   비밀번호: ${password}`);
  console.log(`   플래너 ID: ${authData.user.id}`);
  console.log(`   라이선스 키: ${licenseKey}`);
  console.log(`   초대 코드: ${inviteCode}`);
  console.log('\n');

  return {
    email,
    password,
    plannerId: authData.user.id,
    licenseKey,
    inviteCode
  };
}

setupTestPlanner().catch(console.error);
