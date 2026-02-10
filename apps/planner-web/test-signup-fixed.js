const { chromium } = require('playwright');

(async () => {
  console.log('Connecting to real Chrome browser...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  // Open NEW TAB
  const page = await context.newPage();

  try {
    console.log('1. Opening signup page...');
    await page.goto('https://nvoim-planner-pro.vercel.app/', {
      waitUntil: 'networkidle'
    });

    console.log('2. Clicking trial signup button...');
    const trialButton = await page.waitForSelector('button:has-text("7일 무료 체험 시작하기"), a:has-text("7일 무료 체험 시작하기")');
    await trialButton.click();
    console.log('✅ Clicked trial button');

    await page.waitForTimeout(3000);

    console.log('\n3. Checking trial eligibility...');
    const bodyText = await page.textContent('body');

    if (bodyText.includes('이미 체험 라이선스를 사용')) {
      console.log('❌ Device already used trial');
      return;
    }

    console.log('✅ Trial eligibility PASSED!');

    // Fill form with PRECISE selectors
    console.log('\n4. Filling out signup form...');
    const timestamp = Date.now();
    const email = `freshtest${timestamp}@example.com`;

    // Use ID selectors for accuracy
    await page.fill('#fullName', 'Fresh Test User');
    console.log('   ✅ Name filled');

    await page.fill('#email', email);
    console.log(`   ✅ Email filled: ${email}`);

    await page.fill('#password', 'TestPassword123!');
    console.log('   ✅ Password filled');

    await page.fill('#confirmPassword', 'TestPassword123!');
    console.log('   ✅ Confirm Password filled');

    await page.waitForTimeout(1000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/signup-filled.png',
      fullPage: true
    });
    console.log('📸 Screenshot: signup-filled.png');

    console.log('\n5. Submitting form...');
    await page.click('button[type="submit"]');
    console.log('✅ Form submitted');

    console.log('\n⏳ Waiting for signup to complete (15 seconds)...');
    await page.waitForTimeout(15000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/signup-result.png',
      fullPage: true
    });
    console.log('📸 Screenshot: signup-result.png');

    const finalUrl = page.url();
    console.log(`\n6. Final URL: ${finalUrl}`);

    if (finalUrl.includes('/dashboard')) {
      console.log('\n🎉🎉🎉 TRIAL SIGNUP SUCCESS!!!');
      console.log('   User is now in the dashboard!');
      console.log('   Trial license has been activated!');
    } else if (finalUrl.includes('/auth/signup')) {
      console.log('\n⚠️  Still on signup page');
      console.log('   Check screenshot for errors');
    } else if (finalUrl === 'https://nvoim-planner-pro.vercel.app/') {
      console.log('\n⚠️  Redirected to home page');
      console.log('   Possible signup error');
    }

    console.log('\n✅ Test completed!');
    console.log('   Tab will stay open.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/signup-error.png',
      fullPage: true
    });
  }

  console.log('Playwright disconnected (Chrome still running)');
  process.exit(0);
})();
