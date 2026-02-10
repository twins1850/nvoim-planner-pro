const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('Opening Chrome browser...\n');

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false
  });

  const page = await browser.newPage();

  console.log('Opening Supabase SQL Editor...');
  await page.goto('https://supabase.com/dashboard/project/eanqmkyvdwmybwxkghev/sql/new');

  console.log('\n✅ Browser opened!');
  console.log('   Please login if needed.');
  console.log('   Browser will stay open indefinitely.');
  console.log('   Press Ctrl+C to close.\n');

  // Keep open forever
  await page.waitForTimeout(86400000); // 24 hours
})();
