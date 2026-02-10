const { chromium } = require('playwright');

(async () => {
  console.log('Connecting to Chrome...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('1. Taking screenshot of current page...');

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/current-page.png',
      fullPage: true
    });
    console.log('✅ Screenshot: current-page.png');

    const url = page.url();
    console.log(`   Current URL: ${url}`);

    // Try to extract result data from page
    const bodyText = await page.textContent('body');

    if (bodyText.includes('fingerprint_count') || bodyText.includes('empty_token_count')) {
      console.log('\n2. Found SQL result on page!');

      // Try to extract the actual numbers
      const resultMatch = bodyText.match(/fingerprint_count.*?(\d+)/);
      const tokenMatch = bodyText.match(/empty_token_count.*?(\d+)/);

      if (resultMatch) {
        console.log(`   fingerprint_count: ${resultMatch[1]}`);
      }
      if (tokenMatch) {
        console.log(`   empty_token_count: ${tokenMatch[1]}`);
      }
    } else if (bodyText.includes('Success') || bodyText.includes('성공')) {
      console.log('\n2. Query executed successfully!');
    }

    console.log('\n✅ Check complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }

  process.exit(0);
})();
