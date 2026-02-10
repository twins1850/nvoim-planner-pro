const { chromium } = require('playwright');

(async () => {
  console.log('Connecting to Chrome...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('1. Opening SQL Editor...');
    await page.goto('https://supabase.com/dashboard/project/ybcjkdcdruquqrdahtga/sql/new');
    await page.waitForTimeout(3000);

    console.log('2. Writing SQL to reset trial fingerprints...');

    const sql = `-- 1. trial_device_fingerprints 테이블 초기화 (영구 기록 삭제)
DELETE FROM public.trial_device_fingerprints;

-- 2. licenses 테이블의 device_tokens도 다시 초기화
UPDATE public.licenses
SET device_tokens = '[]'::jsonb
WHERE is_trial = true;

-- 3. 결과 확인
SELECT
  (SELECT COUNT(*) FROM public.trial_device_fingerprints) as fingerprint_count,
  (SELECT COUNT(*) FROM public.licenses WHERE is_trial = true AND jsonb_array_length(device_tokens) = 0) as empty_token_count;`;

    // Find the SQL editor textarea
    const editorSelector = '.monaco-editor textarea.inputarea';
    await page.waitForSelector(editorSelector, { timeout: 10000 });

    // Clear existing content and type SQL
    await page.click(editorSelector);
    await page.keyboard.press('Meta+A'); // Select all
    await page.keyboard.press('Backspace'); // Delete
    await page.waitForTimeout(500);

    // Type the SQL
    await page.fill(editorSelector, sql);
    console.log('✅ SQL written to editor');

    await page.waitForTimeout(1000);

    // Take screenshot before run
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/reset-before.png',
      fullPage: true
    });
    console.log('✅ Screenshot: reset-before.png');

    console.log('\n3. Clicking Run button...');

    // Find and click Run button - try multiple selectors
    const runButtonSelectors = [
      'button:has-text("Run")',
      'button:has-text("실행")',
      '[data-testid="run-button"]',
      'button[type="submit"]'
    ];

    let clicked = false;
    for (const selector of runButtonSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          clicked = true;
          console.log(`✅ Clicked Run button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!clicked) {
      console.log('⚠️  Could not find Run button, trying keyboard shortcut...');
      await page.keyboard.press('Meta+Enter'); // Try Cmd+Enter
    }

    // Wait for query to complete
    await page.waitForTimeout(5000);

    // Take screenshot after run
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/reset-after.png',
      fullPage: true
    });
    console.log('✅ Screenshot: reset-after.png');

    console.log('\n4. Checking result...');
    const bodyText = await page.textContent('body');

    if (bodyText.includes('Success') || bodyText.includes('성공')) {
      console.log('✅ Query executed successfully!');

      if (bodyText.includes('fingerprint_count') || bodyText.includes('0')) {
        console.log('✅ Trial fingerprints reset complete!');
      }
    } else if (bodyText.includes('Error') || bodyText.includes('에러')) {
      console.log('❌ Query error - check screenshot');
    } else {
      console.log('⚠️  Result unclear - check screenshot');
    }

    console.log('\n✅ Reset completed!');
    console.log('   Check screenshots for details.');
    console.log('   Chrome stays open.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/reset-error.png',
      fullPage: true
    });
    console.log('Screenshot saved: reset-error.png');
  }

  process.exit(0);
})();
