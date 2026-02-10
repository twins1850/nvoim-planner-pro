const { chromium } = require('playwright');

(async () => {
  console.log('🗑️  Vercel planner-web 프로젝트 삭제 중...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('Step 1: planner-web 프로젝트 설정 페이지로 이동...');
    await page.goto('https://vercel.com/twins1850s-projects/planner-web/settings');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/planner-web-settings.png',
      fullPage: false
    });
    console.log('📸 Screenshot: planner-web-settings.png\n');

    console.log('Step 2: Advanced 섹션 찾기...');

    // Advanced 또는 Delete 버튼 찾기
    try {
      // 페이지 스크롤 (삭제 버튼이 아래에 있을 수 있음)
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/planner-web-advanced.png',
        fullPage: true
      });
      console.log('📸 Screenshot: planner-web-advanced.png\n');

      console.log('Step 3: 삭제 버튼 찾기...');

      // "Delete Project" 버튼 클릭 시도
      const deleteButton = await page.locator('button:has-text("Delete Project"), button:has-text("Delete")').first();

      if (deleteButton) {
        await deleteButton.click();
        await page.waitForTimeout(2000);

        await page.screenshot({
          path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/delete-dialog.png',
          fullPage: false
        });
        console.log('📸 Screenshot: delete-dialog.png\n');

        console.log('Step 4: 확인 다이얼로그에서 프로젝트명 입력...');

        // 입력 필드에 "planner-web" 입력
        const confirmInput = await page.locator('input[type="text"]').first();
        if (confirmInput) {
          await confirmInput.fill('planner-web');
          await page.waitForTimeout(500);

          // 최종 Delete 버튼 클릭
          const finalDeleteButton = await page.locator('button:has-text("Delete")').last();
          if (finalDeleteButton) {
            await finalDeleteButton.click();
            await page.waitForTimeout(3000);

            console.log('✅ planner-web 프로젝트가 삭제되었습니다!\n');

            await page.screenshot({
              path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/after-delete.png',
              fullPage: false
            });
            console.log('📸 Screenshot: after-delete.png\n');
          }
        }
      }

    } catch (e) {
      console.log('⚠️  자동 삭제 실패. 수동으로 삭제해주세요.\n');
      console.log('수동 삭제 방법:');
      console.log('1. 왼쪽 메뉴에서 "Advanced" 클릭');
      console.log('2. 페이지 하단의 "Delete Project" 버튼 클릭');
      console.log('3. 확인 다이얼로그에 "planner-web" 입력');
      console.log('4. "Delete" 버튼 클릭');
      console.log('');
    }

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
    console.log('\n💡 수동 삭제 방법:');
    console.log('1. https://vercel.com/twins1850s-projects/planner-web/settings');
    console.log('2. Advanced 섹션으로 스크롤');
    console.log('3. Delete Project 클릭');
    console.log('4. "planner-web" 입력 후 확인');
  }

  console.log('\n✅ 완료!\n');
  process.exit(0);
})();
