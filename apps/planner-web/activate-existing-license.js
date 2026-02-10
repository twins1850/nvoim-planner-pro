const { chromium } = require('playwright');

(async () => {
  console.log('🎯 Activating existing trial license...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('1. Opening SQL Editor...');
    await page.goto('https://supabase.com/dashboard/project/ybcjkdcdruquqrdahtga/sql/new');
    await page.waitForTimeout(3000);

    console.log('2. Activating license 7D-5P-XDL7NH...');

    const sql = `-- 1. Get the user ID for freshtest1769594216947@example.com
WITH user_info AS (
  SELECT id, email FROM auth.users WHERE email = 'freshtest1769594216947@example.com'
)
-- 2. Activate the license
UPDATE public.licenses
SET
  planner_id = (SELECT id FROM user_info),
  activated_at = NOW(),
  activated_by_user_id = (SELECT id FROM user_info),
  status = 'trial'
WHERE license_key = '7D-5P-XDL7NH'
RETURNING id, license_key, status, planner_id, activated_at;`;

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

    console.log('\n3. Executing...');
    await page.keyboard.press('Meta+Enter');
    await page.waitForTimeout(5000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/license-activated.png',
      fullPage: true
    });
    console.log('📸 Screenshot: license-activated.png');

    const bodyText = await page.textContent('body');

    console.log('\n📊 Result:');
    if (bodyText.includes('7D-5P-XDL7NH') && bodyText.includes('trial')) {
      console.log('✅✅✅ LICENSE ACTIVATED!');
      console.log('   License: 7D-5P-XDL7NH');
      console.log('   User: freshtest1769594216947@example.com');
      console.log('\n🎉 User can now access the dashboard!');
      console.log('   Try logging in with that account.');
    } else {
      console.log('⚠️  Check screenshot for details');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }

  console.log('\n✅ Done!\n');
  process.exit(0);
})();
