const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Searching for record by ID...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('1. Opening SQL Editor...');
    await page.goto('https://supabase.com/dashboard/project/ybcjkdcdruquqrdahtga/sql/new');
    await page.waitForTimeout(3000);

    console.log('2. Searching for ID: 5923fabd-69da-4160-92f1-6ea248d41921...');

    const sql = `-- Search by exact ID
SELECT * FROM public.trial_device_fingerprints
WHERE id = '5923fabd-69da-4160-92f1-6ea248d41921';

-- Count total records
SELECT COUNT(*) as total FROM public.trial_device_fingerprints;

-- Show ALL records
SELECT * FROM public.trial_device_fingerprints
ORDER BY created_at DESC;`;

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

    console.log('\n3. Executing...');
    await page.keyboard.press('Meta+Enter');
    await page.waitForTimeout(5000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/search-by-id.png',
      fullPage: true
    });
    console.log('📸 Screenshot: search-by-id.png');

    const bodyText = await page.textContent('body');

    console.log('\n📊 Result:');
    if (bodyText.includes('5923fabd-69da-4160-92f1-6ea248d41921')) {
      console.log('❌ RECORD EXISTS in Supabase!');
      console.log('   The record was NOT deleted!');
      console.log('\n🔍 Possible reasons:');
      console.log('   1. DELETE query did not execute');
      console.log('   2. There are database triggers recreating it');
      console.log('   3. Database replication lag');
    } else if (bodyText.includes('total') && bodyText.includes('0')) {
      console.log('✅ NO RECORDS in Supabase');
      console.log('   But API returns it exists!');
      console.log('\n❌ This means API is using a DIFFERENT database!');
    } else {
      console.log('⚠️  Check screenshot for details');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }

  process.exit(0);
})();
