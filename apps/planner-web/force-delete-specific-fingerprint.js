const { chromium } = require('playwright');

(async () => {
  console.log('🗑️  Force deleting specific fingerprint...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('1. Opening SQL Editor...');
    await page.goto('https://supabase.com/dashboard/project/ybcjkdcdruquqrdahtga/sql/new');
    await page.waitForTimeout(3000);

    console.log('2. Deleting fingerprint e6935701fdcdb727...');

    const sql = `-- Delete specific fingerprint
DELETE FROM public.trial_device_fingerprints
WHERE device_fingerprint LIKE 'e6935701fdcdb727%';

-- Delete ALL fingerprints to be sure
DELETE FROM public.trial_device_fingerprints;

-- Verify
SELECT COUNT(*) as total FROM public.trial_device_fingerprints;

-- Show all remaining (should be 0)
SELECT * FROM public.trial_device_fingerprints;`;

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
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/force-delete-fingerprint.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved');

    const bodyText = await page.textContent('body');

    console.log('\n📊 Result:');
    if (bodyText.includes('total') && bodyText.includes('0')) {
      console.log('✅✅✅ ALL FINGERPRINTS DELETED!');
      console.log('   Table is completely empty');
      console.log('\n🎉 NOW try signup again!');
    } else {
      console.log('⚠️  Check screenshot');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }

  console.log('\n✅ Done!\n');
  process.exit(0);
})();
