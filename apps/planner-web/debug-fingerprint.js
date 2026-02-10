const { chromium } = require('playwright');

(async () => {
  console.log('Connecting to Chrome...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('1. Navigating to signup page...');

    // Enable network monitoring
    await page.route('**/api/trial/check-eligibility', async (route, request) => {
      const postData = request.postDataJSON();
      console.log('\n🔍 API Request to /api/trial/check-eligibility:');
      console.log('   Device Fingerprint:', postData?.device_fingerprint?.substring(0, 16) + '...');

      // Continue with the request
      await route.continue();
    });

    // Capture response
    page.on('response', async (response) => {
      if (response.url().includes('/api/trial/check-eligibility')) {
        console.log('\n📥 API Response:');
        console.log('   Status:', response.status());
        try {
          const body = await response.json();
          console.log('   Body:', JSON.stringify(body, null, 2));
        } catch (e) {
          console.log('   Could not parse response');
        }
      }
    });

    await page.goto('https://nvoim-planner-pro.vercel.app/auth/signup', {
      waitUntil: 'networkidle'
    });

    console.log('\n2. Waiting for API call to complete...');
    await page.waitForTimeout(5000);

    // Also check database directly
    console.log('\n3. Checking database state...');

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/debug-fingerprint.png',
      fullPage: true
    });
    console.log('✅ Screenshot saved: debug-fingerprint.png\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }

  process.exit(0);
})();
