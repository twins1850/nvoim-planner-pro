const { chromium } = require('playwright');

(async () => {
  console.log('Connecting to real Chrome browser...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  // Create new page for testing
  const page = await context.newPage();

  try {
    console.log('1. Navigating to landing page...');
    await page.goto('https://nvoim-planner-pro.vercel.app/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(3000);

    // Click trial signup button
    console.log('2. Clicking trial signup button...');
    try {
      await page.click('text=7일 무료 체험 시작하기', { timeout: 5000 });
      await page.waitForTimeout(3000);
      console.log('✅ Clicked trial button');
    } catch (e) {
      console.log('⚠️  Could not click button, navigating directly...');
      await page.goto('https://nvoim-planner-pro.vercel.app/auth/signup');
      await page.waitForTimeout(3000);
    }

    // Take screenshot
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/chrome-01-signup.png',
      fullPage: true
    });
    console.log('✅ Screenshot: chrome-01-signup.png');

    // Check trial eligibility
    const bodyText = await page.textContent('body');
    console.log('\n3. Checking trial eligibility...');

    if (bodyText.includes('이미 체험 라이선스를 사용')) {
      console.log('⚠️  Device already used trial');
      console.log('   This is a real Chrome browser, so this is expected if you tested before.');
    } else if (bodyText.includes('7일 무료 체험')) {
      console.log('✅ New device - trial eligible!');
    }

    // Fill form
    console.log('\n4. Filling out signup form...');
    const timestamp = Date.now();
    const testEmail = `realchrome${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';
    const testName = 'Real Chrome Test';

    await page.fill('#fullName', testName);
    console.log(`   - Name: ${testName}`);

    await page.fill('#email', testEmail);
    console.log(`   - Email: ${testEmail}`);

    await page.fill('#password', testPassword);
    console.log(`   - Password: ${testPassword}`);

    await page.fill('#confirmPassword', testPassword);
    console.log('   - Confirm Password: [filled]');

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/chrome-02-filled.png',
      fullPage: true
    });
    console.log('✅ Screenshot: chrome-02-filled.png');

    // Submit
    console.log('\n5. Submitting form...');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(10000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/chrome-03-result.png',
      fullPage: true
    });
    console.log('✅ Screenshot: chrome-03-result.png');

    // Check result
    const finalUrl = page.url();
    console.log(`\n6. Final URL: ${finalUrl}`);

    if (finalUrl.includes('/dashboard')) {
      console.log('✅ SUCCESS: Redirected to dashboard!');
    } else if (finalUrl.includes('/license')) {
      console.log('⚠️  Redirected to license page (no license available)');
    } else if (finalUrl === 'https://nvoim-planner-pro.vercel.app/') {
      console.log('⚠️  Redirected to home (signup might have issues)');
    } else {
      console.log('⚠️  Unexpected redirect - check screenshot');
    }

    console.log('\n✅ Test completed!');
    console.log('   Page and Chrome will stay open.');
    console.log('   Playwright disconnected.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/chrome-error.png',
      fullPage: true
    });
    console.log('\n   Page will stay open for inspection.');
  } finally {
    // Don't close page or browser - keep them open!
    console.log('Playwright disconnected (Chrome still running)');
  }
})();
