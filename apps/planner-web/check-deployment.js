const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Vercel 배포 상태 확인 중...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('Step 1: Vercel Deployments 페이지로 이동...');
    await page.goto('https://vercel.com/twins1850s-projects/nvoim-planner-pro/deployments');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/vercel-deployments.png',
      fullPage: true
    });
    console.log('📸 Screenshot: vercel-deployments.png\n');

    console.log('Step 2: 최신 배포 상태 확인...');

    const bodyText = await page.textContent('body');

    if (bodyText.includes('Building') || bodyText.includes('Queued')) {
      console.log('🔄 배포 진행 중...');
      console.log('   상태: Building 또는 Queued');
      console.log('   예상 소요 시간: 2-3분');
    } else if (bodyText.includes('Ready')) {
      console.log('✅ 배포 완료!');
      console.log('   상태: Ready');
      console.log('   Production URL: https://nvoim-planner-pro.vercel.app');
    } else if (bodyText.includes('Error') || bodyText.includes('Failed')) {
      console.log('❌ 배포 실패!');
      console.log('   스크린샷을 확인하여 에러 메시지를 확인하세요.');
    }

    console.log('\n💡 다음 단계:');
    console.log('1. 배포 완료 대기 (Building → Ready)');
    console.log('2. Cron Job 테스트 실행');
    console.log('3. Trial 알림 시스템 검증');

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
  }

  console.log('\n✅ 완료!\n');
  process.exit(0);
})();
