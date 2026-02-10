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

    console.log('2. Writing verification SQL...');

    const sql = `-- trial_device_fingerprints 테이블 확인
SELECT COUNT(*) as fingerprint_count
FROM public.trial_device_fingerprints;

-- 모든 레코드 보기 (있다면)
SELECT *
FROM public.trial_device_fingerprints
ORDER BY first_trial_at DESC
LIMIT 10;`;

    // Use Monaco Editor API
    await page.evaluate((sqlContent) => {
      const editor = document.querySelector('.monaco-editor').__MONACO_EDITOR__ ||
                    window.monaco?.editor?.getEditors?.()?.[0];
      if (editor && editor.setValue) {
        editor.setValue(sqlContent);
      }
    }, sql);

    console.log('✅ SQL written');
    await page.waitForTimeout(1000);

    // Click Run
    await page.click('button:has-text("Run")', { force: true, timeout: 5000 });
    console.log('✅ Run clicked');

    // Wait for result
    await page.waitForTimeout(5000);

    // Take screenshot
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/verify-result.png',
      fullPage: true
    });
    console.log('✅ Screenshot: verify-result.png\n');

    const bodyText = await page.textContent('body');

    if (bodyText.includes('fingerprint_count') && bodyText.includes('0')) {
      console.log('✅ Table is EMPTY - trial_device_fingerprints has 0 records');
      console.log('   This means the reset was successful!');
    } else if (bodyText.includes('fingerprint_count')) {
      console.log('⚠️  Table is NOT empty - still has records');
      console.log('   Need to run DELETE again');
    } else {
      console.log('⚠️  Result unclear - check screenshot');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/verify-error.png',
      fullPage: true
    });
  }

  process.exit(0);
})();
