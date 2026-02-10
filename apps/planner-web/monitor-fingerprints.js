const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Monitoring trial_device_fingerprints table...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('1. Opening SQL Editor...');
    await page.goto('https://supabase.com/dashboard/project/ybcjkdcdruquqrdahtga/sql/new');
    await page.waitForTimeout(3000);

    console.log('2. Querying current state...\n');

    const sql = `-- Check ALL fingerprints with details
SELECT
  id,
  device_fingerprint,
  first_trial_at,
  trial_user_email,
  created_at
FROM public.trial_device_fingerprints
ORDER BY created_at DESC
LIMIT 20;

-- Count total
SELECT COUNT(*) as total_fingerprints FROM public.trial_device_fingerprints;`;

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

    await page.keyboard.press('Meta+Enter');
    await page.waitForTimeout(5000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/monitor-fingerprints.png',
      fullPage: true
    });
    console.log('📸 Screenshot: monitor-fingerprints.png\n');

    const bodyText = await page.textContent('body');

    console.log('📊 Current State:');

    if (bodyText.includes('total_fingerprints') && bodyText.includes('0')) {
      console.log('✅ Table is EMPTY (0 fingerprints)');
      console.log('   This means the API should allow signup!');
      console.log('\n❓ But if signup still fails, there might be:');
      console.log('   1. API response caching');
      console.log('   2. Client-side caching');
      console.log('   3. Different database being queried');
    } else {
      const fpMatch = bodyText.match(/e6935701fdcdb727/);
      const fpMatch2 = bodyText.match(/a3a428633c086331/);

      if (fpMatch || fpMatch2) {
        console.log('❌ Fingerprints STILL EXIST!');
        console.log('   The same fingerprints are in the database:');
        if (fpMatch) console.log('   - e6935701fdcdb727... (newer)');
        if (fpMatch2) console.log('   - a3a428633c086331... (older)');
        console.log('\n🔍 This means either:');
        console.log('   1. DELETE did not execute properly');
        console.log('   2. New records were created immediately after DELETE');
      } else {
        console.log('⚠️  Check screenshot for details');
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }

  process.exit(0);
})();
