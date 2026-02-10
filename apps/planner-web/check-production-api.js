const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Checking production API endpoints...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const page = await context.newPage();

  try {
    // Monitor network requests
    const requests = [];

    page.on('request', request => {
      const url = request.url();
      if (url.includes('supabase.co') || url.includes('/api/trial')) {
        requests.push({
          url,
          method: request.method(),
          headers: request.headers()
        });
        console.log(`\n📡 REQUEST: ${request.method()} ${url}`);
      }
    });

    page.on('response', async response => {
      const url = response.url();
      if (url.includes('supabase.co') || url.includes('/api/trial')) {
        console.log(`\n📥 RESPONSE: ${response.status()} ${url}`);

        // Extract Supabase project ID from URL
        const match = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
        if (match) {
          console.log(`   🎯 Supabase Project ID: ${match[1]}`);
        }
      }
    });

    console.log('1. Navigating to signup page...\n');
    await page.goto('https://nvoim-planner-pro.vercel.app/auth/signup');

    console.log('\n⏳ Waiting for API calls (10 seconds)...\n');
    await page.waitForTimeout(10000);

    console.log('\n📊 Summary:');
    console.log(`   Total requests captured: ${requests.length}`);

    const supabaseRequests = requests.filter(r => r.url.includes('supabase.co'));
    if (supabaseRequests.length > 0) {
      const projectIds = new Set();
      supabaseRequests.forEach(r => {
        const match = r.url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
        if (match) projectIds.add(match[1]);
      });

      console.log(`\n   🎯 Supabase Projects used:`);
      projectIds.forEach(id => {
        console.log(`      - ${id}`);
        if (id === 'ybcjkdcdruquqrdahtga') {
          console.log(`        ✅ This is OUR project (the one we modified)`);
        } else {
          console.log(`        ❌ This is a DIFFERENT project!`);
        }
      });
    }

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/production-api-check.png',
      fullPage: true
    });
    console.log('\n📸 Screenshot saved\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }

  process.exit(0);
})();
