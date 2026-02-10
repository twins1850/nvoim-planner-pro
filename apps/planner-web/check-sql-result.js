const { chromium } = require('playwright');

(async () => {
  console.log('Connecting to Chrome...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('1. Opening SQL query page...');
    await page.goto('https://supabase.com/dashboard/project/ybcjkdcdruquqrdahtga/sql/2a4ee1ce-7fca-4154-9069-e672fcad7d44');

    await page.waitForTimeout(5000);

    // Take screenshot
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/sql-result.png',
      fullPage: true
    });
    console.log('✅ Screenshot: sql-result.png');

    // Check page content
    const bodyText = await page.textContent('body');

    console.log('\n2. Checking result...');

    if (bodyText.includes('Success')) {
      console.log('✅ Query executed successfully!');

      if (bodyText.includes('rows') || bodyText.includes('row')) {
        console.log('   Results returned.');
      }

      // Try to extract result details
      if (bodyText.includes('3 rows')) {
        console.log('   📊 3 rows returned');
      }
    } else if (bodyText.includes('Error')) {
      console.log('❌ Query error found - check screenshot');
    } else {
      console.log('⚠️  Result unclear - check screenshot');
    }

    console.log('\nChrome stays open. Check the screenshot for details.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/sql-result-error.png',
      fullPage: true
    });
  }

  process.exit(0);
})();
