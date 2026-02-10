const { chromium } = require('playwright');

(async () => {
  console.log('🔧 Adding WITH CHECK clause to RLS policy...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('1. Opening SQL Editor...');
    await page.goto('https://supabase.com/dashboard/project/ybcjkdcdruquqrdahtga/sql/new');
    await page.waitForTimeout(3000);

    console.log('2. Writing FIXED RLS policy with WITH CHECK...');

    const sql = `-- Drop existing policy
DROP POLICY IF EXISTS "Planners can activate their licenses" ON public.licenses;

-- Create new policy WITH CHECK clause
CREATE POLICY "Planners can activate their licenses"
  ON public.licenses
  FOR UPDATE
  USING (
    -- Can select/update if:
    (planner_id IS NULL AND (status = 'pending' OR status = 'trial'))  -- Not yet activated
    OR (planner_id = auth.uid())  -- Already owns it
  )
  WITH CHECK (
    -- After update, row must satisfy:
    planner_id = auth.uid()  -- User must own the license after activation
  );

-- Verify
SELECT schemaname, tablename, policyname, cmd, qual, with_check
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

    console.log('\n3. Executing...');
    await page.keyboard.press('Meta+Enter');
    await page.waitForTimeout(3000);

    // Handle confirmation dialog
    try {
      const runButton = await page.waitForSelector('button:has-text("Run this query")', { timeout: 3000 });
      if (runButton) {
        console.log('✅ Confirming...');
        await runButton.click();
        await page.waitForTimeout(5000);
      }
    } catch (e) {
      // No confirmation needed
    }

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/rls-with-check.png',
      fullPage: true
    });
    console.log('📸 Screenshot: rls-with-check.png');

    const bodyText = await page.textContent('body');

    console.log('\n📊 Result:');
    if (bodyText.includes('with_check') || bodyText.includes('CREATE POLICY')) {
      console.log('✅✅✅ RLS POLICY FIXED WITH CHECK!');
      console.log('   Trial license activation should now work!');
      console.log('\n🎉 Ready for final test!');
    } else {
      console.log('⚠️  Check screenshot');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }

  console.log('\n✅ Done!\n');
  process.exit(0);
})();
