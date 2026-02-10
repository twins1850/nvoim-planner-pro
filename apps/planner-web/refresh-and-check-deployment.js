const { chromium } = require('playwright');

(async () => {
  console.log('🔄 Vercel 배포 페이지 새로고침 중...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('Step 1: 페이지 새로고침...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/vercel-deployments-refreshed.png',
      fullPage: true
    });
    console.log('📸 Screenshot: vercel-deployments-refreshed.png\n');

    console.log('Step 2: 최신 배포 확인...');

    const bodyText = await page.textContent('body');

    // e2efc1b 커밋 찾기
    if (bodyText.includes('e2efc1b') || bodyText.includes('feat(notifications)')) {
      console.log('✅ 최신 커밋 (e2efc1b - trial notifications) 배포됨!');
      console.log('');

      if (bodyText.includes('Building') || bodyText.includes('Queued')) {
        console.log('🔄 상태: Building/Queued');
        console.log('   예상 소요 시간: 2-3분');
      } else if (bodyText.includes('Ready')) {
        console.log('✅ 상태: Ready');
        console.log('   🎉 배포 완료! API를 테스트할 수 있습니다.');
      }
    } else {
      console.log('⏳ 최신 커밋이 아직 배포 목록에 없습니다.');
      console.log('');
      console.log('가능한 이유:');
      console.log('1. Vercel webhook이 아직 트리거되지 않음 (보통 10-30초 소요)');
      console.log('2. 배포가 큐에 대기 중');
      console.log('');
      console.log('💡 해결 방법:');
      console.log('- 1-2분 후 다시 새로고침');
      console.log('- 또는 Vercel에서 수동으로 Redeploy 클릭');
    }

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
  }

  console.log('\n✅ 완료!\n');
  process.exit(0);
})();
