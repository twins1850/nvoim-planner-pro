const { chromium } = require('playwright');

(async () => {
  console.log('🔄 Vercel 도메인 리다이렉트 설정...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('Step 1: Vercel Domains 페이지로 이동...');
    await page.goto('https://vercel.com/twins1850s-projects/nvoim-planner-pro/settings/domains');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/domains-before-redirect.png',
      fullPage: true
    });
    console.log('📸 Screenshot: domains-before-redirect.png\n');

    console.log('Step 2: nvoim-planner-pro.vercel.app 도메인 찾기...');

    // vercel.app 도메인 행 찾기
    const vercelDomain = await page.locator('text=nvoim-planner-pro.vercel.app').first();

    if (vercelDomain) {
      console.log('✅ vercel.app 도메인 발견!');

      // 해당 행의 Edit 버튼 클릭
      const row = vercelDomain.locator('xpath=ancestor::*[contains(@class, "row") or contains(@class, "item")]').first();
      const editButton = row.locator('button:has-text("Edit"), button >> nth=-1').first();

      await editButton.click();
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/vercel-domain-options.png',
        fullPage: false
      });
      console.log('📸 Screenshot: vercel-domain-options.png\n');

      console.log('💡 옵션:');
      console.log('1. "Redirect to" 옵션을 선택');
      console.log('2. 리다이렉트 대상: www.nplannerpro.com');
      console.log('3. Permanent (308) 선택');
      console.log('4. Save');
      console.log('');
      console.log('또는:');
      console.log('1. Remove 버튼 클릭하여 vercel.app 도메인 제거');
      console.log('   (www.nplannerpro.com만 사용)');

    } else {
      console.log('❌ vercel.app 도메인을 찾을 수 없습니다.');
    }

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
  }

  console.log('\n✅ 완료!\n');
  console.log('💡 권장 설정:');
  console.log('- nvoim-planner-pro.vercel.app → www.nplannerpro.com (Redirect)');
  console.log('- 또는 vercel.app 도메인 제거 (추천)');
  console.log('');
  process.exit(0);
})();
