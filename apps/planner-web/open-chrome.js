const { chromium } = require('playwright');

(async () => {
  console.log('Opening Chrome browser...\n');

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false
  });

  const page = await browser.newPage();

  console.log('Navigating to Supabase SQL Editor...');
  await page.goto('https://supabase.com/dashboard/project/eanqmkyvdwmybwxkghev/sql/new');

  console.log('\n✅ Chrome opened!');
  console.log('   Browser will stay open.');
  console.log('   Press Ctrl+C in terminal when you want to close it.\n');

  // Keep browser open indefinitely
  await page.waitForTimeout(3600000); // 1 hour
})();
