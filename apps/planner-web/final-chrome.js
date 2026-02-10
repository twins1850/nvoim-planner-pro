const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

(async () => {
  console.log('Opening Chrome with your profile...\n');

  // Use persistent context with actual Chrome profile
  const profilePath = path.join(os.homedir(), 'Library/Application Support/Google/Chrome');

  const context = await chromium.launchPersistentContext(profilePath, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1400, height: 900 },
    args: ['--disable-blink-features=AutomationControlled']
  });

  const page = await context.pages()[0] || await context.newPage();

  try {
    console.log('1. Opening Supabase SQL Editor...');
    await page.goto('https://supabase.com/dashboard/project/eanqmkyvdwmybwxkghev/sql/new');

    console.log('2. Waiting for page to load (15 seconds)...');
    console.log('   If you see a login page, please login now.\n');
    await page.waitForTimeout(15000);

    // Check if we need to wait for login
    const url = page.url();
    if (!url.includes('/sql/')) {
      console.log('⚠️  Still not at SQL Editor.');
      console.log('   Please complete login, then the script will continue...\n');

      await page.waitForURL('**/sql/**', { timeout: 120000 });
      console.log('✅ SQL Editor loaded!');
    } else {
      console.log('✅ Already at SQL Editor!');
    }

    await page.waitForTimeout(5000);

    // Read SQL
    const sql = fs.readFileSync('/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/add-missing-columns.sql', 'utf8');
    console.log('\n3. Inserting SQL...');

    // Click editor
    await page.mouse.click(700, 400);
    await page.waitForTimeout(500);

    // Clear and type
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(300);

    await page.keyboard.type(sql, { delay: 2 });
    console.log('✅ SQL inserted!');

    await page.waitForTimeout(1000);

    // Screenshot
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/final-ready.png',
      fullPage: true
    });

    console.log('\n4. Clicking Run...');
    try {
      await page.click('button:has-text("Run")', { timeout: 3000 });
      console.log('   ✅ Run clicked!');
    } catch (e) {
      console.log('   ⚠️  Please click Run manually in browser');
    }

    await page.waitForTimeout(6000);

    // Screenshot result
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/final-result.png',
      fullPage: true
    });

    console.log('\n5. Checking result...');
    const body = await page.textContent('body');

    if (body.includes('Success') || body.includes('activated_by_user_id')) {
      console.log('✅ SUCCESS! Columns added.');
    } else if (body.includes('already exists')) {
      console.log('✅ Columns already exist.');
    } else if (body.includes('Error')) {
      console.log('❌ Error - check screenshot');
    } else {
      console.log('⚠️  Check screenshot');
    }

    console.log('\nBrowser will stay open. Press Ctrl+C to close.\n');
    await page.waitForTimeout(300000);

  } catch (error) {
    console.error('\n❌ Error:', error.message);

    try {
      await page.screenshot({
        path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/final-error.png'
      });
    } catch (e) {}

    console.log('Browser will stay open. Press Ctrl+C to close.\n');
    await page.waitForTimeout(300000);
  } finally {
    await context.close();
  }
})();
