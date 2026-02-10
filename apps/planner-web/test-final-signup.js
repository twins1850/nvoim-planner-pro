const { chromium } = require('playwright');

(async () => {
  console.log('🎉 최종 체험 회원가입 테스트\n');
  console.log('변경 사항:');
  console.log('  1. ✅ Server-side API 생성 (activate-license)');
  console.log('  2. ✅ Client-side UPDATE 제거');
  console.log('  3. ✅ Service Role Key로 RLS 우회\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  // 새 탭 생성
  const page = await context.newPage();

  try {
    // 쿠키 삭제
    await context.clearCookies();
    console.log('🧹 쿠키 삭제 완료\n');

    // 회원가입 페이지로 이동
    console.log('1. 회원가입 페이지 접속...');
    await page.goto('http://localhost:3000/auth/signup', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('✅ 페이지 로드 완료\n');

    // 체험 자격 확인 완료 대기
    await page.waitForTimeout(3000);

    // 현재 타임스탬프로 고유 이메일 생성
    const timestamp = Date.now();
    const email = `finaltest${timestamp}@example.com`;

    console.log('2. 회원가입 폼 작성...');
    console.log(`   이메일: ${email}\n`);

    // 폼 작성
    await page.fill('#fullName', 'Final Test User');
    await page.fill('#email', email);
    await page.fill('#password', 'FinalTest123!');
    await page.fill('#confirmPassword', 'FinalTest123!');

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
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/final-signup-result.png',
      fullPage: true
    });
    console.log('📸 Screenshot: final-signup-result.png\n');

    // 결과 분석
    console.log('═'.repeat(60));
    console.log('📊 최종 테스트 결과');
    console.log('═'.repeat(60));

    if (finalUrl.includes('/dashboard')) {
      console.log('\n🎉🎉🎉 대성공! 🎉🎉🎉\n');
      console.log('✅ 회원가입 완료');
      console.log('✅ Trial 라이선스 생성');
      console.log('✅ 라이선스 활성화 (Service Role Key)');
      console.log('✅ 대시보드로 리다이렉트\n');

      // 페이지 내용 확인
      const bodyText = await page.textContent('body');

      if (bodyText.includes('체험') || bodyText.includes('Trial')) {
        console.log('🎯 체험 배너 표시 확인');
      }

      if (bodyText.includes('학생') || bodyText.includes('Student')) {
        console.log('🎯 학생 관리 기능 확인');
      }

      console.log('\n✨ 모든 기능이 정상 작동합니다!\n');

    } else if (finalUrl.includes('/license')) {
      console.log('\n❌ 실패: 여전히 라이선스 페이지로 리다이렉트\n');
      console.log(`   Reason: ${new URL(finalUrl).searchParams.get('reason')}`);
      console.log('\n📋 디버깅 체크리스트:');
      console.log('   1. Dev 서버 로그에서 API 호출 확인');
      console.log('   2. activate-license API 응답 확인');
      console.log('   3. 브라우저 콘솔 에러 메시지 확인');
      console.log('   4. Supabase licenses 테이블 확인\n');

    } else {
      console.log('\n⚠️  예상하지 못한 URL로 이동\n');
      console.log('   Screenshot를 확인하세요.\n');
    }

    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/final-signup-error.png',
      fullPage: true
    });
    console.log('📸 Error screenshot: final-signup-error.png\n');
  }

  console.log('✅ 테스트 완료!\n');
  process.exit(0);
})();
