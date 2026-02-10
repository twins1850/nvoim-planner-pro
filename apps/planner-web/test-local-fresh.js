const { chromium } = require('playwright');

(async () => {
  console.log('🧪 Testing trial signup on LOCALHOST (with cache clear)...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  // Clear cookies and cache
  await context.clearCookies();
  console.log('✅ Cookies cleared');

  const page = await context.newPage();

  try {
    console.log('\n1. Opening localhost:3000 with hard refresh...');

    // Navigate with no-cache header
    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Force reload (Cmd+Shift+R)
    await page.reload({ waitUntil: 'networkidle' });
    console.log('✅ Local site loaded (cache bypassed)');

    console.log('\n2. Clicking trial signup button...');
    const trialButton = await page.waitForSelector('button:has-text("7일 무료 체험 시작하기"), a:has-text("7일 무료 체험 시작하기")', { timeout: 10000 });
    await trialButton.click();
    console.log('✅ Clicked trial button');

    await page.waitForTimeout(3000);

    console.log('\n3. Checking trial eligibility...');
    const bodyText = await page.textContent('body');

    if (bodyText.includes('이미 체험 라이선스를 사용')) {
      console.log('❌ Device already used trial');

      await page.screenshot({
        path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/local-blocked.png',
        fullPage: true
      });

      console.log('\n🔍 This means:');
      console.log('   1. Database DELETE did not work, OR');
      console.log('   2. New fingerprint was immediately created, OR');
      console.log('   3. API is caching the response');

    } else if (bodyText.includes('무료 체험 시작')) {
      console.log('✅✅ Trial eligibility PASSED!');

      // Fill form
      console.log('\n4. Filling out signup form...');
      const timestamp = Date.now();
      const email = `localtest${timestamp}@example.com`;

      await page.fill('#fullName', 'Local Test User');
      await page.fill('#email', email);
      await page.fill('#password', 'TestPassword123!');
      await page.fill('#confirmPassword', 'TestPassword123!');
      console.log(`   ✅ Email: ${email}`);

      await page.screenshot({
        path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/local-filled.png',
        fullPage: true
      });

      console.log('\n5. Submitting form...');
      await page.click('button[type="submit"]');
      console.log('✅ Form submitted');

      console.log('\n⏳ Waiting for signup to complete (15 seconds)...');
      await page.waitForTimeout(15000);

      await page.screenshot({
        path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/local-result.png',
        fullPage: true
      });

      const finalUrl = page.url();
      console.log(`\n6. Final URL: ${finalUrl}`);

      if (finalUrl.includes('/dashboard')) {
        console.log('\n🎉🎉🎉 SUCCESS! USER IS IN DASHBOARD!');
        console.log('   Trial license was activated successfully!');
        console.log('   ✅ The RLS fix is working!');
      } else if (finalUrl.includes('/license')) {
        console.log('\n⚠️  Redirected to license page');
        console.log('   License activation might have failed');
      } else {
        console.log(`\n⚠️  Unexpected redirect: ${finalUrl}`);
      }
    }

    console.log('\n✅ Test completed!');
    console.log('   Tab will stay open.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/local-error.png',
      fullPage: true
    });
  }

  console.log('Playwright disconnected (Chrome still running)');
  process.exit(0);
})();
