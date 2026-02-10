const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Vercel 환경 변수 최종 수정...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages[pages.length - 1];

  try {
    console.log('📂 현재 페이지:', page.url());
    console.log('');

    // 1. 잘못된 환경 변수 삭제
    console.log('Step 1: 잘못된 환경 변수 삭제...');
    try {
      // "your_solapi_api_key_here"가 있는 행의 ... 버튼 클릭
      const wrongVarRow = page.locator('text=your_solapi_api_key_here').locator('..');
      const menuButton = wrongVarRow.locator('button[aria-label*="menu"], button:has-text("•••"), button').last();

      await menuButton.click({ timeout: 5000 });
      console.log('✅ ... 메뉴 클릭');
      await page.waitForTimeout(500);

      // "Remove" 클릭
      await page.click('text=Remove', { timeout: 3000 });
      console.log('✅ Remove 클릭');
      await page.waitForTimeout(500);

      // 확인 다이얼로그의 "Remove" 버튼 클릭
      await page.click('button:has-text("Remove")', { timeout: 3000 });
      console.log('✅ 삭제 확인');

      await page.waitForTimeout(2000);
    } catch (e) {
      console.log('⚠️ 삭제 실패:', e.message);
    }

    // 2. 3개의 올바른 환경 변수 추가
    const envVars = [
      { key: 'SOLAPI_API_KEY', value: 'your_solapi_api_key_here' },
      { key: 'SOLAPI_API_SECRET', value: 'your_solapi_api_secret_here' },
      { key: 'SOLAPI_FROM_NUMBER', value: '01012345678' }
    ];

    for (let i = 0; i < envVars.length; i++) {
      const env = envVars[i];
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📝 [${i + 1}/${envVars.length}] ${env.key} 추가`);
      console.log(`${'='.repeat(60)}\n`);

      // "Add Environment Variable" 버튼 클릭
      console.log('Step 2-1: Add Environment Variable 클릭...');
      await page.click('button:has-text("Add Environment Variable")', { timeout: 5000 });
      console.log('✅ 클릭 완료');

      await page.waitForTimeout(2000);

      // Key 필드 클릭하고 입력
      console.log('Step 2-2: Key 입력...');
      await page.click('input[aria-label="environment variable key"]');
      await page.waitForTimeout(300);
      await page.keyboard.type(env.key, { delay: 30 });
      console.log(`✅ ${env.key}`);

      await page.waitForTimeout(500);

      // Value 필드 클릭하고 입력
      console.log('Step 2-3: Value 입력...');
      await page.click('textarea');
      await page.waitForTimeout(300);
      await page.keyboard.type(env.value, { delay: 30 });
      console.log(`✅ ${env.value}`);

      await page.waitForTimeout(500);

      // Save 버튼 클릭
      console.log('Step 2-4: Save...');
      await page.click('button:has-text("Save")');
      console.log('✅ 저장 완료');

      await page.waitForTimeout(3000);

      // 스크린샷
      await page.screenshot({
        path: `/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/final-${i + 1}.png`,
        fullPage: true
      });
      console.log(`📸 Screenshot: final-${i + 1}.png`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅✅✅ 완료!');
    console.log('='.repeat(60));

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/vercel-완료.png',
      fullPage: true
    });
    console.log('\n📸 최종: vercel-완료.png');

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/error-final.png',
      fullPage: true
    });
  }

  console.log('\n✅ 종료\n');
  process.exit(0);
})();
