const { chromium } = require('playwright');

(async () => {
  console.log('🔄 Vercel 도메인 리다이렉트 적용...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('Step 1: "Redirect to Another Domain" 옵션 선택...');

    // Redirect to Another Domain 라디오 버튼 클릭
    const redirectRadio = await page.locator('text=Redirect to Another Domain').first();
    await redirectRadio.click();
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/redirect-selected.png',
      fullPage: false
    });
    console.log('📸 Screenshot: redirect-selected.png\n');

    console.log('Step 2: 리다이렉트 타입 선택...');

    // 307 Temporary Redirect 드롭다운 클릭
    const redirectTypeDropdown = await page.locator('text=307 Temporary Redirect').first();
    await redirectTypeDropdown.click();
    await page.waitForTimeout(1000);

    // 308 Permanent Redirect 선택
    const permanentOption = await page.locator('text=308 Permanent Redirect').first();
    if (permanentOption) {
      console.log('308 Permanent Redirect 선택 중...');
      await permanentOption.click();
      await page.waitForTimeout(1000);
    }

    console.log('Step 3: 리다이렉트 대상 도메인 선택...');

    // "No Redirect" 드롭다운 클릭
    const targetDropdown = await page.locator('text=No Redirect').first();
    await targetDropdown.click();
    await page.waitForTimeout(1000);

    // www.nplannerpro.com 선택
    const targetDomain = await page.locator('text=www.nplannerpro.com').first();
    if (targetDomain) {
      console.log('www.nplannerpro.com 선택 중...');
      await targetDomain.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/redirect-configured.png',
      fullPage: false
    });
    console.log('📸 Screenshot: redirect-configured.png\n');

    console.log('Step 4: Save 버튼 클릭...');

    const saveButton = await page.locator('button:has-text("Save")').first();
    await saveButton.click();
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/redirect-saved.png',
      fullPage: true
    });
    console.log('📸 Screenshot: redirect-saved.png\n');

    console.log('✅ 리다이렉트 설정 완료!');
    console.log('');
    console.log('🎉 이제 nvoim-planner-pro.vercel.app → www.nplannerpro.com으로 리다이렉트됩니다!');

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
    console.log('\n💡 수동으로 진행해주세요:');
    console.log('1. "Redirect to Another Domain" 라디오 버튼 선택');
    console.log('2. "307 Temporary Redirect" → "308 Permanent Redirect" 변경');
    console.log('3. "No Redirect" → "www.nplannerpro.com" 선택');
    console.log('4. Save 클릭');
  }

  console.log('\n✅ 완료!\n');
  process.exit(0);
})();
