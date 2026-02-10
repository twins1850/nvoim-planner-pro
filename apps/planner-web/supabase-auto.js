const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('Connecting to Chrome...\n');

  try {
    // Connect to Chrome running on port 9222
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');

    // Get existing context (user's Chrome session)
    const contexts = browser.contexts();
    const context = contexts[0];

    // Get pages or create new one
    const pages = context.pages();
    const page = pages.length > 0 ? pages[0] : await context.newPage();

    console.log('✅ Connected to Chrome!\n');

    // Navigate to project page first
    console.log('Navigating to project...');
    await page.goto('https://supabase.com/dashboard/project/eanqmkyvdwmybwxkghev');
    await page.waitForTimeout(3000);

    // Check if login needed
    if (page.url().includes('sign-in')) {
      console.log('\n⚠️  Please login in Chrome browser');
      console.log('   Waiting for login...\n');

      await page.waitForTimeout(10000);
    }

    // Click SQL Editor in sidebar
    console.log('Clicking SQL Editor in sidebar...');
    try {
      // Try multiple selectors for SQL Editor
      const selectors = [
        'text=SQL Editor',
        'a:has-text("SQL Editor")',
        '[href*="/sql"]',
        'nav a:has-text("SQL")'
      ];

      let clicked = false;
      for (const selector of selectors) {
        try {
          await page.click(selector, { timeout: 2000 });
          clicked = true;
          await page.waitForTimeout(3000);
          console.log('✅ SQL Editor clicked!');
          break;
        } catch (e) {
          continue;
        }
      }

      if (!clicked) {
        throw new Error('Could not click SQL Editor');
      }
    } catch (e) {
      console.log('⚠️  Could not click, navigating directly...');
      await page.goto('https://supabase.com/dashboard/project/eanqmkyvdwmybwxkghev/sql/new');
      await page.waitForTimeout(3000);
    }

    console.log('Current URL:', page.url());

    await page.waitForTimeout(5000);

    // Read SQL
    const sql = fs.readFileSync('/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/add-missing-columns.sql', 'utf8');
    console.log('\nSQL loaded. Inserting into editor...');

    // Focus editor
    await page.mouse.click(700, 400);
    await page.waitForTimeout(500);

    // Clear and type
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(300);

    await page.keyboard.type(sql, { delay: 2 });
    console.log('✅ SQL inserted!\n');

    await page.waitForTimeout(1000);

    // Screenshot
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/auto-ready.png',
      fullPage: true
    });

    // Click Run
    console.log('Clicking Run button...');
    try {
      await page.click('button:has-text("Run")', { timeout: 3000 });
      console.log('✅ Run clicked!');
    } catch (e) {
      console.log('⚠️  Please click Run manually');
    }

    await page.waitForTimeout(6000);

    // Screenshot result
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/auto-result.png',
      fullPage: true
    });

    // Check result
    const body = await page.textContent('body');

    if (body.includes('Success') || body.includes('activated_by_user_id') || body.includes('3 rows')) {
      console.log('\n✅ SUCCESS! Columns added:');
      console.log('   - activated_by_user_id (UUID)');
      console.log('   - max_devices (INTEGER, default 2)');
      console.log('   - purchased_by_email (TEXT)');
    } else if (body.includes('already exists')) {
      console.log('\n✅ Columns already exist');
    } else if (body.includes('Error')) {
      console.log('\n❌ Error - check screenshot');
    } else {
      console.log('\n⚠️  Check screenshot for result');
    }

    console.log('\n✅ Done! Chrome will remain open.');
    console.log('Playwright disconnected.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nMake sure Chrome is running with:');
    console.log('  ./start-chrome-persistent.sh\n');
  }

  process.exit(0);
})();
