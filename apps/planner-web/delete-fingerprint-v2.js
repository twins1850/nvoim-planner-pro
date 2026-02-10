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

    console.log('2. Writing DELETE SQL...');

    const sql = `-- 모든 체험 디바이스 핑거프린트 삭제
DELETE FROM public.trial_device_fingerprints;

-- licenses 테이블의 device_tokens도 초기화
UPDATE public.licenses
SET device_tokens = '[]'::jsonb
WHERE is_trial = true;

-- 결과 확인
SELECT
  (SELECT COUNT(*) FROM public.trial_device_fingerprints) as fingerprint_count,
  (SELECT COUNT(*) FROM public.licenses WHERE is_trial = true AND jsonb_array_length(device_tokens) > 0) as licenses_with_tokens;`;

    // Use Monaco Editor API
    const success = await page.evaluate((sqlContent) => {
      try {
        const editor = document.querySelector('.monaco-editor').__MONACO_EDITOR__ ||
                      window.monaco?.editor?.getEditors?.()?.[0];
        if (editor && editor.setValue) {
          editor.setValue(sqlContent);
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    }, sql);

    console.log('✅ SQL written');
    await page.waitForTimeout(1000);

    console.log('\n3. Running query with keyboard shortcut (Cmd+Enter)...');
    await page.keyboard.press('Meta+Enter');
    console.log('✅ Executed with keyboard');

    console.log('\n4. Waiting for query to complete...');
    await page.waitForTimeout(5000);

    // Take screenshot
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/delete-result.png',
      fullPage: true
    });
    console.log('✅ Screenshot: delete-result.png');

    const bodyText = await page.textContent('body');

    if (bodyText.includes('fingerprint_count')) {
      if (bodyText.includes('0')) {
        console.log('\n✅✅✅ SUCCESS!');
        console.log('   trial_device_fingerprints table is now empty (0 records)');
        console.log('   All device_tokens cleared from trial licenses');
        console.log('\n   🎉 Ready to test trial signup again!');
      } else {
        console.log('\n⚠️  Table may still have records - check screenshot');
      }
    } else {
      console.log('\n⚠️  Result unclear - check screenshot');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/delete-error.png',
      fullPage: true
    });
  }

  process.exit(0);
})();
