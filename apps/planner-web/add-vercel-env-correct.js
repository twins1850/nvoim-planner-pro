const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Vercel SMS 환경 변수 자동 추가 (올바른 URL) 시작...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const page = await context.newPage();

  // 추가할 환경 변수
  const envVars = [
    { key: 'SOLAPI_API_KEY', value: 'your_solapi_api_key_here' },
    { key: 'SOLAPI_API_SECRET', value: 'your_solapi_api_secret_here' },
    { key: 'SOLAPI_FROM_NUMBER', value: '01012345678' }
  ];

  try {
    // 올바른 URL로 접속
    console.log('Step 1: 환경 변수 페이지 접속 (올바른 URL)...');
    await page.goto('https://vercel.com/twins1850s-projects/nvoim-planner-pro/settings/environment-variables', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    await page.waitForTimeout(3000);
    console.log('✅ 페이지 로드 완료\n');

    for (let i = 0; i < envVars.length; i++) {
      const env = envVars[i];
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📝 [${i + 1}/${envVars.length}] ${env.key} 추가 중...`);
      console.log(`${'='.repeat(60)}\n`);

      // "Add Environment Variable" 버튼 클릭
      console.log('Step 2: "Add Environment Variable" 버튼 클릭...');

      const addButtonSelectors = [
        'button:has-text("Add Environment Variable")',
        'button:has-text("Add")',
        'text=Add Environment Variable',
        '[data-testid="add-env-var"]'
      ];

      let clicked = false;
      for (const selector of addButtonSelectors) {
        try {
          await page.click(selector, { timeout: 3000 });
          clicked = true;
          console.log('✅ 버튼 클릭 성공');
          break;
        } catch (e) {
          // 계속 시도
        }
      }

      if (!clicked) {
        console.log('⚠️ 버튼을 찾지 못했습니다. 키보드로 시도...');
        // Tab으로 포커스 이동 후 Enter
        await page.keyboard.press('Tab');
        await page.keyboard.press('Enter');
      }

      await page.waitForTimeout(2000);

      // Name (Key) 입력
      console.log('Step 3: Key 입력...');

      // 첫 번째 input 필드에 포커스가 있을 것
      await page.keyboard.type(env.key, { delay: 50 });
      console.log(`✅ Key 입력: ${env.key}`);

      await page.waitForTimeout(500);

      // Tab으로 Value 필드로 이동
      await page.keyboard.press('Tab');
      await page.waitForTimeout(500);

      // Value 입력
      console.log('Step 4: Value 입력...');
      await page.keyboard.type(env.value, { delay: 50 });
      console.log(`✅ Value 입력: ${env.value}`);

      await page.waitForTimeout(500);

      // Tab으로 Environment 체크박스로 이동
      // Production, Preview, Development 모두 체크
      console.log('Step 5: Environment 체크...');

      // Space로 체크박스 선택 (3번)
      for (let j = 0; j < 3; j++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(200);
        await page.keyboard.press('Space');
        await page.waitForTimeout(200);
      }

      console.log('✅ Environment 체크 완료');

      await page.waitForTimeout(1000);

      // Save 버튼 클릭 (Enter 또는 클릭)
      console.log('Step 6: Save...');

      try {
        // Save 버튼 찾아서 클릭
        await page.click('button:has-text("Save")', { timeout: 2000 });
        console.log('✅ Save 버튼 클릭');
      } catch (e) {
        // Enter 키로 저장
        await page.keyboard.press('Enter');
        console.log('✅ Enter로 저장');
      }

      await page.waitForTimeout(3000);

      // 스크린샷
      const screenshotName = `vercel-added-${i + 1}-${env.key}.png`;
      await page.screenshot({
        path: `/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/${screenshotName}`,
        fullPage: true
      });
      console.log(`📸 Screenshot: ${screenshotName}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅✅✅ 모든 환경 변수 추가 완료!');
    console.log('='.repeat(60));

    // 최종 스크린샷
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/vercel-env-complete.png',
      fullPage: true
    });
    console.log('\n📸 최종 Screenshot: vercel-env-complete.png');

  } catch (error) {
    console.error('\n❌ 에러:', error.message);

    // 에러 스크린샷
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/vercel-env-error.png',
      fullPage: true
    });
  }

  console.log('\n✅ 완료!\n');

  await page.close();
  process.exit(0);
})();
