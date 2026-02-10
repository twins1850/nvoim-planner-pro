const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Vercel 환경 변수 페이지 열기...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const page = await context.newPage();

  try {
    console.log('📂 Vercel Environment Variables 페이지로 이동 중...');
    await page.goto('https://vercel.com/twins-projects-96c28b4d/nvoim-planner-pro/settings/environment-variables', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    await page.waitForTimeout(3000);

    console.log('✅ 페이지 열림!');
    console.log('\n여기서 확인하세요:');
    console.log('   - SOLAPI_API_KEY');
    console.log('   - SOLAPI_API_SECRET');
    console.log('   - SOLAPI_FROM_NUMBER');
    console.log('\n이 3개가 보이면 성공입니다! ✅');

    // 스크린샷 저장
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/vercel-env-check.png',
      fullPage: true
    });
    console.log('\n📸 Screenshot: vercel-env-check.png');

    // 페이지를 열어둠 (닫지 않음)
    console.log('\n✅ 페이지가 브라우저에 열려 있습니다!');
    console.log('   확인 후 탭을 닫으시면 됩니다.');

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
  }

  process.exit(0);
})();
