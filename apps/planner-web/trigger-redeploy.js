const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Vercel 수동 재배포 트리거 중...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('Step 1: Deployments 페이지로 이동...');
    const currentUrl = page.url();

    if (!currentUrl.includes('deployments')) {
      await page.goto('https://vercel.com/twins1850s-projects/nvoim-planner-pro/deployments');
      await page.waitForTimeout(3000);
    }

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/before-redeploy.png',
      fullPage: false
    });
    console.log('📸 Screenshot: before-redeploy.png\n');

    console.log('💡 수동 재배포 방법:');
    console.log('');
    console.log('1. 최신 배포 (SCMqRlO4 또는 다른 배포) 옆의 "..." 버튼 클릭');
    console.log('2. "Redeploy" 선택');
    console.log('3. 확인 다이얼로그에서 "Redeploy" 클릭');
    console.log('');
    console.log('또는:');
    console.log('1. 우측 상단 "..." 메뉴 클릭');
    console.log('2. "Redeploy" 선택');
    console.log('3. Git Source "main" 브랜치 선택');
    console.log('4. "Redeploy" 버튼 클릭');
    console.log('');
    console.log('⏳ 재배포가 시작되면 2-3분 후 완료됩니다.');

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
  }

  console.log('\n✅ 안내 완료!\n');
  console.log('📝 재배포 완료 후:');
  console.log('   node test-cron-api.js');
  console.log('   명령어로 API를 테스트할 수 있습니다.');
  console.log('');
  process.exit(0);
})();
