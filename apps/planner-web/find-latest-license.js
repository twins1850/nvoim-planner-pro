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

    console.log('2. Searching for latest licenses...');

    const sql = `-- 최신 생성된 모든 체험 라이선스
SELECT
  id,
  license_key,
  status,
  is_trial,
  planner_id,
  created_at,
  activated_at,
  trial_started_at
FROM public.licenses
WHERE is_trial = true
ORDER BY created_at DESC
LIMIT 10;`;

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
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/latest-licenses.png',
      fullPage: true
    });
    console.log('✅ Screenshot: latest-licenses.png');

    const bodyText = await page.textContent('body');

    console.log('\n📊 Analysis:');

    // Count how many trial licenses
    const matches = bodyText.match(/7D-5P-/g);
    const count = matches ? matches.length : 0;

    console.log(`   Found ${count} trial licenses`);

    if (count > 0) {
      console.log('   ✅ Trial licenses exist in database');
      console.log('   Check screenshot to see if latest one is activated');
    } else {
      console.log('   ❌ No trial licenses found!');
      console.log('   /api/trial/generate is failing');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }

  process.exit(0);
})();
