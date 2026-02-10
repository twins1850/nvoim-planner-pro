const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Checking browser console for errors...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  // Find the signup page
  const pages = context.pages();
  let signupPage = null;

  for (const page of pages) {
    const url = page.url();
    if (url.includes('nvoim-planner-pro')) {
      signupPage = page;
      break;
    }
  }

  if (!signupPage) {
    console.log('❌ No signup page found');
    process.exit(1);
  }

  console.log(`Current URL: ${signupPage.url()}\n`);

  // Enable console message collection
  const messages = [];
  signupPage.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    messages.push({ type, text });

    if (type === 'error' || text.includes('error') || text.includes('Error') || text.includes('failed') || text.includes('Failed')) {
      console.log(`🔴 [${type}] ${text}`);
    }
  });

  // Navigate to signup page
  console.log('1. Navigating to signup page...');
  await signupPage.goto('https://nvoim-planner-pro.vercel.app/auth/signup');
  await signupPage.waitForTimeout(5000);

  console.log('\n2. Console messages collected:');
  if (messages.length === 0) {
    console.log('   No console messages');
  } else {
    console.log(`   Total: ${messages.length} messages`);
    messages.forEach(({ type, text }) => {
      if (type === 'error' || text.includes('error')) {
        console.log(`   ❌ [${type}] ${text}`);
      }
    });
  }

  await signupPage.screenshot({
    path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/console-check.png',
    fullPage: true
  });
  console.log('\n📸 Screenshot saved\n');

  process.exit(0);
})();
