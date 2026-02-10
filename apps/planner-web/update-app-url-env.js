const { chromium } = require('playwright');

(async () => {
  console.log('🔧 NEXT_PUBLIC_APP_URL 환경 변수 확인 및 업데이트...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('Step 1: Environment Variables 페이지 확인...');
    const currentUrl = page.url();

    if (!currentUrl.includes('environment-variables')) {
      console.log('Environment Variables 페이지로 이동...');
      await page.goto('https://vercel.com/twins1850s-projects/nvoim-planner-pro/settings/environment-variables');
      await page.waitForTimeout(2000);
    }

    console.log('Step 2: NEXT_PUBLIC_APP_URL 찾기...');

    // NEXT_PUBLIC_APP_URL 행 찾기
    const appUrlRow = await page.locator('text=NEXT_PUBLIC_APP_URL').first();

    if (appUrlRow) {
      console.log('✅ NEXT_PUBLIC_APP_URL 발견!');

      // 해당 행의 점점점(...) 메뉴 클릭
      await appUrlRow.click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/app-url-menu.png',
        fullPage: false
      });
      console.log('📸 Screenshot: app-url-menu.png');

      console.log('\n💡 다음 단계:');
      console.log('1. 스크린샷에서 현재 값 확인');
      console.log('2. localhost 또는 vercel.app이면 수정 필요');
      console.log('3. 권장 값: https://www.nplannerpro.com');
      console.log('');

    } else {
      console.log('❌ NEXT_PUBLIC_APP_URL을 찾을 수 없습니다.');
      console.log('💡 "Add Environment Variable" 버튼을 클릭하여 추가하세요.');
    }

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
  }

  console.log('✅ 완료!\n');
  process.exit(0);
})();
