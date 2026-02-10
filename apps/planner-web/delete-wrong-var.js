const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = context.pages()[context.pages().length - 1];

  console.log('🗑️  잘못된 환경 변수 삭제 중...\n');

  // "your_solapi_api_key_here" 행의 ... 버튼 클릭
  await page.click('text=your_solapi_api_key_here ~ button', { timeout: 5000 });
  await page.waitForTimeout(500);

  // Remove 클릭
  await page.click('text=Remove');
  await page.waitForTimeout(500);

  // 확인 버튼 클릭
  await page.click('button:has-text("Remove")');
  await page.waitForTimeout(2000);

  console.log('✅ 삭제 완료!\n');

  await page.screenshot({
    path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/삭제완료.png',
    fullPage: true
  });

  process.exit(0);
})();
