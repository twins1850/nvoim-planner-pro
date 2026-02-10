const { chromium } = require('playwright');

(async () => {
  console.log('✏️  NEXT_PUBLIC_APP_URL 수정 (v2)...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('Step 1: 페이지 새로고침...');
    await page.reload();
    await page.waitForTimeout(2000);

    console.log('Step 2: NEXT_PUBLIC_APP_URL 옆의 ... 버튼 정확히 찾기...');

    // 더 구체적인 선택자 사용
    const buttons = await page.locator('button:has-text("•••")').all();
    console.log(`찾은 ... 버튼 개수: ${buttons.length}`);

    // NEXT_PUBLIC_APP_URL이 포함된 행 찾기
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];

      // 버튼이 속한 행 전체 텍스트 확인
      const row = button.locator('xpath=ancestor::*[contains(@class, "row") or contains(@class, "item")]').first();
      const rowText = await row.textContent().catch(() => '');

      if (rowText.includes('NEXT_PUBLIC_APP_URL')) {
        console.log(`✅ ${i + 1}번째 버튼이 NEXT_PUBLIC_APP_URL 행의 버튼입니다!`);

        await button.click();
        await page.waitForTimeout(1500);

        await page.screenshot({
          path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/correct-menu.png',
          fullPage: false
        });
        console.log('📸 Screenshot: correct-menu.png');

        // Edit 메뉴 찾기
        const editButton = await page.locator('text=Edit, button:has-text("Edit"), [role="menuitem"]:has-text("Edit")').first();

        if (editButton) {
          console.log('Edit 버튼 클릭...');
          await editButton.click();
          await page.waitForTimeout(2000);

          await page.screenshot({
            path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/edit-dialog-v2.png',
            fullPage: false
          });
          console.log('📸 Screenshot: edit-dialog-v2.png');

          // 현재 값 읽기
          const valueInput = await page.locator('input[name="value"], textarea[name="value"], input[type="text"]').first();
          const currentValue = await valueInput.inputValue();

          console.log('\n현재 값:', currentValue);

          if (currentValue.includes('localhost')) {
            console.log('⚠️  localhost 발견! 수정 필요\n');

            // 값 수정
            await valueInput.fill('https://www.nplannerpro.com');
            console.log('✅ https://www.nplannerpro.com으로 수정');

            await page.waitForTimeout(1000);

            await page.screenshot({
              path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/new-value.png',
              fullPage: false
            });
            console.log('📸 Screenshot: new-value.png');

            console.log('\n💡 이제 Save 버튼을 클릭하세요!');

          } else if (currentValue.includes('vercel.app')) {
            console.log('⚠️  vercel.app 발견! nplannerpro.com으로 변경 권장');
          } else if (currentValue.includes('nplannerpro.com')) {
            console.log('✅ 이미 nplannerpro.com 사용 중!');
          }
        }

        break;
      }
    }

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
  }

  console.log('\n✅ 완료!\n');
  process.exit(0);
})();
