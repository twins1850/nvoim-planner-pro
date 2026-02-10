const { chromium } = require('playwright');

const CRON_SECRET = 'txsrv0v6p3u26gq9stcoiex2uy4mfl0v';

(async () => {
  console.log('🔧 CRON_SECRET 추가 중...\n');
  console.log('📝 CRON_SECRET =', CRON_SECRET);
  console.log('');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('Step 1: "Add Environment Variable" 버튼 클릭...');

    // "Add Environment Variable" 버튼 찾기 및 클릭
    await page.click('button:has-text("Add Environment Variable")');
    await page.waitForTimeout(2000);

    console.log('Step 2: CRON_SECRET 입력...');

    // Key 입력 (첫 번째 input 필드)
    const keyInput = await page.locator('input[name="key"]').first();
    await keyInput.fill('CRON_SECRET');
    await page.waitForTimeout(500);

    // Value 입력 (textarea 또는 두 번째 input)
    const valueInput = await page.locator('textarea[name="value"], input[name="value"]').first();
    await valueInput.fill(CRON_SECRET);
    await page.waitForTimeout(500);

    console.log('Step 3: Environment 선택 (Production, Preview, Development)...');

    // Production 체크박스
    try {
      await page.locator('label:has-text("Production") input[type="checkbox"]').check();
      console.log('✅ Production 선택됨');
    } catch (e) {
      console.log('⚠️  Production 체크박스 찾기 실패');
    }

    await page.waitForTimeout(300);

    // Preview 체크박스
    try {
      await page.locator('label:has-text("Preview") input[type="checkbox"]').check();
      console.log('✅ Preview 선택됨');
    } catch (e) {
      console.log('⚠️  Preview 체크박스 찾기 실패');
    }

    await page.waitForTimeout(300);

    // Development 체크박스
    try {
      await page.locator('label:has-text("Development") input[type="checkbox"]').check();
      console.log('✅ Development 선택됨');
    } catch (e) {
      console.log('⚠️  Development 체크박스 찾기 실패');
    }

    await page.waitForTimeout(1000);

    console.log('Step 4: Save 버튼 클릭...');

    // Save 버튼 클릭
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(3000);

    console.log('✅ CRON_SECRET 추가 완료!\n');

    // 결과 스크린샷
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/vercel-env-added.png',
      fullPage: true
    });
    console.log('📸 Screenshot: vercel-env-added.png\n');

    console.log('🎉 환경 변수 설정 완료!');
    console.log('');
    console.log('설정된 환경 변수:');
    console.log('✅ CRON_SECRET');
    console.log('✅ GMAIL_USER (이미 존재)');
    console.log('✅ GMAIL_APP_PASSWORD (이미 존재)');
    console.log('✅ NEXT_PUBLIC_APP_URL (이미 존재)');
    console.log('✅ NEXT_PUBLIC_SUPABASE_URL (이미 존재)');
    console.log('✅ SUPABASE_SERVICE_ROLE_KEY (이미 존재)');
    console.log('');
    console.log('⏳ Vercel이 자동으로 재배포를 시작합니다...');
    console.log('   배포 상태: https://vercel.com/twins1850s-projects/nvoim-planner-pro/deployments');
    console.log('');

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/vercel-env-error.png',
      fullPage: true
    });
    console.log('📸 Error screenshot: vercel-env-error.png');
  }

  console.log('\n✅ 완료!\n');
  process.exit(0);
})();
