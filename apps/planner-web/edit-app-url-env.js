const { chromium } = require('playwright');

(async () => {
  console.log('✏️  NEXT_PUBLIC_APP_URL 수정 중...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('Step 1: NEXT_PUBLIC_APP_URL 행의 ... 메뉴 클릭...');

    // NEXT_PUBLIC_APP_URL 행 찾기
    const appUrlRow = await page.locator('text=NEXT_PUBLIC_APP_URL').locator('xpath=ancestor::div[@class or contains(@class, "geist-table-row")]').first();

    // ... 버튼 클릭
    const moreButton = await appUrlRow.locator('[aria-label="More options"], button:has-text("•••"), button >> nth=-1').first();
    await moreButton.click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/env-menu.png',
      fullPage: false
    });
    console.log('📸 Screenshot: env-menu.png');

    console.log('\nStep 2: Edit 메뉴 클릭...');
    await page.locator('text=Edit').first().click();
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/env-edit-dialog.png',
      fullPage: false
    });
    console.log('📸 Screenshot: env-edit-dialog.png');

    // 현재 값 읽기
    console.log('\nStep 3: 현재 값 확인...');
    const currentValue = await page.locator('input[name="value"], textarea[name="value"]').first().inputValue();
    console.log('현재 값:', currentValue);

    if (currentValue.includes('localhost')) {
      console.log('⚠️  localhost 발견! 수정 필요');
    } else if (currentValue.includes('vercel.app')) {
      console.log('⚠️  vercel.app 발견! nplannerpro.com으로 변경 권장');
    } else if (currentValue.includes('nplannerpro.com')) {
      console.log('✅ nplannerpro.com 사용 중! 올바름');
    }

    console.log('\n💡 수정이 필요한 경우:');
    console.log('1. 입력 필드를 클릭하여 수정');
    console.log('2. 권장 값: https://www.nplannerpro.com');
    console.log('3. Save 버튼 클릭');
    console.log('4. 재배포 필요 (자동 트리거됨)');

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
    console.log('\n💡 수동 수정 방법:');
    console.log('1. NEXT_PUBLIC_APP_URL 행의 ... 버튼 클릭');
    console.log('2. Edit 선택');
    console.log('3. 값: https://www.nplannerpro.com');
    console.log('4. Environment: Production만 체크');
    console.log('5. Save');
  }

  console.log('\n✅ 완료!\n');
  process.exit(0);
})();
