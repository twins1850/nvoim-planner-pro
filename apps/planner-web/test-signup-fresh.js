const { chromium } = require('playwright');

(async () => {
  console.log('Connecting to real Chrome browser...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  // Open NEW TAB (not reusing existing page)
  const page = await context.newPage();

  try {
    console.log('1. Opening fresh signup page in NEW TAB...');
    await page.goto('https://nvoim-planner-pro.vercel.app/', {
      waitUntil: 'networkidle'
    });

    console.log('2. Clicking trial signup button...');
    const trialButton = await page.waitForSelector('button:has-text("7일 무료 체험 시작하기"), a:has-text("7일 무료 체험 시작하기")');
    await trialButton.click();
    console.log('✅ Clicked trial button');

    await page.waitForTimeout(3000);
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/fresh-01-signup.png',
      fullPage: true
    });
    console.log('✅ Screenshot: fresh-01-signup.png');

    console.log('\n3. Checking trial eligibility...');
    const bodyText = await page.textContent('body');

    if (bodyText.includes('이미 체험 라이선스를 사용')) {
      console.log('❌ Device already used trial (still cached?)');
    } else if (bodyText.includes('무료 체험 시작')) {
      console.log('✅ Trial eligibility PASSED!');
      console.log('   Form is ready for signup');

      // Fill form
      console.log('\n4. Filling out signup form...');
      const timestamp = Date.now();
      await page.fill('input[type="text"]', 'Fresh Test');
      await page.fill('input[type="email"]', `freshtest${timestamp}@example.com`);
      await page.fill('input[type="password"]:first-of-type', 'TestPassword123!');
      await page.fill('input[type="password"]:last-of-type', 'TestPassword123!');
      console.log(`   - Email: freshtest${timestamp}@example.com`);

      await page.screenshot({
        path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/fresh-02-filled.png',
        fullPage: true
      });
      console.log('✅ Screenshot: fresh-02-filled.png');

      console.log('\n5. Submitting form...');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);

      await page.screenshot({
        path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/fresh-03-result.png',
        fullPage: true
      });
      console.log('✅ Screenshot: fresh-03-result.png');

      const finalUrl = page.url();
      console.log(`\n6. Final URL: ${finalUrl}`);

      if (finalUrl.includes('/dashboard')) {
        console.log('✅✅✅ TRIAL SIGNUP SUCCESS!');
        console.log('   User is now in dashboard!');
      } else if (finalUrl === 'https://nvoim-planner-pro.vercel.app/') {
        console.log('⚠️  Redirected to home (check for errors)');
      }
    }

    console.log('\n✅ Test completed!');
    console.log('   Tab will stay open.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/fresh-error.png',
      fullPage: true
    });
  }

  // Don't close - keep tab open
  console.log('Playwright disconnected (Chrome still running)');
  process.exit(0);
})();
