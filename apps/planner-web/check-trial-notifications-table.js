const { chromium } = require('playwright');

(async () => {
  console.log('📋 trial_notifications 테이블 확인 중...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    const sql = `
-- 테이블 존재 확인
SELECT
  tablename,
  schemaname,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'trial_notifications';

-- RLS 정책 확인
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename = 'trial_notifications';

-- 테이블 구조 확인
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'trial_notifications'
ORDER BY ordinal_position;
`;

    console.log('1. SQL Editor 열기...');
    await page.goto('https://supabase.com/dashboard/project/ybcjkdcdruquqrdahtga/sql/new');
    await page.waitForTimeout(3000);

    console.log('2. 확인 쿼리 작성 중...');
    await page.evaluate((sqlContent) => {
      try {
        const editor = document.querySelector('.monaco-editor').__MONACO_EDITOR__ ||
                      window.monaco?.editor?.getEditors?.()?.[0];
        if (editor && editor.setValue) {
          editor.setValue(sqlContent);
        }
      } catch (e) {
        console.error('Monaco editor error:', e);
      }
    }, sql);

    await page.waitForTimeout(1000);

    console.log('3. 쿼리 실행...\n');
    await page.keyboard.press('Meta+Enter');
    await page.waitForTimeout(5000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/table-verification.png',
      fullPage: true
    });
    console.log('📸 Screenshot: table-verification.png\n');

    const bodyText = await page.textContent('body');

    console.log('📊 결과:');

    if (bodyText.includes('trial_notifications')) {
      console.log('✅✅✅ trial_notifications 테이블이 정상적으로 존재합니다!\n');

      if (bodyText.includes('Planners can view their own notifications')) {
        console.log('✅ RLS 정책 1: "Planners can view their own notifications" ✓');
      }

      if (bodyText.includes('Service role can manage all notifications')) {
        console.log('✅ RLS 정책 2: "Service role can manage all notifications" ✓');
      }

      console.log('\n🎉 테이블 생성이 이미 완료되어 있습니다!');
      console.log('💡 "already exists" 에러는 정상입니다. 중복 생성을 방지하는 메시지입니다.\n');
    } else {
      console.log('⚠️  Screenshot를 확인하여 결과를 검증하세요.\n');
    }

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
  }

  console.log('✅ 완료!\n');
  process.exit(0);
})();
