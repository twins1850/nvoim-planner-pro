const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('Connecting to your Chrome browser...\n');

  // Connect to the Chrome instance running with remote debugging
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');

  // Get the default context (your actual Chrome profile with all logins)
  const contexts = browser.contexts();
  const context = contexts[0];

  // Create a new page
  const page = await context.newPage();

  try {
    console.log('1. Opening Supabase SQL Editor...');
    await page.goto('https://supabase.com/dashboard/project/eanqmkyvdwmybwxkghev/sql/new');

    await page.waitForTimeout(5000);

    console.log('2. Checking login status...');
    const url = page.url();

    if (url.includes('sign-in')) {
      console.log('⚠️  Please login in Chrome (using your existing session)');
      console.log('   Waiting for navigation to SQL editor...\n');

      await page.waitForURL('**/sql/**', { timeout: 120000 });
      console.log('✅ Login complete!');
    } else if (url.includes('/sql')) {
      console.log('✅ Already logged in!');
    }

    await page.waitForTimeout(3000);

    // Read SQL
    const sql = fs.readFileSync('/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/add-missing-columns.sql', 'utf8');
    console.log('\n3. SQL loaded');

    console.log('4. Inserting SQL into editor...');

    // Click to focus
    try {
      await page.click('.monaco-editor', { timeout: 3000 });
    } catch (e) {
      await page.mouse.click(700, 400);
    }

    await page.waitForTimeout(500);

    // Clear and type
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(300);

    await page.keyboard.type(sql, { delay: 3 });
    console.log('✅ SQL inserted!');

    await page.waitForTimeout(1000);

    // Screenshot
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/sql-ready.png',
      fullPage: true
    });

    console.log('\n5. Clicking Run button...');
    try {
      await page.click('button:has-text("Run")', { timeout: 3000 });
      console.log('   ✅ Run clicked!');
    } catch (e) {
      console.log('   ⚠️  Please click Run manually');
    }

    await page.waitForTimeout(5000);

    // Screenshot result
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/sql-result.png',
      fullPage: true
    });

    // Check result
    const body = await page.textContent('body');

    if (body.includes('Success') || body.includes('activated_by_user_id') || body.includes('3 rows')) {
      console.log('\n✅ SUCCESS! Columns added:');
      console.log('   - activated_by_user_id');
      console.log('   - max_devices');
      console.log('   - purchased_by_email');
    } else if (body.includes('already exists')) {
      console.log('\n✅ Columns already exist (no action needed)');
    } else if (body.includes('Error')) {
      console.log('\n❌ Error occurred - check screenshot');
    } else {
      console.log('\n⚠️  Check screenshot for result');
    }

    console.log('\nDone! Playwright disconnected.');
    console.log('Chrome will remain open for your use.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);

    try {
      await page.screenshot({
        path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/error.png'
      });
    } catch (e) {}

    console.log('Chrome will remain open.\n');
  } finally {
    // Disconnect but don't close the browser
    await browser.close();
  }
})();
