const { chromium } = require('playwright');

(async () => {
  console.log('🌐 Vercel 도메인 설정 확인 중...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('Step 1: Vercel 프로젝트 설정 페이지로 이동...');
    await page.goto('https://vercel.com/twins1850s-projects/nvoim-planner-pro/settings/domains');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/vercel-domains.png',
      fullPage: true
    });
    console.log('📸 Screenshot: vercel-domains.png\n');

    console.log('Step 2: 도메인 목록 추출...');
    const bodyText = await page.textContent('body');

    console.log('🔍 현재 설정된 도메인들:');

    if (bodyText.includes('nplannerpro.com')) {
      console.log('  ✅ nplannerpro.com - 발견!');

      if (bodyText.includes('Ready') || bodyText.includes('Valid Configuration')) {
        console.log('     상태: ✅ 정상 작동 중');
      } else if (bodyText.includes('Invalid') || bodyText.includes('Error')) {
        console.log('     상태: ⚠️  설정 오류');
      } else if (bodyText.includes('Pending')) {
        console.log('     상태: ⏳ 설정 대기 중');
      } else {
        console.log('     상태: ❓ 확인 필요');
      }
    } else {
      console.log('  ❌ nplannerpro.com - 설정되지 않음!');
    }

    if (bodyText.includes('nvoim-planner-pro.vercel.app')) {
      console.log('  ✅ nvoim-planner-pro.vercel.app (기본 Vercel 도메인)');
    }

    if (bodyText.includes('www.nplannerpro.com')) {
      console.log('  ✅ www.nplannerpro.com');
    }

    console.log('');

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
  }

  console.log('✅ 완료!\n');
  console.log('💡 다음 단계:');
  console.log('1. 스크린샷 확인: vercel-domains.png');
  console.log('2. nplannerpro.com 도메인이 없으면 추가 필요');
  console.log('3. 환경 변수 NEXT_PUBLIC_APP_URL 업데이트 필요');
  console.log('');
  process.exit(0);
})();
