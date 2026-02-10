const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({
    channel: 'chrome',  // Use actual Chrome browser
    headless: false
  });

  const page = await browser.newPage();

  try {
    console.log('1. Opening Supabase SQL Editor...');
    await page.goto('https://supabase.com/dashboard/project/eanqmkyvdwmybwxkghev/sql/new');

    console.log('2. Checking if login is needed...');
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    if (currentUrl.includes('sign-in') || currentUrl.includes('github.com') || currentUrl.includes('auth')) {
      console.log('⚠️  Login required! Please login in the Chrome browser.');
      console.log('   Waiting for login to complete (up to 2 minutes)...\n');

      // Wait for navigation to SQL editor
      await page.waitForURL('**/sql/**', { timeout: 120000 });
      console.log('✅ Login successful!');
    }

    // Wait for SQL Editor page
    console.log('3. Waiting for SQL Editor to load...');
    await page.waitForTimeout(8000);  // Give page time to fully load

    try {
      await page.waitForSelector('.monaco-editor', { timeout: 5000 });
      console.log('   ✅ Monaco Editor found!');
    } catch (e) {
      console.log('   ⚠️  Monaco not found with standard selector');
      console.log('   ℹ️  Will try to input SQL anyway...');
    }

    await page.waitForTimeout(2000);

    // Read SQL
    const sql = fs.readFileSync('/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/add-missing-columns.sql', 'utf8');
    console.log('4. SQL loaded:', sql.length, 'chars');

    // Focus editor
    console.log('5. Focusing editor...');
    try {
      await page.click('.monaco-editor', { timeout: 2000 });
    } catch (e) {
      console.log('   Trying alternative click...');
      // Click center of page as fallback
      await page.mouse.click(700, 400);
    }
    await page.waitForTimeout(500);

    // Clear and type SQL
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(300);

    console.log('6. Typing SQL...');
    await page.keyboard.type(sql, { delay: 5 });
    await page.waitForTimeout(1000);

    console.log('✅ SQL inserted!');

    // Screenshot
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/01-sql-ready.png',
      fullPage: true
    });
    console.log('✅ Screenshot saved');

    // Click Run
    console.log('7. Clicking Run...');
    await page.click('button:has-text("Run")');

    console.log('   Waiting for results...');
    await page.waitForTimeout(5000);

    // Screenshot result
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/02-sql-result.png',
      fullPage: true
    });
    console.log('✅ Result screenshot saved');

    // Check result
    const bodyText = await page.textContent('body');

    if (bodyText.includes('Success') || bodyText.includes('rows') || bodyText.includes('activated_by_user_id')) {
      console.log('\n✅ SUCCESS! Columns added.');
    } else if (bodyText.includes('already exists')) {
      console.log('\n✅ Columns already exist.');
    } else if (bodyText.includes('Error')) {
      console.log('\n❌ Error - check screenshot');
    }

    console.log('\nClosing in 10 seconds...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    try {
      await page.screenshot({
        path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/error.png',
        fullPage: true
      });
      console.log('Error screenshot saved');
    } catch (e) {}

    console.log('\n⚠️  Error occurred but browser will stay open.');
    console.log('   Please manually complete the task in the browser.');
    console.log('   Press Ctrl+C to close when done.\n');

    await page.waitForTimeout(300000);  // Wait 5 minutes
  } finally {
    await browser.close();
  }
})();
