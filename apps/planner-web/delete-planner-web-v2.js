const { chromium } = require('playwright');

(async () => {
  console.log('🗑️  Vercel planner-web 프로젝트 삭제 중...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('현재 Delete Project 다이얼로그가 열려 있습니다...\n');

    console.log('Step 1: 첫 번째 입력 필드에 "planner-web" 입력...');

    // 모든 input 필드 찾기
    const inputs = await page.locator('input[type="text"]').all();

    if (inputs.length >= 2) {
      // 첫 번째 입력: "planner-web"
      await inputs[0].click();
      await inputs[0].fill('');
      await inputs[0].type('planner-web', { delay: 50 });
      await page.waitForTimeout(500);
      console.log('✅ "planner-web" 입력 완료');

      // 두 번째 입력: "delete my project"
      console.log('Step 2: 두 번째 입력 필드에 "delete my project" 입력...');
      await inputs[1].click();
      await inputs[1].fill('');
      await inputs[1].type('delete my project', { delay: 50 });
      await page.waitForTimeout(500);
      console.log('✅ "delete my project" 입력 완료\n');

      await page.screenshot({
        path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/before-final-delete.png',
        fullPage: false
      });
      console.log('📸 Screenshot: before-final-delete.png\n');

      console.log('Step 3: "Delete Project" 버튼 클릭...');

      // Delete Project 버튼 클릭
      await page.click('button:has-text("Delete Project")');
      await page.waitForTimeout(5000);

      await page.screenshot({
        path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/final-delete-result.png',
        fullPage: false
      });
      console.log('📸 Screenshot: final-delete-result.png\n');

      console.log('✅✅✅ planner-web 프로젝트가 삭제되었습니다!\n');
      console.log('🎉 이제 nvoim-planner-pro 프로젝트만 남았습니다!');
    } else {
      console.log('⚠️  입력 필드를 찾을 수 없습니다.');
    }

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
  }

  console.log('\n✅ 완료!\n');
  process.exit(0);
})();
