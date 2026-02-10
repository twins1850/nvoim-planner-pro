/**
 * Check actual database structure for invite code system
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

async function checkDatabase() {
  console.log('🔍 데이터베이스 구조 확인 중...\n');

  // 1. Check if planner_profiles table exists and its structure
  console.log('1️⃣ planner_profiles 테이블 확인:');
  try {
    const { data, error } = await supabase
      .from('planner_profiles')
      .select('*')
      .limit(1);

    if (error) {
      console.log(`   ❌ planner_profiles 테이블 없음 또는 접근 불가: ${error.message}`);
    } else {
      console.log('   ✅ planner_profiles 테이블 존재');
      if (data && data.length > 0) {
        console.log('   📋 컬럼:', Object.keys(data[0]).join(', '));
        console.log('   📊 샘플 데이터:', data[0].invite_code ? `invite_code 있음: ${data[0].invite_code}` : 'invite_code 없음');
      }
    }
  } catch (err) {
    console.log(`   ❌ 에러: ${err.message}`);
  }

  console.log('\n2️⃣ profiles 테이블 확인 (플래너 역할):');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'planner')
      .limit(1);

    if (error) {
      console.log(`   ❌ 에러: ${error.message}`);
    } else {
      console.log('   ✅ profiles 테이블에서 planner 역할 찾음');
      if (data && data.length > 0) {
        console.log('   📋 컬럼:', Object.keys(data[0]).join(', '));
      }
    }
  } catch (err) {
    console.log(`   ❌ 에러: ${err.message}`);
  }

  console.log('\n3️⃣ invite_codes 테이블 확인:');
  try {
    const { data, error } = await supabase
      .from('invite_codes')
      .select('*')
      .limit(1);

    if (error) {
      console.log(`   ❌ invite_codes 테이블 없음 또는 접근 불가: ${error.message}`);
    } else {
      console.log('   ✅ invite_codes 테이블 존재');
      if (data && data.length > 0) {
        console.log('   📋 컬럼:', Object.keys(data[0]).join(', '));
      }
    }
  } catch (err) {
    console.log(`   ❌ 에러: ${err.message}`);
  }

  console.log('\n4️⃣ create_invite_code RPC 함수 확인:');
  try {
    const { data, error } = await supabase.rpc('create_invite_code');

    if (error) {
      console.log(`   ❌ create_invite_code 함수 없음 또는 에러: ${error.message}`);
    } else {
      console.log('   ✅ create_invite_code 함수 존재하고 작동함');
      console.log('   📊 응답:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.log(`   ❌ 에러: ${err.message}`);
  }

  console.log('\n5️⃣ licenses 테이블에서 active 라이선스 확인:');
  try {
    const { data, error } = await supabase
      .from('licenses')
      .select('id, license_key, planner_id, status, max_students, expires_at, trial_expires_at')
      .eq('status', 'active')
      .limit(5);

    if (error) {
      console.log(`   ❌ 에러: ${error.message}`);
    } else {
      console.log(`   ✅ Active 라이선스 ${data.length}개 발견`);
      data.forEach((license, i) => {
        console.log(`   ${i + 1}. ${license.license_key} (플래너: ${license.planner_id?.substring(0, 8)}..., 최대 학생: ${license.max_students}명)`);
      });
    }
  } catch (err) {
    console.log(`   ❌ 에러: ${err.message}`);
  }

  console.log('\n6️⃣ student_profiles 테이블 구조 확인:');
  try {
    const { data, error } = await supabase
      .from('student_profiles')
      .select('*')
      .limit(1);

    if (error) {
      console.log(`   ❌ 에러: ${error.message}`);
    } else {
      console.log('   ✅ student_profiles 테이블 존재');
      if (data && data.length > 0) {
        console.log('   📋 컬럼:', Object.keys(data[0]).join(', '));
      } else {
        console.log('   ℹ️  데이터 없음 (빈 테이블)');
      }
    }
  } catch (err) {
    console.log(`   ❌ 에러: ${err.message}`);
  }

  console.log('\n✅ 데이터베이스 구조 확인 완료!\n');
}

checkDatabase().catch(console.error);
