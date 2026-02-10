const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

(async () => {
  // Use user's actual Chrome browser with existing profile
  const userDataDir = path.join(os.homedir(), 'Library/Application Support/Google/Chrome');

  console.log('Using Chrome profile:', userDataDir);

  // Launch Chrome (not Chromium) with existing user data
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chrome',  // Use installed Chrome instead of Chromium
    headless: false,
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.pages()[0] || await context.newPage();

  try {
    console.log('\n1. Opening Supabase SQL Editor...');
    await page.goto('https://supabase.com/dashboard/project/eanqmkyvdwmybwxkghev/sql/new', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(3000);

    // Check current URL
    let currentUrl = page.url();
    console.log('   Current URL:', currentUrl);

    if (currentUrl.includes('login') || currentUrl.includes('sign-in')) {
      console.log('\n⚠️ Not logged in. Please login in the browser window.');
      console.log('   Waiting for login...\n');

      await page.waitForURL('**/sql/**', { timeout: 120000 });
      console.log('✅ Login complete!');
      await page.waitForTimeout(2000);
    } else if (currentUrl.includes('/sql')) {
      console.log('✅ Already logged in!');
    }

    // Wait for Monaco Editor
    console.log('\n2. Waiting for SQL Editor to load...');
    await page.waitForSelector('.monaco-editor, [class*="monaco"]', { timeout: 30000 });
    console.log('   SQL Editor loaded');
    await page.waitForTimeout(2000);

    // Read SQL file
    const sql = fs.readFileSync('/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/add-missing-columns.sql', 'utf8');
    console.log('\n3. SQL content loaded (' + sql.length + ' characters)');

    // Click in editor to focus
    console.log('4. Focusing on editor...');
    await page.click('.monaco-editor');
    await page.waitForTimeout(500);

    // Clear existing content
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(300);

    // Type SQL
    console.log('5. Inserting SQL into editor...');
    await page.keyboard.type(sql, { delay: 5 });
    await page.waitForTimeout(1000);

    console.log('✅ SQL inserted');

    // Screenshot
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/01-sql-ready.png',
      fullPage: true
    });
    console.log('✅ Screenshot: 01-sql-ready.png');

    // Find and click Run button
    console.log('\n6. Clicking Run button...');

    // Try multiple selectors for Run button
    const runButtonSelectors = [
      'button:has-text("Run")',
      'button[title*="Run"]',
      'button[aria-label*="Run"]',
      'button:has-text("실행")',
      'button >> text=Run'
    ];

    let clicked = false;
    for (const selector of runButtonSelectors) {
      try {
        await page.click(selector, { timeout: 2000 });
        clicked = true;
        console.log('   Run button clicked');
        break;
      } catch (e) {
        // Try next selector
      }
    }

    if (!clicked) {
      console.log('⚠️ Could not find Run button automatically');
      console.log('   Please click the Run button manually in the browser');
      await page.waitForTimeout(10000);
    }

    // Wait for query execution
    console.log('   Waiting for query execution...');
    await page.waitForTimeout(5000);

    // Screenshot of result
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/02-sql-result.png',
      fullPage: true
    });
    console.log('✅ Screenshot: 02-sql-result.png');

    // Check for results
    const bodyText = await page.textContent('body');

    if (bodyText.includes('Success') || bodyText.includes('rows') || bodyText.includes('activated_by_user_id')) {
      console.log('\n✅ SUCCESS! Columns added:');
      console.log('   - activated_by_user_id (UUID)');
      console.log('   - max_devices (INTEGER, default: 2)');
      console.log('   - purchased_by_email (TEXT)');
    } else if (bodyText.includes('already exists')) {
      console.log('\n✅ Columns already exist (no changes needed)');
    } else if (bodyText.includes('Error') || bodyText.includes('error')) {
      console.log('\n❌ Error occurred - check screenshot');
    } else {
      console.log('\n⚠️ Result unclear - check screenshot');
    }

    console.log('\n7. Browser will close in 10 seconds...');
    console.log('   Check screenshots in scratchpad directory\n');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/error-screenshot.png',
      fullPage: true
    });
    console.log('Error screenshot saved');

    console.log('\nBrowser will stay open for 30 seconds. Press Ctrl+C to close earlier.');
    await page.waitForTimeout(30000);
  } finally {
    await context.close();
  }
})();
