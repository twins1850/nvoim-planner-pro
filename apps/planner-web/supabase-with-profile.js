const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

(async () => {
  // Use user's actual Chrome profile (already logged in!)
  const chromeProfilePath = path.join(os.homedir(), 'Library/Application Support/Google/Chrome/Default');

  console.log('✅ Using your Chrome profile (already logged in)');
  console.log('   Profile:', chromeProfilePath);

  const context = await chromium.launchPersistentContext(chromeProfilePath, {
    headless: false,
    channel: 'chrome',
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.pages()[0] || await context.newPage();

  try {
    console.log('\n1. Opening Supabase SQL Editor...');
    await page.goto('https://supabase.com/dashboard/project/eanqmkyvdwmybwxkghev/sql/new');
    await page.waitForTimeout(5000);

    console.log('2. Checking page status...');
    const url = page.url();

    if (url.includes('/sql')) {
      console.log('✅ Already at SQL Editor!');
    } else if (url.includes('sign-in') || !url.includes('/sql')) {
      console.log('\n⚠️  Login required!');
      console.log('   Please click "Continue with GitHub" in the browser');
      console.log('   Waiting up to 2 minutes for login...\n');

      await page.waitForURL('**/sql/**', { timeout: 120000 });
      console.log('✅ Login complete!');
      await page.waitForTimeout(3000);
    }

    console.log('\n3. Waiting for editor...');
    await page.waitForTimeout(5000);

    // Read SQL
    const sql = fs.readFileSync('/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/add-missing-columns.sql', 'utf8');
    console.log('4. SQL loaded');

    // Focus and input
    console.log('5. Inputting SQL...');
    await page.keyboard.press('Tab');  // Focus on page
    await page.waitForTimeout(500);

    // Try to click editor
    try {
      await page.click('.monaco-editor', { timeout: 2000 });
    } catch (e) {
      await page.mouse.click(700, 400);  // Click center
    }

    await page.waitForTimeout(500);

    // Clear and type
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(300);

    await page.keyboard.type(sql, { delay: 3 });
    console.log('✅ SQL inserted');

    await page.waitForTimeout(1000);

    // Screenshot
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/01-ready.png',
      fullPage: true
    });

    // Click Run
    console.log('\n6. Clicking Run button...');
    try {
      await page.click('button:has-text("Run")', { timeout: 3000 });
      console.log('   Run clicked!');
    } catch (e) {
      console.log('   Please click Run manually');
    }

    await page.waitForTimeout(5000);

    // Screenshot result
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/02-result.png',
      fullPage: true
    });

    // Check result
    const body = await page.textContent('body');
    if (body.includes('Success') || body.includes('activated_by_user_id')) {
      console.log('\n✅ SUCCESS! Columns added.');
    } else if (body.includes('already exists')) {
      console.log('\n✅ Columns already exist.');
    } else {
      console.log('\n⚠️  Check screenshot for result');
    }

    console.log('\nClosing in 10 seconds...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/error.png'
    });

    console.log('\nBrowser will stay open. Press Ctrl+C to close.');
    await page.waitForTimeout(300000);
  } finally {
    await context.close();
  }
})();
