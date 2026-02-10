const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Starting automatic DELETE operation...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('1️⃣  Opening SQL Editor...');
    await page.goto('https://supabase.com/dashboard/project/ybcjkdcdruquqrdahtga/sql/new');
    await page.waitForTimeout(4000);

    // ========== STEP 1: DELETE ==========
    console.log('\n2️⃣  Writing DELETE query...');

    const deleteSQL = `DELETE FROM public.trial_device_fingerprints;`;

    await page.evaluate((sql) => {
      try {
        const editor = document.querySelector('.monaco-editor').__MONACO_EDITOR__ ||
                      window.monaco?.editor?.getEditors?.()?.[0];
        if (editor && editor.setValue) {
          editor.setValue(sql);
          return true;
        }
      } catch (e) {
        console.error('Editor error:', e);
      }
    }, deleteSQL);

    console.log('✅ DELETE query written');
    await page.waitForTimeout(1500);

    console.log('\n3️⃣  Executing DELETE with Cmd+Enter...');
    await page.keyboard.press('Meta+Enter');
    console.log('✅ DELETE executed!');

    // Wait for query to complete
    console.log('\n⏳ Waiting for DELETE to complete (8 seconds)...');
    await page.waitForTimeout(8000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/delete-step1.png',
      fullPage: true
    });
    console.log('📸 Screenshot: delete-step1.png');

    // ========== STEP 2: VERIFY ==========
    console.log('\n4️⃣  Writing COUNT verification query...');

    const countSQL = `SELECT COUNT(*) as total FROM public.trial_device_fingerprints;`;

    await page.evaluate((sql) => {
      try {
        const editor = document.querySelector('.monaco-editor').__MONACO_EDITOR__ ||
                      window.monaco?.editor?.getEditors?.()?.[0];
        if (editor && editor.setValue) {
          editor.setValue(sql);
        }
      } catch (e) {}
    }, countSQL);

    console.log('✅ COUNT query written');
    await page.waitForTimeout(1500);

    console.log('\n5️⃣  Executing COUNT with Cmd+Enter...');
    await page.keyboard.press('Meta+Enter');
    console.log('✅ COUNT executed!');

    console.log('\n⏳ Waiting for result...');
    await page.waitForTimeout(5000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/delete-step2.png',
      fullPage: true
    });
    console.log('📸 Screenshot: delete-step2.png');

    // Check result
    const bodyText = await page.textContent('body');

    console.log('\n📊 RESULT:');
    if (bodyText.includes('total') && bodyText.includes('0')) {
      console.log('✅✅✅ SUCCESS! Table is empty (0 records)');
      console.log('🎉 trial_device_fingerprints has been cleared!');
      console.log('\n👉 Ready to test trial signup now!');
    } else if (bodyText.includes('total') && bodyText.includes('3')) {
      console.log('❌ FAILED - Still shows 3 records');
      console.log('   The DELETE did not execute properly.');
      console.log('   Check screenshot: delete-step1.png');
    } else {
      console.log('⚠️  Result unclear - check screenshots');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/delete-error.png',
      fullPage: true
    });
    console.log('Screenshot saved: delete-error.png');
  }

  console.log('\n✅ Done!\n');
  process.exit(0);
})();
