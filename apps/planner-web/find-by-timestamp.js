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

    console.log('2. Searching for record by timestamp...');

    const sql = `-- API가 반환한 타임스탬프로 검색
SELECT *
FROM public.trial_device_fingerprints
WHERE first_trial_at = '2026-01-28T00:59:32.823+00:00'::timestamptz;

-- 혹시 모르니 비슷한 시간대 모두 검색
SELECT *
FROM public.trial_device_fingerprints
WHERE first_trial_at >= '2026-01-28T00:59:00+00:00'::timestamptz
  AND first_trial_at <= '2026-01-28T01:00:00+00:00'::timestamptz;

-- 전체 카운트
SELECT COUNT(*) as total
FROM public.trial_device_fingerprints;`;

    // Use Monaco Editor API
    await page.evaluate((sqlContent) => {
      try {
        const editor = document.querySelector('.monaco-editor').__MONACO_EDITOR__ ||
                      window.monaco?.editor?.getEditors?.()?.[0];
        if (editor && editor.setValue) {
          editor.setValue(sqlContent);
        }
      } catch (e) {}
    }, sql);

    console.log('✅ SQL written');
    await page.waitForTimeout(1000);

    console.log('\n3. Running query...');
    await page.keyboard.press('Meta+Enter');
    await page.waitForTimeout(5000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/find-by-timestamp.png',
      fullPage: true
    });
    console.log('✅ Screenshot: find-by-timestamp.png\n');

    const bodyText = await page.textContent('body');

    if (bodyText.includes('2026-01-28') && bodyText.includes('00:59')) {
      console.log('❌ FOUND IT! The record STILL EXISTS!');
      console.log('   This means DELETE did NOT work, or...');
      console.log('   We are looking at the WRONG database.');
    } else if (bodyText.includes('total') && bodyText.includes('0')) {
      console.log('✅ No records found with that timestamp');
      console.log('   Database is empty.');
      console.log('\n❗ This means API is using a DIFFERENT Supabase project!');
      console.log('   Check Vercel environment variables.');
    } else {
      console.log('⚠️  Check screenshot for details');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }

  process.exit(0);
})();
