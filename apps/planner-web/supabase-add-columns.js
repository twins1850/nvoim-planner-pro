const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({
    headless: false
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('1. Opening Supabase SQL Editor...');
    await page.goto('https://supabase.com/dashboard/project/eanqmkyvdwmybwxkghev/sql/new', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('   Waiting for page to load...');
    await page.waitForTimeout(5000);

    // Check if we need to login
    let currentUrl = page.url();
    console.log('   Current URL:', currentUrl);

    if (currentUrl.includes('login') || currentUrl.includes('sign-in') || currentUrl.includes('auth') || currentUrl.includes('github.com')) {
      console.log('\n⚠️ Login required!');
      console.log('   Please login manually in the browser window that just opened.');
      console.log('   After logging in, you will be redirected to SQL Editor automatically.');
      console.log('   Waiting up to 60 seconds for login completion...\n');

      // Wait for successful navigation to SQL editor
      try {
        await page.waitForURL('**/sql/**', { timeout: 60000 });
        console.log('✅ Login successful, redirected to SQL Editor');
        await page.waitForTimeout(3000);
      } catch (e) {
        console.log('⚠️ Still not at SQL Editor after 60s, checking current URL...');
        currentUrl = page.url();
        console.log('   Current URL:', currentUrl);

        if (!currentUrl.includes('sql')) {
          console.log('❌ Not at SQL Editor. Please complete login and run script again.');
          return;
        }
      }
    }

    // Wait for Monaco Editor
    console.log('2. Waiting for Monaco Editor...');
    try {
      await page.waitForSelector('.monaco-editor', { timeout: 20000 });
      console.log('   Monaco Editor found');
    } catch (e) {
      console.log('⚠️ Monaco Editor not found, trying alternative selector...');
      await page.waitForSelector('[class*="editor"]', { timeout: 10000 });
    }
    await page.waitForTimeout(2000);

    // Read SQL file
    const sql = fs.readFileSync('/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/add-missing-columns.sql', 'utf8');
    console.log('3. SQL loaded, length:', sql.length);

    // Click in editor to focus
    console.log('4. Clicking in editor...');
    await page.click('.monaco-editor');
    await page.waitForTimeout(500);

    // Set editor value using Monaco API
    console.log('5. Setting editor content...');
    await page.evaluate((sqlContent) => {
      const editor = monaco.editor.getModels()[0];
      if (editor) {
        editor.setValue(sqlContent);
        return true;
      }
      return false;
    }, sql);

    await page.waitForTimeout(1000);
    console.log('✅ SQL inserted into editor');

    // Take screenshot
    await page.screenshot({ path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/01-sql-ready.png' });
    console.log('✅ Screenshot: 01-sql-ready.png');

    // Click Run button
    console.log('6. Clicking Run button...');
    await page.click('button:has-text("Run"), button:has-text("실행")');

    // Wait for execution
    await page.waitForTimeout(5000);

    // Take screenshot of result
    await page.screenshot({ path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/02-sql-result.png' });
    console.log('✅ Screenshot: 02-sql-result.png');

    // Check for success message
    const bodyText = await page.textContent('body');
    if (bodyText.includes('Success') || bodyText.includes('성공') || bodyText.includes('3 rows')) {
      console.log('✅ SQL executed successfully');
    } else if (bodyText.includes('Error') || bodyText.includes('error')) {
      console.log('❌ SQL execution failed - check screenshot');
    } else {
      console.log('⚠️ Unknown result - check screenshot');
    }

    console.log('\n7. Browser will close in 10 seconds...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/error-screenshot.png' });
  } finally {
    await browser.close();
  }
})();
