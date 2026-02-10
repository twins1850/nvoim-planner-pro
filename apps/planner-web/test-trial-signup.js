const { chromium } = require('playwright');

(async () => {
  // Launch browser with completely fresh profile (no cookies, no localStorage)
  const browser = await chromium.launch({
    headless: false
  });

  // Use iPhone emulation to get a completely different device fingerprint
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    storageState: undefined,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul'
  });

  const page = await context.newPage();

  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const logEntry = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(logEntry);
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(logEntry);
    }
  });

  // Capture network requests
  const requests = [];
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      requests.push({ url: request.url(), method: request.method() });
    }
  });

  page.on('response', async response => {
    if (response.url().includes('/api/')) {
      const status = response.status();
      const url = response.url();
      console.log(`   API Response: ${status} ${url}`);
      if (status >= 400) {
        try {
          const body = await response.text();
          console.log(`   Error body: ${body.substring(0, 200)}`);
        } catch (e) {}
      }
    }
  });

  try {
    console.log('1. Navigating to signup page...');
    await page.goto('https://nvoim-planner-pro.vercel.app/auth/signup', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    // Take screenshot of initial page
    await page.screenshot({ path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/01-signup-page.png' });
    console.log('✅ Screenshot saved: 01-signup-page.png');

    // Check for trial eligibility message
    const trialMessage = await page.textContent('body');
    console.log('\n2. Checking trial eligibility...');

    if (trialMessage.includes('이미 체험 라이선스를 사용하셨습니다')) {
      console.log('⚠️ Device already used trial (expected in non-incognito)');
    } else if (trialMessage.includes('7일 무료 체험') || trialMessage.includes('최대 5명')) {
      console.log('✅ Trial eligibility confirmed - new device detected');
    }

    // Fill out signup form
    console.log('\n3. Filling out signup form...');
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';
    const testName = 'Test User';

    // Fill name field
    await page.fill('#fullName', testName);
    console.log(`   - Name: ${testName}`);

    // Fill email field
    await page.fill('#email', testEmail);
    console.log(`   - Email: ${testEmail}`);

    // Fill password field
    await page.fill('#password', testPassword);
    console.log(`   - Password: ${testPassword}`);

    // Fill confirm password field
    await page.fill('#confirmPassword', testPassword);
    console.log('   - Confirm Password: [filled]');

    await page.screenshot({ path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/02-form-filled.png' });
    console.log('✅ Screenshot saved: 02-form-filled.png');

    // Click signup button
    console.log('\n4. Submitting signup form...');
    console.log('   Clicking submit button...');
    await page.click('button[type="submit"]');

    // Wait for navigation or response (longer timeout)
    console.log('   Waiting for response...');
    await page.waitForTimeout(10000);

    await page.screenshot({ path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/03-after-submit.png' });
    console.log('✅ Screenshot saved: 03-after-submit.png');

    // Check current URL and page content
    const currentUrl = page.url();
    console.log(`\n5. Current URL: ${currentUrl}`);

    const bodyText = await page.textContent('body');

    // Check for error message on page
    const errorElement = await page.$('.bg-red-50, .text-red-800, [class*="error"]');
    if (errorElement) {
      const errorText = await errorElement.textContent();
      console.log('❌ ERROR on page:', errorText);
    }

    // Check for success indicators
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ SUCCESS: Redirected to dashboard');
    } else if (bodyText.includes('확인') && bodyText.includes('이메일')) {
      console.log('✅ SUCCESS: Email confirmation required');
    } else if (bodyText.includes('실패') || bodyText.includes('error') || bodyText.includes('Error')) {
      console.log('❌ ERROR: Signup failed');
      console.log('Error content:', bodyText.substring(0, 500));
    } else if (currentUrl.includes('/auth/signup') && bodyText.includes('Test User')) {
      console.log('⚠️ Still on signup page - form not submitted or error occurred');
    } else {
      console.log('⚠️ Unexpected state - check screenshot');
    }

    // Print console logs summary
    console.log('\n6. Console Logs Summary:');
    const errorLogs = consoleLogs.filter(log => log.includes('[error]'));
    if (errorLogs.length > 0) {
      console.log(`   Errors found: ${errorLogs.length}`);
      errorLogs.forEach(log => console.log(`   ${log}`));
    } else {
      console.log('   No errors in console');
    }

    console.log('\n7. Test completed');
    console.log('   Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ Test error:', error.message);
    await page.screenshot({ path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/error-screenshot.png' });
    console.log('Error screenshot saved');
  } finally {
    await browser.close();
  }
})();
