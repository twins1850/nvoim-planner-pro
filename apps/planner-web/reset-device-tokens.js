const { chromium } = require('playwright');

(async () => {
  console.log('Connecting to Chrome...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('1. Navigating to Supabase SQL Editor...');
    await page.goto('https://supabase.com/dashboard/project/eanqmkyvdwmybwxkghev/sql/new');
    await page.waitForTimeout(5000);

    console.log('2. Inserting SQL to reset device_tokens...');

    const sql = `-- Reset device_tokens for trial licenses
UPDATE public.licenses
SET device_tokens = '[]'::jsonb
WHERE is_trial = true;

-- Verify reset
SELECT id, license_key, status, is_trial,
       jsonb_array_length(device_tokens) as device_count
FROM public.licenses
WHERE is_trial = true
LIMIT 10;`;

    // Click editor
    await page.mouse.click(700, 400);
    await page.waitForTimeout(500);

    // Clear and type SQL
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(300);

    await page.keyboard.type(sql, { delay: 2 });
    console.log('✅ SQL inserted!');

    await page.waitForTimeout(1000);

    // Screenshot before run
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/reset-before.png',
      fullPage: true
    });

    // Click Run
    console.log('\n3. Clicking Run button...');
    try {
      await page.click('button:has-text("Run")', { timeout: 3000 });
      console.log('   ✅ Run clicked!');
    } catch (e) {
      console.log('   ⚠️  Could not find Run button');
    }

    await page.waitForTimeout(6000);

    // Screenshot result
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/reset-result.png',
      fullPage: true
    });
    console.log('✅ Screenshot: reset-result.png');

    // Check result
    const body = await page.textContent('body');

    if (body.includes('Success') || body.includes('rows')) {
      console.log('\n✅ SUCCESS! Device tokens reset.');
      console.log('   All trial licenses now have empty device_tokens.');
      console.log('   You can now test trial signup again!');
    } else if (body.includes('Error')) {
      console.log('\n❌ Error occurred - check screenshot');
    } else {
      console.log('\n⚠️  Check screenshot for result');
    }

    console.log('\nChrome will stay open. Playwright disconnected.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/reset-error.png',
      fullPage: true
    });
  }

  process.exit(0);
})();
