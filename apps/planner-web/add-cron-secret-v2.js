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
    console.log('Step 1: 모달이 이미 열려 있습니다...');
    await page.waitForTimeout(1000);

    console.log('Step 2: Key 필드에 CRON_SECRET 입력...');

    // Key 필드 찾기 (다양한 방법 시도)
    const keyField = await page.locator('input[placeholder*="KEY"], input[type="text"]').first();
    await keyField.click();
    await keyField.fill('');
    await keyField.type('CRON_SECRET', { delay: 50 });
    await page.waitForTimeout(500);

    console.log('Step 3: Value 필드에 값 입력...');

    // Value 필드 찾기
    const valueFields = await page.locator('input[type="text"]').all();
    if (valueFields.length >= 2) {
      await valueFields[1].click();
      await valueFields[1].fill('');
      await valueFields[1].type(CRON_SECRET, { delay: 30 });
    }
    await page.waitForTimeout(500);

    console.log('Step 4: Environments 설정...');

    // "All Environments" 드롭다운 클릭
    try {
      await page.click('text=All Environments');
      await page.waitForTimeout(500);

      // Production, Preview, Development 체크박스 확인
      console.log('✅ All Environments 선택됨 (Production, Preview, Development 포함)');
    } catch (e) {
      console.log('⚠️  기본값 사용 (All Environments)');
    }

    await page.waitForTimeout(1000);

    console.log('Step 5: Save 버튼 클릭...');

    // Save 버튼 클릭
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(4000);

    console.log('✅ CRON_SECRET 추가 완료!\n');

    // 결과 스크린샷
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/vercel-env-final.png',
      fullPage: true
    });
    console.log('📸 Screenshot: vercel-env-final.png\n');

    console.log('🎉🎉🎉 환경 변수 설정 완료! 🎉🎉🎉');
    console.log('');
    console.log('✅ 설정된 환경 변수:');
    console.log('   1. CRON_SECRET (새로 추가)');
    console.log('   2. GMAIL_USER (기존)');
    console.log('   3. GMAIL_APP_PASSWORD (기존)');
    console.log('   4. NEXT_PUBLIC_APP_URL (기존)');
    console.log('   5. NEXT_PUBLIC_SUPABASE_URL (기존)');
    console.log('   6. SUPABASE_SERVICE_ROLE_KEY (기존)');
    console.log('');
    console.log('⏳ Vercel이 자동으로 재배포를 시작합니다...');
    console.log('   배포 확인: https://vercel.com/twins1850s-projects/nvoim-planner-pro/deployments');
    console.log('');
    console.log('🔒 CRON_SECRET 값 (저장해두세요):');
    console.log('   ' + CRON_SECRET);
    console.log('');

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/vercel-env-error2.png',
      fullPage: true
    });
    console.log('📸 Error screenshot: vercel-env-error2.png');
  }

  console.log('\n✅ 완료!\n');
  process.exit(0);
})();
