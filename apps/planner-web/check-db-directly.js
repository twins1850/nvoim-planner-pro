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

    console.log('2. Checking trial_device_fingerprints table...');

    const sql = `-- 특정 디바이스 핑거프린트 확인
SELECT *
FROM public.trial_device_fingerprints
WHERE device_fingerprint LIKE 'a3a428633c086331%'
LIMIT 5;

-- 모든 레코드 카운트
SELECT COUNT(*) as total_count
FROM public.trial_device_fingerprints;

-- 모든 레코드 보기
SELECT *
FROM public.trial_device_fingerprints
ORDER BY first_trial_at DESC
LIMIT 10;`;

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
    console.log('✅ Executed');

    await page.waitForTimeout(5000);

    // Take screenshot
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/check-db.png',
      fullPage: true
    });
    console.log('✅ Screenshot: check-db.png\n');

    const bodyText = await page.textContent('body');

    if (bodyText.includes('total_count') && bodyText.includes('0')) {
      console.log('✅ Database shows 0 records');
      console.log('   This means the API might be using a DIFFERENT database!');
      console.log('   Or there is caching happening.');
    } else if (bodyText.includes('a3a428633c086331')) {
      console.log('❌ Record STILL EXISTS in database!');
      console.log('   The DELETE did not work.');
    } else {
      console.log('⚠️  Check screenshot for details');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }

  process.exit(0);
})();
