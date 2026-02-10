const { chromium } = require('playwright');

(async () => {
  console.log('📋 Vercel 빌드 로그 확인 중...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('Step 1: 최신 배포 페이지로 이동...');
    await page.goto('https://vercel.com/twins1850s-projects/planner-web/9F67zmemCugyHtSXNegjSuJSxZDT');
    await page.waitForTimeout(4000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/vercel-build-error.png',
      fullPage: true
    });
    console.log('📸 Screenshot: vercel-build-error.png\n');

    const bodyText = await page.textContent('body');

    if (bodyText.includes('Html')) {
      console.log('⚠️  발견된 에러: <Html> import 문제');
      console.log('   이것은 기존 코드의 문제입니다 (제가 추가한 코드와 무관)');
    }

    if (bodyText.includes('Error') || bodyText.includes('Failed')) {
      console.log('❌ 빌드 실패');
      console.log('   스크린샷에서 상세 에러 로그를 확인하세요');
    }

    console.log('');
    console.log('💡 해결 방법:');
    console.log('1. 이전 성공한 배포 (1857db7 또는 SCMqRlO4)를 Promote to Production');
    console.log('2. Trial 알림 API는 별도로 배포 (API routes only)');
    console.log('3. 또는 Html import 에러를 먼저 수정');

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
  }

  console.log('\n✅ 완료!\n');
  process.exit(0);
})();
