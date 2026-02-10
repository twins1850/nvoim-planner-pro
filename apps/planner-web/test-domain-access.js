const { chromium } = require('playwright');

(async () => {
  console.log('🌐 도메인 접속 테스트...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  const domains = [
    'https://www.nplannerpro.com',
    'https://nplannerpro.com',
    'https://nvoim-planner-pro.vercel.app',
  ];

  try {
    for (const domain of domains) {
      console.log(`\n🔍 테스트: ${domain}`);

      try {
        const response = await page.goto(domain, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });

        const finalUrl = page.url();
        const status = response.status();

        console.log(`   상태: ${status}`);
        console.log(`   최종 URL: ${finalUrl}`);

        if (finalUrl !== domain) {
          console.log(`   ⚠️  리다이렉트됨: ${domain} → ${finalUrl}`);
        } else {
          console.log(`   ✅ 정상 접속`);
        }

        await page.waitForTimeout(1000);

      } catch (error) {
        console.log(`   ❌ 접속 실패: ${error.message}`);
      }
    }

    console.log('\n\n📸 현재 페이지 스크린샷...');
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/domain-test.png',
      fullPage: false
    });
    console.log('Screenshot: domain-test.png');

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
  }

  console.log('\n✅ 완료!\n');
  process.exit(0);
})();
