const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Vercel 환경 변수 간단 수정...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages[pages.length - 1];

  try {
    console.log('📂 현재 페이지:', page.url());
    console.log('');

    // 1. 모달이 열려있으면 닫기
    console.log('Step 1: 모달 닫기...');
    try {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
      console.log('✅ 모달 닫기 완료');
    } catch (e) {
      console.log('⚠️ 모달이 없거나 이미 닫혀있음');
    }

    // 2. 잘못된 환경 변수 삭제
    console.log('\nStep 2: 잘못된 환경 변수 삭제...');
    try {
      // "your_solapi_api_key_here" 텍스트가 있는 행 찾기
      const wrongEnvRow = page.locator('text=your_solapi_api_key_here').locator('..');

      // 해당 행에서 Remove 버튼 찾기 (... 메뉴)
      await wrongEnvRow.locator('button').last().click({ timeout: 3000 });
      await page.waitForTimeout(500);

      // "Remove" 메뉴 항목 클릭
      await page.click('text=Remove', { timeout: 3000 });
      await page.waitForTimeout(500);

      // 확인 다이얼로그의 Remove 버튼 클릭
      await page.click('button:has-text("Remove")', { timeout: 3000 });
      console.log('✅ 삭제 완료');

      await page.waitForTimeout(2000);
    } catch (e) {
      console.log('⚠️ 삭제할 변수를 찾지 못함:', e.message);
    }

    // 3. 3개의 올바른 환경 변수 추가
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

      // "Add New" 버튼 클릭 (더 구체적인 selector)
      console.log('Step 3-1: Add New 클릭...');
      await page.click('button:has-text("Add New")', { timeout: 5000 });
      console.log('✅ 클릭 완료');

      await page.waitForTimeout(2000);

      // Key 필드 클릭하고 입력
      console.log('Step 3-2: Key 입력...');
      await page.click('input[aria-label="environment variable key"]');
      await page.waitForTimeout(300);
      await page.keyboard.type(env.key, { delay: 30 });
      console.log(`✅ ${env.key}`);

      await page.waitForTimeout(500);

      // Value 필드 클릭하고 입력
      console.log('Step 3-3: Value 입력...');
      await page.click('textarea');
      await page.waitForTimeout(300);
      await page.keyboard.type(env.value, { delay: 30 });
      console.log(`✅ ${env.value}`);

      await page.waitForTimeout(500);

      // Save 버튼 클릭
      console.log('Step 3-4: Save...');
      await page.click('button:has-text("Save")');
      console.log('✅ 저장 완료');

      await page.waitForTimeout(3000);

      // 스크린샷
      await page.screenshot({
        path: `/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/vercel-simple-${i + 1}.png`,
        fullPage: true
      });
      console.log(`📸 Screenshot: vercel-simple-${i + 1}.png`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅✅✅ 완료!');
    console.log('='.repeat(60));

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/vercel-final-result.png',
      fullPage: true
    });

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/error.png',
      fullPage: true
    });
  }

  console.log('\n✅ 스크립트 종료\n');
  process.exit(0);
})();
