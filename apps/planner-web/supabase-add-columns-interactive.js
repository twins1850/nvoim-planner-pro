const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  // Use Chromium with persistent profile (login will be saved)
  const userDataDir = '/tmp/playwright-supabase-profile';

  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1400, height: 900 }
  });

  const page = await browser.pages()[0] || await browser.newPage();

  try {
    console.log('1. Opening Supabase SQL Editor...');
    await page.goto('https://supabase.com/dashboard/project/eanqmkyvdwmybwxkghev/sql/new', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(3000);

    // Check if we need to login
    let currentUrl = page.url();
    console.log('   Current URL:', currentUrl);

    if (currentUrl.includes('login') || currentUrl.includes('sign-in')) {
      console.log('\n⚠️ Login required!');
      console.log('   Please login in the browser window.');
      console.log('   Script will wait until you reach the SQL Editor page...\n');

      // Wait indefinitely for SQL editor (user must login)
      await page.waitForURL('**/sql/**', { timeout: 0 });
      console.log('✅ Login successful!');
      await page.waitForTimeout(3000);
    }

    // Wait for Monaco Editor
    console.log('2. Waiting for Monaco Editor...');
    await page.waitForSelector('.monaco-editor', { timeout: 30000 });
    console.log('   Monaco Editor loaded');
    await page.waitForTimeout(2000);

    // Read SQL file
    const sql = fs.readFileSync('/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/add-missing-columns.sql', 'utf8');
    console.log('3. SQL loaded, length:', sql.length);

    // Click in editor to focus
    console.log('4. Clicking in editor...');
    await page.click('.monaco-editor');
    await page.waitForTimeout(500);

    // Select all and delete existing content
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(300);

    // Type SQL content
    console.log('5. Typing SQL into editor...');
    await page.keyboard.type(sql, { delay: 10 });
    await page.waitForTimeout(1000);

    console.log('✅ SQL inserted into editor');

    // Take screenshot
    await page.screenshot({ path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/01-sql-ready.png' });
    console.log('✅ Screenshot: 01-sql-ready.png');

    // Click Run button
    console.log('6. Clicking Run button...');
    const runButton = await page.$('button:has-text("Run")');
    if (runButton) {
      await runButton.click();
    } else {
      // Try alternative selectors
      await page.click('button[title*="Run"], button[aria-label*="Run"], button:has-text("실행")');
    }

    // Wait for execution
    console.log('   Waiting for query execution...');
    await page.waitForTimeout(5000);

    // Take screenshot of result
    await page.screenshot({ path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/02-sql-result.png' });
    console.log('✅ Screenshot: 02-sql-result.png');

    // Check for success message
    const bodyText = await page.textContent('body');
    if (bodyText.includes('Success') || bodyText.includes('성공') || bodyText.includes('rows')) {
      console.log('\n✅ SQL executed successfully!');
      console.log('   Columns added: activated_by_user_id, max_devices, purchased_by_email');
    } else if (bodyText.includes('Error') || bodyText.includes('error')) {
      console.log('\n❌ SQL execution failed - check screenshot');

      // Try to extract error message
      const errorElement = await page.$('[class*="error"], [class*="Error"]');
      if (errorElement) {
        const errorText = await errorElement.textContent();
        console.log('   Error:', errorText.substring(0, 200));
      }
    } else {
      console.log('\n⚠️ Unknown result - check screenshot');
    }

    console.log('\n7. Browser will close in 10 seconds...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/error-screenshot.png' });
    console.log('Error screenshot saved');

    console.log('\nBrowser will stay open for inspection. Press Ctrl+C to close.');
    await page.waitForTimeout(60000);
  } finally {
    await browser.close();
  }
})();
