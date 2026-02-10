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
  console.log('🔍 Trial 사용자 확인 중...\n');

  try {
    // 모든 trial 라이선스와 연결된 사용자 이메일 확인
    const { data: licenses, error } = await supabase
      .from('licenses')
      .select(`
        id,
        trial_expires_at,
        status,
        is_trial,
        profiles:planner_id (
          id,
          email,
          full_name
        )
      `)
      .eq('is_trial', true)
      .order('trial_expires_at', { ascending: true });

    if (error) throw error;

    console.log(`📊 총 ${licenses.length}개의 Trial 라이선스 발견\n`);

    licenses.forEach((license, index) => {
      const profile = Array.isArray(license.profiles) ? license.profiles[0] : license.profiles;
      const email = profile?.email || '이메일 없음';
      const name = profile?.full_name || '이름 없음';
      const expiresAt = new Date(license.trial_expires_at);
      const daysRemaining = Math.ceil((expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

      console.log(`${index + 1}. ${name} (${email})`);
      console.log(`   - License ID: ${license.id}`);
      console.log(`   - 상태: ${license.status}`);
      console.log(`   - 만료일: ${expiresAt.toLocaleDateString('ko-KR')}`);
      console.log(`   - 남은 일수: ${daysRemaining}일`);

      if (email.includes('example.com')) {
        console.log(`   ⚠️  WARNING: example.com 도메인 사용 (이메일 전송 불가)`);
      }

      console.log('');
    });

  } catch (error) {
    console.error('❌ 에러:', error.message);
  }

  console.log('✅ 완료!\n');
  process.exit(0);
})();
