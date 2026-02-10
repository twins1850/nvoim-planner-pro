/**
 * Cleanup test data from database
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

async function cleanupTestData() {
  console.log('🧹 테스트 데이터 정리 시작...\n');

  // 1. Find all test users (from mailinator.com and example.com)
  console.log('1️⃣ 테스트 사용자 찾기:');
  const { data: users } = await supabase.auth.admin.listUsers();
  const testUsers = users?.users.filter(u =>
    u.email?.includes('@mailinator.com') ||
    u.email?.includes('@example.com') ||
    u.email?.includes('test') ||
    u.email?.includes('nplanner-test')
  ) || [];

  console.log(`   ✅ 테스트 사용자 ${testUsers.length}개 발견`);

  if (testUsers.length === 0) {
    console.log('   ℹ️  삭제할 테스트 사용자 없음');
    return;
  }

  // Show users before deletion
  testUsers.forEach((u, i) => {
    console.log(`   ${i + 1}. ${u.email}`);
  });

  // 2. Delete associated data for each user
  console.log('\n2️⃣ 관련 데이터 삭제:');
  for (const user of testUsers) {
    console.log(`\n   📧 ${user.email}`);

    // Delete student_profiles
    const { error: studentError } = await supabase
      .from('student_profiles')
      .delete()
      .eq('id', user.id);

    if (!studentError) {
      console.log('      ✅ student_profiles 삭제');
    }

    // Delete licenses
    const { error: licenseError } = await supabase
      .from('licenses')
      .delete()
      .eq('planner_id', user.id);

    if (!licenseError) {
      console.log('      ✅ licenses 삭제');
    }

    // Delete planner_profiles
    const { error: plannerProfileError } = await supabase
      .from('planner_profiles')
      .delete()
      .eq('id', user.id);

    if (!plannerProfileError) {
      console.log('      ✅ planner_profiles 삭제');
    }

    // Delete profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (!profileError) {
      console.log('      ✅ profiles 삭제');
    }

    // Delete auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(user.id);

    if (!authError) {
      console.log('      ✅ auth user 삭제');
    } else {
      console.log(`      ❌ auth user 삭제 실패: ${authError.message}`);
    }
  }

  console.log('\n✅ 테스트 데이터 정리 완료!\n');
}

cleanupTestData().catch(console.error);
