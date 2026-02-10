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

    console.log('2. Searching for trial license by user email...');

    const sql = `-- freshtest 사용자로 생성된 체험 라이선스 찾기
SELECT
  l.id,
  l.license_key,
  l.status,
  l.is_trial,
  l.planner_id,
  l.activated_at,
  l.trial_started_at,
  l.created_at,
  l.device_tokens
FROM public.licenses l
WHERE l.is_trial = true
  AND l.trial_started_at >= '2026-01-28T09:56:00+00:00'::timestamptz
ORDER BY l.created_at DESC
LIMIT 5;

-- 또는 device_tokens에 해당 핑거프린트가 포함된 라이선스
SELECT
  id,
  license_key,
  status,
  planner_id,
  created_at,
  jsonb_array_length(device_tokens) as device_count
FROM public.licenses
WHERE device_tokens::text LIKE '%a3a428633c086331%'
LIMIT 5;`;

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
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/find-license.png',
      fullPage: true
    });
    console.log('✅ Screenshot: find-license.png');

    const bodyText = await page.textContent('body');

    console.log('\n📊 Result:');
    if (bodyText.includes('7D-5P-')) {
      console.log('✅ Trial license FOUND!');
      console.log('   The license was created successfully.');
      console.log('   Problem: License was not activated (planner_id not set)');
    } else if (bodyText.includes('0 rows') || !bodyText.includes('license_key')) {
      console.log('❌ NO trial license found!');
      console.log('   /api/trial/generate failed to create the license.');
      console.log('   Check server logs for errors.');
    } else {
      console.log('⚠️  Check screenshot for details');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }

  process.exit(0);
})();
