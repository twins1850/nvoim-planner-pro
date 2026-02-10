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
    await page.waitForTimeout(4000);

    console.log('2. Setting SQL using Monaco Editor API...');

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

    // Use Monaco Editor API directly - this bypasses the click issue!
    const success = await page.evaluate((sqlContent) => {
      try {
        // Find Monaco editor instance
        const editorElement = document.querySelector('.monaco-editor');
        if (!editorElement) return false;

        // Get the editor instance from the DOM element
        const editor = editorElement.__MONACO_EDITOR__ ||
                      window.monaco?.editor?.getEditors?.()?.[0];

        if (editor && editor.setValue) {
          editor.setValue(sqlContent);
          return true;
        }

        // Fallback: try to find textarea and set value directly
        const textarea = document.querySelector('.monaco-editor textarea.inputarea');
        if (textarea) {
          // Set the value
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            'value'
          ).set;
          nativeInputValueSetter.call(textarea, sqlContent);

          // Trigger input event
          const event = new Event('input', { bubbles: true });
          textarea.dispatchEvent(event);
          return true;
        }

        return false;
      } catch (e) {
        console.error('Error setting editor value:', e);
        return false;
      }
    }, sql);

    if (success) {
      console.log('✅ SQL written to editor using API');
    } else {
      console.log('⚠️  Could not set SQL using API, trying keyboard method...');

      // Fallback: use keyboard
      await page.keyboard.press('Meta+A');
      await page.waitForTimeout(200);
      await page.keyboard.type(sql);
    }

    await page.waitForTimeout(1000);

    // Take screenshot before run
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/reset-before.png',
      fullPage: true
    });
    console.log('✅ Screenshot: reset-before.png');

    console.log('\n3. Clicking Run button...');

    // Click Run button with force option
    try {
      await page.click('button:has-text("Run")', { force: true, timeout: 5000 });
      console.log('✅ Clicked Run button');
    } catch (e) {
      console.log('⚠️  Button click failed, trying keyboard shortcut...');
      await page.keyboard.press('Meta+Enter');
    }

    // Wait for query to complete
    console.log('4. Waiting for query to complete...');
    await page.waitForTimeout(5000);

    // Take screenshot after run
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/reset-after.png',
      fullPage: true
    });
    console.log('✅ Screenshot: reset-after.png');

    console.log('\n5. Checking result...');
    const bodyText = await page.textContent('body');

    if (bodyText.includes('Success') || bodyText.includes('성공')) {
      console.log('✅ Query executed successfully!');

      if (bodyText.includes('fingerprint_count')) {
        console.log('✅ Trial fingerprints reset complete!');
      }
    } else if (bodyText.includes('Error') || bodyText.includes('에러')) {
      console.log('❌ Query error - check screenshot');
    } else {
      console.log('⚠️  Result unclear - check screenshot');
    }

    console.log('\n✅ Script completed!');
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
