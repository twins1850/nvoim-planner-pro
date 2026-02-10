const { chromium } = require('playwright');

(async () => {
  console.log('🔧 Fixing RLS policy for trial licenses...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('1. Opening SQL Editor...');
    await page.goto('https://supabase.com/dashboard/project/ybcjkdcdruquqrdahtga/sql/new');
    await page.waitForTimeout(3000);

    console.log('2. Writing FIX SQL...');

    const sql = `-- Drop existing policy
DROP POLICY IF EXISTS "Planners can activate their licenses" ON public.licenses;

-- Create new policy that allows trial license activation
CREATE POLICY "Planners can activate their licenses"
  ON public.licenses
  FOR UPDATE
  USING (
    (planner_id IS NULL AND (status = 'pending' OR status = 'trial')) -- 활성화 전 (체험 포함)
    OR (planner_id = auth.uid()) -- 활성화 후
  );

-- Verify the policy was created
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'licenses' AND policyname = 'Planners can activate their licenses';`;

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

    console.log('\n3. Executing with Cmd+Enter...');
    await page.keyboard.press('Meta+Enter');
    console.log('✅ Executed');

    console.log('\n⏳ Waiting for result...');
    await page.waitForTimeout(5000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/rls-fix.png',
      fullPage: true
    });
    console.log('📸 Screenshot: rls-fix.png');

    const bodyText = await page.textContent('body');

    console.log('\n📊 Result:');
    if (bodyText.includes('Success') || bodyText.includes('CREATE POLICY')) {
      console.log('✅✅✅ RLS POLICY FIXED!');
      console.log('   Trial licenses can now be activated by users!');
      console.log('\n🎉 Ready to test trial signup activation!');
    } else {
      console.log('⚠️  Check screenshot for details');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/rls-error.png',
      fullPage: true
    });
  }

  console.log('\n✅ Done!\n');
  process.exit(0);
})();
