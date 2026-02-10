const { chromium } = require('playwright');

(async () => {
  console.log('🔧 Fixing RLS policy with confirmation...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('1. Looking for confirmation dialog...');

    // Wait for "Run this query" button
    const runButton = await page.waitForSelector('button:has-text("Run this query")', { timeout: 5000 });

    if (runButton) {
      console.log('✅ Found confirmation dialog');
      console.log('\n2. Clicking "Run this query"...');

      await runButton.click();
      console.log('✅ Confirmed!');

      console.log('\n⏳ Waiting for query to execute...');
      await page.waitForTimeout(5000);

      await page.screenshot({
        path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/rls-fixed.png',
        fullPage: true
      });
      console.log('📸 Screenshot: rls-fixed.png');

      const bodyText = await page.textContent('body');

      console.log('\n📊 Result:');
      if (bodyText.includes('Success') || bodyText.includes('Planners can activate')) {
        console.log('✅✅✅ RLS POLICY FIXED!');
        console.log('   Trial licenses can now be activated!');
        console.log('\n🎉 Now we need to manually activate the existing license');
        console.log('   OR test with a new signup');
      } else {
        console.log('⚠️  Check screenshot');
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/rls-error2.png',
      fullPage: true
    });
  }

  console.log('\n✅ Done!\n');
  process.exit(0);
})();
