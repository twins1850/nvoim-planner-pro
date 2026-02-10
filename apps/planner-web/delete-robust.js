const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = context.pages()[context.pages().length - 1];

  console.log('🗑️  잘못된 환경 변수 삭제...\n');

  try {
    // 페이지 새로고침
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // "your_solapi_api_key_here"를 포함하는 모든 요소 찾기
    const elements = await page.$$('text=your_solapi_api_key_here');
    console.log(`찾은 요소 수: ${elements.length}`);

    if (elements.length === 0) {
      console.log('✅ 이미 삭제되었거나 없습니다!');
      process.exit(0);
    }

    // 첫 번째 요소의 부모 행 찾기
    const row = elements[0].locator('..');

    // 해당 행의 모든 버튼 찾기
    const allButtons = await row.$$('button');
    console.log(`버튼 수: ${allButtons.length}`);

    // 마지막 버튼 (... 메뉴) 클릭
    if (allButtons.length > 0) {
      await allButtons[allButtons.length - 1].click();
      console.log('✅ ... 메뉴 버튼 클릭');
      await page.waitForTimeout(800);

      // Remove 메뉴 항목 클릭
      await page.click('text=Remove', { timeout: 3000 });
      console.log('✅ Remove 메뉴 클릭');
      await page.waitForTimeout(500);

      // 확인 다이얼로그의 Remove 버튼 클릭
      const confirmButtons = await page.$$('button:has-text("Remove")');
      if (confirmButtons.length > 0) {
        await confirmButtons[0].click();
        console.log('✅ 확인 버튼 클릭');
        await page.waitForTimeout(2000);
      }

      // 최종 스크린샷
      await page.screenshot({
        path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/최종결과.png',
        fullPage: true
      });

      console.log('\n✅✅✅ 삭제 완료!');
    }

  } catch (error) {
    console.error('❌ 에러:', error.message);
  }

  process.exit(0);
})();
