const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Vercel 환경 변수 확인...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const page = await context.newPage();

  try {
    // 먼저 프로젝트 페이지로 이동
    console.log('Step 1: 프로젝트 페이지로 이동...');
    await page.goto('https://vercel.com/twins-projects-96c28b4d/nvoim-planner-pro', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    await page.waitForTimeout(2000);
    
    // Settings 클릭
    console.log('Step 2: Settings 클릭...');
    await page.click('a[href*="settings"], button:has-text("Settings")', { timeout: 5000 });
    await page.waitForTimeout(2000);
    
    // Environment Variables 클릭
    console.log('Step 3: Environment Variables 클릭...');
    await page.click('a[href*="environment"], text=Environment', { timeout: 5000 });
    await page.waitForTimeout(3000);
    
    console.log('✅ 환경 변수 페이지 열림!');
    
    // 스크린샷
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/vercel-env-final-check.png',
      fullPage: true
    });
    
    console.log('\n📸 Screenshot: vercel-env-final-check.png');
    console.log('\n✅ 브라우저에서 확인하세요!');
    console.log('   SOLAPI로 시작하는 환경 변수 3개가 보이면 성공입니다!');
    
  } catch (error) {
    console.error('\n❌ 에러:', error.message);
  }

  process.exit(0);
})();
