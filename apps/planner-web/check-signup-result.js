const { chromium } = require('playwright');

(async () => {
  console.log('Connecting to Chrome...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('1. Opening SQL Editor...');
    await page.goto('https://supabase.com/dashboard/project/ybcjkdcdruquqrdahtga/sql/new');
    await page.waitForTimeout(3000);

    console.log('2. Checking signup result...');

    const sql = `-- 1. 최근 생성된 사용자 확인 (이메일에 freshtest 포함)
SELECT id, email, created_at
FROM auth.users
WHERE email LIKE '%freshtest%'
ORDER BY created_at DESC
LIMIT 3;

-- 2. 해당 사용자의 프로필 확인
SELECT id, email, full_name, role, created_at
FROM public.profiles
WHERE email LIKE '%freshtest%'
ORDER BY created_at DESC
LIMIT 3;

-- 3. 최근 생성된 체험 라이선스 확인
SELECT id, license_key, status, is_trial, planner_id,
       trial_started_at, activated_at, created_at
FROM public.licenses
WHERE is_trial = true
ORDER BY created_at DESC
LIMIT 5;

-- 4. trial_device_fingerprints 확인
SELECT id, device_fingerprint, first_trial_at, trial_user_email
FROM public.trial_device_fingerprints
ORDER BY first_trial_at DESC
LIMIT 3;`;

    // Use Monaco Editor API
    await page.evaluate((sqlContent) => {
      try {
        const editor = document.querySelector('.monaco-editor').__MONACO_EDITOR__ ||
                      window.monaco?.editor?.getEditors?.()?.[0];
        if (editor && editor.setValue) {
          editor.setValue(sqlContent);
        }
      } catch (e) {}
    }, sql);

    console.log('✅ SQL written');
    await page.waitForTimeout(1000);

    console.log('\n3. Running query...');
    await page.keyboard.press('Meta+Enter');
    await page.waitForTimeout(5000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/signup-check.png',
      fullPage: true
    });
    console.log('✅ Screenshot: signup-check.png');

    const bodyText = await page.textContent('body');

    console.log('\n📊 Analysis:');

    if (bodyText.includes('freshtest')) {
      console.log('✅ User was created in auth.users');
    } else {
      console.log('❌ User NOT found in auth.users');
    }

    if (bodyText.includes('7D-5P-')) {
      console.log('✅ Trial license was created');
    } else {
      console.log('❌ Trial license NOT created');
    }

    console.log('\n👉 Check screenshot for details');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }

  process.exit(0);
})();
