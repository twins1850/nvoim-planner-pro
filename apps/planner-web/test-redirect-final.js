const { chromium } = require('playwright');

(async () => {
  console.log('🧪 도메인 리다이렉트 테스트...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  // 새 탭 열기 (깨끗한 테스트)
  const page = await context.newPage();

  try {
    console.log('Step 1: vercel.app 도메인으로 접속 시도...');
    console.log('URL: https://nvoim-planner-pro.vercel.app\n');

    const response = await page.goto('https://nvoim-planner-pro.vercel.app', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    await page.waitForTimeout(2000);

    const finalUrl = page.url();
    const status = response.status();

    console.log('📊 결과:');
    console.log(`   HTTP 상태: ${status}`);
    console.log(`   최종 URL: ${finalUrl}\n`);

    if (finalUrl.includes('www.nplannerpro.com')) {
      console.log('✅✅✅ 성공! vercel.app → www.nplannerpro.com 리다이렉트 작동!');
      console.log('');
      console.log('🎉 이제 모든 사용자가 실제 도메인으로 접속합니다!');
    } else if (finalUrl.includes('nvoim-planner-pro.vercel.app')) {
      console.log('⚠️  리다이렉트가 아직 적용되지 않았습니다.');
      console.log('   1-2분 후에 다시 시도해주세요. (DNS 전파 시간)');
    } else {
      console.log('❓ 예상치 못한 URL:', finalUrl);
    }

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/redirect-test-result.png',
      fullPage: false
    });
    console.log('\n📸 Screenshot: redirect-test-result.png');

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
  }

  console.log('\n✅ 완료!\n');

  // 탭 닫기
  await page.close();

  process.exit(0);
})();
