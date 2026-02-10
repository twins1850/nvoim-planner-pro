const { createClient } = require('@supabase/supabase-js');

// 환경 변수 직접 설정
const supabaseUrl = 'https://ybcjkdcdruquqrdahtga.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

(async () => {
  console.log('🗑️  example.com 테스트 사용자 삭제 중...\n');

  try {
    // Step 1: example.com 사용자 목록 조회
    console.log('Step 1: example.com 사용자 찾기...');

    const { data: licenses, error: licenseError } = await supabase
      .from('licenses')
      .select(`
        id,
        license_key,
        is_trial,
        profiles:planner_id (
          id,
          email,
          full_name
        )
      `)
      .eq('is_trial', true);

    if (licenseError) throw licenseError;

    const exampleUsers = licenses.filter(license => {
      const profile = Array.isArray(license.profiles) ? license.profiles[0] : license.profiles;
      return profile?.email?.includes('example.com');
    });

    console.log(`찾은 example.com 사용자: ${exampleUsers.length}명\n`);

    if (exampleUsers.length === 0) {
      console.log('✅ example.com 사용자가 없습니다!');
      process.exit(0);
    }

    // Step 2: 각 사용자 삭제
    for (const license of exampleUsers) {
      const profile = Array.isArray(license.profiles) ? license.profiles[0] : license.profiles;

      console.log(`\n🗑️  삭제 중: ${profile.email}`);
      console.log(`   - User ID: ${profile.id}`);
      console.log(`   - License ID: ${license.id}`);
      console.log(`   - License Key: ${license.license_key}`);

      // 2-1. trial_device_fingerprints 삭제 (라이선스 외래키로 자동 삭제되지만 명시적으로)
      const { error: fingerprintError } = await supabase
        .from('trial_device_fingerprints')
        .delete()
        .eq('trial_license_id', license.id);

      if (fingerprintError) {
        console.log(`   ⚠️  Fingerprints 삭제 실패 (계속 진행): ${fingerprintError.message}`);
      } else {
        console.log('   ✅ Device fingerprints 삭제 완료');
      }

      // 2-2. trial_notifications 삭제
      const { error: notificationError } = await supabase
        .from('trial_notifications')
        .delete()
        .eq('license_id', license.id);

      if (notificationError) {
        console.log(`   ⚠️  Notifications 삭제 실패 (계속 진행): ${notificationError.message}`);
      } else {
        console.log('   ✅ Trial notifications 삭제 완료');
      }

      // 2-3. 라이선스 삭제
      const { error: licenseDeleteError } = await supabase
        .from('licenses')
        .delete()
        .eq('id', license.id);

      if (licenseDeleteError) {
        console.log(`   ❌ License 삭제 실패: ${licenseDeleteError.message}`);
        continue;
      }
      console.log('   ✅ License 삭제 완료');

      // 2-4. 사용자 삭제 (Auth)
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(profile.id);

      if (authDeleteError) {
        console.log(`   ❌ User 삭제 실패: ${authDeleteError.message}`);
      } else {
        console.log('   ✅ User 삭제 완료');
      }

      console.log(`   🎉 ${profile.email} 완전 삭제 성공!`);
    }

    console.log('\n\n✅✅✅ 모든 example.com 사용자 삭제 완료!\n');

    // Step 3: 결과 확인
    console.log('Step 3: 삭제 결과 확인...');

    const { data: remainingLicenses } = await supabase
      .from('licenses')
      .select(`
        profiles:planner_id (
          email
        )
      `)
      .eq('is_trial', true);

    const remainingExampleUsers = remainingLicenses?.filter(license => {
      const profile = Array.isArray(license.profiles) ? license.profiles[0] : license.profiles;
      return profile?.email?.includes('example.com');
    }) || [];

    if (remainingExampleUsers.length === 0) {
      console.log('✅ example.com 사용자가 모두 삭제되었습니다!');
    } else {
      console.log(`⚠️  아직 ${remainingExampleUsers.length}명의 example.com 사용자가 남아있습니다.`);
    }

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
  }

  console.log('\n✅ 완료!\n');
  process.exit(0);
})();
