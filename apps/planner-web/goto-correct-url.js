const { chromium } = require('playwright');

(async () => {
  console.log('🚀 올바른 URL로 접속 중...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  // 현재 활성 페이지 사용 (새 탭 열지 않음)
  const pages = context.pages();
  const page = pages[pages.length - 1]; // 마지막 탭 사용

  try {
    const correctUrl = 'https://vercel.com/twins1850s-projects/nvoim-planner-pro/settings/environment-variables';
    
    console.log('📂 접속 중:', correctUrl);
    console.log('');
    
    await page.goto(correctUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    await page.waitForTimeout(3000);

    console.log('✅ 접속 완료!');
    console.log('');
    console.log('🔍 현재 URL:', page.url());
    console.log('');
    console.log('📋 이제 환경 변수 목록이 보일 겁니다!');
    console.log('   SOLAPI로 시작하는 환경 변수가 있는지 확인해주세요.');

    // 스크린샷
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/correct-url-check.png',
      fullPage: true
    });
    
    console.log('');
    console.log('📸 Screenshot: correct-url-check.png');

  } catch (error) {
    console.error('❌ 에러:', error.message);
  }

  process.exit(0);
})();
