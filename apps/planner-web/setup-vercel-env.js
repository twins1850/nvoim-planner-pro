const { chromium } = require('playwright');

(async () => {
  console.log('🔧 Vercel 환경 변수 설정 중...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    // Vercel 프로젝트 환경 변수 페이지로 이동
    console.log('1. Vercel 프로젝트 설정 페이지로 이동...');
    await page.goto('https://vercel.com/twins1850s-projects/nvoim-planner-pro/settings/environment-variables');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/vercel-env-page.png',
      fullPage: true
    });
    console.log('📸 Screenshot: vercel-env-page.png\n');

    console.log('📋 필요한 환경 변수:');
    console.log('');
    console.log('1. CRON_SECRET');
    console.log('   - 값: 랜덤 문자열 생성 필요 (예: ' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + ')');
    console.log('   - 환경: Production, Preview, Development');
    console.log('');
    console.log('2. GMAIL_USER');
    console.log('   - 값: Gmail 이메일 주소');
    console.log('   - 환경: Production');
    console.log('');
    console.log('3. GMAIL_APP_PASSWORD');
    console.log('   - 값: Gmail 앱 비밀번호 (16자리)');
    console.log('   - 생성: https://myaccount.google.com/apppasswords');
    console.log('   - 환경: Production');
    console.log('');
    console.log('4. NEXT_PUBLIC_APP_URL');
    console.log('   - 값: https://nvoim-planner-pro.vercel.app');
    console.log('   - 환경: Production, Preview, Development');
    console.log('');

    console.log('💡 환경 변수 추가 방법:');
    console.log('1. 현재 열린 Vercel 페이지에서 각 변수를 추가하세요.');
    console.log('2. "Add New" 버튼 클릭');
    console.log('3. Key, Value, Environment 선택 후 "Save"');
    console.log('');

    console.log('⏳ 스크린샷을 확인하여 현재 설정된 환경 변수를 확인하세요.');

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
  }

  console.log('\n✅ 완료! 환경 변수를 추가한 후 Vercel이 자동으로 재배포합니다.\n');
  process.exit(0);
})();
