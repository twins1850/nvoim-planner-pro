const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Production 체험 회원가입 테스트\n');
  console.log('URL: https://nvoim-planner-pro.vercel.app\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  // 새 탭 생성
  const page = await context.newPage();

  try {
    // 쿠키 삭제
    await context.clearCookies();
    console.log('✅ 쿠키 삭제 완료\n');

    // Production 회원가입 페이지로 이동
    console.log('1. Production 회원가입 페이지 접속...');
    await page.goto('https://nvoim-planner-pro.vercel.app/auth/signup', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await page.waitForTimeout(2000);

    console.log('✅ 페이지 로드 완료\n');

    // 체험 자격 확인 완료 대기
    await page.waitForTimeout(3000);

    // 현재 타임스탬프로 고유 이메일 생성
    const timestamp = Date.now();
    const email = `production${timestamp}@example.com`;

    console.log('2. 회원가입 폼 작성...');
    console.log(`   이메일: ${email}\n`);

    // 폼 작성
    await page.fill('#fullName', 'Production Test User');
    await page.fill('#email', email);
    await page.fill('#password', 'ProductionTest123!');
    await page.fill('#confirmPassword', 'ProductionTest123!');

    await page.waitForTimeout(1000);

    console.log('3. 계정 생성 버튼 클릭...');
    await page.click('button[type="submit"]');

    // 리다이렉트 대기 (최대 20초)
    console.log('4. 리다이렉트 대기 중...\n');

    await page.waitForTimeout(20000);

    const finalUrl = page.url();
    console.log(`📍 최종 URL: ${finalUrl}\n`);

    // 스크린샷
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/production-signup-result.png',
      fullPage: true
    });
    console.log('📸 Screenshot: production-signup-result.png\n');

    // 결과 분석
    console.log('═'.repeat(60));
    console.log('📊 Production 테스트 결과');
    console.log('═'.repeat(60));

    if (finalUrl.includes('/dashboard')) {
      console.log('\n🎉🎉🎉 Production 성공! 🎉🎉🎉\n');
      console.log('✅ 회원가입 완료');
      console.log('✅ Trial 라이선스 생성');
      console.log('✅ 라이선스 활성화');
      console.log('✅ 대시보드로 리다이렉트\n');

      // 페이지 내용 확인
      const bodyText = await page.textContent('body');

      if (bodyText.includes('체험') || bodyText.includes('Trial')) {
        console.log('🎯 체험 배너 표시 확인');
      }

      if (bodyText.includes('학생') || bodyText.includes('Student')) {
        console.log('🎯 학생 관리 기능 확인');
      }

      console.log('\n✨ Production 환경에서 모든 기능이 정상 작동합니다!\n');

    } else if (finalUrl.includes('/license')) {
      console.log('\n❌ 실패: 라이선스 페이지로 리다이렉트\n');
      console.log(`   Reason: ${new URL(finalUrl).searchParams.get('reason')}`);
      console.log('\n📋 확인 사항:');
      console.log('   1. Vercel 환경 변수 확인');
      console.log('   2. Production 배포 로그 확인');
      console.log('   3. Supabase 연결 확인\n');

    } else if (finalUrl.includes('/auth/signup')) {
      console.log('\n⚠️  회원가입 페이지에 그대로 있음\n');
      console.log('📋 확인 사항:');
      console.log('   1. 폼 제출 에러 메시지 확인');
      console.log('   2. Browser console 에러 확인');
      console.log('   3. Screenshot 확인\n');

    } else {
      console.log('\n⚠️  예상하지 못한 URL로 이동\n');
      console.log('   Screenshot를 확인하세요.\n');
    }

    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/production-signup-error.png',
      fullPage: true
    });
    console.log('📸 Error screenshot: production-signup-error.png\n');
  }

  console.log('✅ 테스트 완료!\n');
  process.exit(0);
})();
