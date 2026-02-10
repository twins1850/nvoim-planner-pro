const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Vercel 환경 변수 수정 시작...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  // 현재 활성 페이지 사용
  const pages = context.pages();
  const page = pages[pages.length - 1];

  try {
    console.log('📂 현재 페이지:', page.url());
    console.log('');

    // 1. 잘못된 환경 변수 삭제 (your_solapi_api_key_here)
    console.log('Step 1: 잘못된 환경 변수 삭제...');

    // "your_solapi_api_key_here" 텍스트 찾아서 해당 행의 삭제 버튼 클릭
    try {
      const deleteButton = await page.locator('text=your_solapi_api_key_here').locator('..').locator('..').locator('button[aria-label="Remove"]').first();
      await deleteButton.click({ timeout: 5000 });
      console.log('✅ 잘못된 환경 변수 삭제 버튼 클릭');

      await page.waitForTimeout(1000);

      // 확인 다이얼로그에서 "Remove" 버튼 클릭
      await page.click('button:has-text("Remove")', { timeout: 3000 });
      console.log('✅ 삭제 확인 완료');

      await page.waitForTimeout(2000);
    } catch (e) {
      console.log('⚠️ 삭제할 환경 변수를 찾지 못했습니다 (이미 삭제됨?)');
    }

    // 2. 올바른 환경 변수 3개 추가
    const envVars = [
      { key: 'SOLAPI_API_KEY', value: 'your_solapi_api_key_here' },
      { key: 'SOLAPI_API_SECRET', value: 'your_solapi_api_secret_here' },
      { key: 'SOLAPI_FROM_NUMBER', value: '01012345678' }
    ];

    for (let i = 0; i < envVars.length; i++) {
      const env = envVars[i];
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📝 [${i + 1}/${envVars.length}] ${env.key} 추가 중...`);
      console.log(`${'='.repeat(60)}\n`);

      // "Add" 버튼 클릭
      console.log('Step 2: "Add" 버튼 클릭...');
      await page.click('button:has-text("Add")', { timeout: 5000 });
      console.log('✅ 버튼 클릭 성공');

      await page.waitForTimeout(1500);

      // Key 입력 필드 직접 클릭하고 입력
      console.log('Step 3: Key 필드 클릭 및 입력...');

      // aria-label="environment variable key" 인풋 찾아서 클릭
      await page.click('input[aria-label="environment variable key"]', { timeout: 5000 });
      await page.waitForTimeout(300);

      // 기존 내용 지우고 입력
      await page.keyboard.press('Meta+A'); // Cmd+A로 전체 선택
      await page.keyboard.press('Backspace');
      await page.waitForTimeout(200);

      await page.keyboard.type(env.key, { delay: 30 });
      console.log(`✅ Key 입력: ${env.key}`);

      await page.waitForTimeout(500);

      // Value 입력 필드 찾아서 클릭하고 입력
      console.log('Step 4: Value 필드 클릭 및 입력...');

      // "value" 라벨 아래의 textarea 찾기 (Vercel은 value를 textarea로 사용)
      await page.click('textarea', { timeout: 5000 });
      await page.waitForTimeout(300);

      await page.keyboard.type(env.value, { delay: 30 });
      console.log(`✅ Value 입력: ${env.value}`);

      await page.waitForTimeout(500);

      // Save 버튼 클릭
      console.log('Step 5: Save 버튼 클릭...');
      await page.click('button:has-text("Save")', { timeout: 5000 });
      console.log('✅ Save 완료');

      await page.waitForTimeout(2500);

      // 스크린샷
      const screenshotName = `vercel-fixed-${i + 1}-${env.key}.png`;
      await page.screenshot({
        path: `/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/${screenshotName}`,
        fullPage: true
      });
      console.log(`📸 Screenshot: ${screenshotName}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅✅✅ 환경 변수 수정 완료!');
    console.log('='.repeat(60));

    // 최종 스크린샷
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/vercel-env-fixed-final.png',
      fullPage: true
    });
    console.log('\n📸 최종 Screenshot: vercel-env-fixed-final.png');

  } catch (error) {
    console.error('\n❌ 에러:', error.message);

    // 에러 스크린샷
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/vercel-env-fix-error.png',
      fullPage: true
    });
  }

  console.log('\n✅ 완료!\n');

  process.exit(0);
})();
