const { chromium } = require('playwright');

(async () => {
  console.log('🔍 현재 Production 배포 확인 중...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('Step 1: Deployments 페이지로 이동...');
    await page.goto('https://vercel.com/twins1850s-projects/nvoim-planner-pro/deployments');
    await page.waitForTimeout(4000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/current-production.png',
      fullPage: false
    });
    console.log('📸 Screenshot: current-production.png\n');

    console.log('Step 2: Production 배포 찾기...');

    const bodyText = await page.textContent('body');

    // "Current" 텍스트 찾기
    if (bodyText.includes('Current') || bodyText.includes('Production')) {
      console.log('✅ Production 배포를 찾았습니다!');
      console.log('');
      console.log('스크린샷에서 확인하세요:');
      console.log('- "Production" 뱃지 옆에 "Current" 표시가 있는 배포');
      console.log('- 그 배포의 커밋 메시지를 확인');
      console.log('');

      // e2efc1b, 1857db7, 3b13d46 커밋 중 하나인지 확인
      if (bodyText.includes('e2efc1b')) {
        console.log('🎉 발견! Current Production = e2efc1b (trial notifications)');
        console.log('   이것이 API가 작동하는 이유입니다!');
      } else if (bodyText.includes('1857db7')) {
        console.log('⚠️  Current Production = 1857db7 (이전 커밋)');
        console.log('   하지만 API가 작동한다면 Vercel이 자동 배포했을 수 있습니다.');
      } else if (bodyText.includes('3b13d46')) {
        console.log('Current Production = 3b13d46 (nodemailer fix)');
      }
    }

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
  }

  console.log('\n✅ 완료!\n');
  console.log('💡 다음 단계:');
  console.log('1. 현재 Production 배포를 확인');
  console.log('2. admin/login 페이지 수정 커밋');
  console.log('3. 다시 배포 시도');
  console.log('');
  process.exit(0);
})();
