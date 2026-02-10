const { chromium } = require('playwright');

(async () => {
  console.log('🔍 현재 데이터베이스 상태 확인...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('1. SQL Editor 열기...');
    await page.goto('https://supabase.com/dashboard/project/ybcjkdcdruquqrdahtga/sql/new');
    await page.waitForTimeout(3000);

    const checkSQL = `-- 1. trial_device_fingerprints 확인
SELECT COUNT(*) as fingerprint_count
FROM public.trial_device_fingerprints;

-- 2. 최근 trial 라이선스 확인
SELECT
  id, license_key, planner_id, status,
  is_trial, created_at, activated_at
FROM public.licenses
WHERE is_trial = true
ORDER BY created_at DESC
LIMIT 5;

-- 3. testuser로 시작하는 최근 사용자 확인
SELECT
  id, email, created_at
FROM auth.users
WHERE email LIKE 'testuser%'
ORDER BY created_at DESC
LIMIT 5;

-- 4. 가장 최근 생성된 라이선스 (모든 타입)
SELECT
  id, license_key, planner_id, status,
  is_trial, created_at, activated_at
FROM public.licenses
ORDER BY created_at DESC
LIMIT 5;`;

    console.log('2. SQL 작성 중...');

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
    }, checkSQL);

    await page.waitForTimeout(1000);

    console.log('3. SQL 실행...\n');
    await page.keyboard.press('Meta+Enter');
    await page.waitForTimeout(5000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/current-db-state.png',
      fullPage: true
    });
    console.log('📸 Screenshot: current-db-state.png\n');

    const bodyText = await page.textContent('body');

    console.log('📊 분석:');

    if (bodyText.includes('fingerprint_count') && bodyText.includes('0')) {
      console.log('✅ trial_device_fingerprints 테이블이 비어있습니다.');
    } else if (bodyText.includes('fingerprint_count')) {
      console.log('⚠️  trial_device_fingerprints에 레코드가 여전히 존재합니다!');
    }

    if (bodyText.includes('testuser')) {
      console.log('✅ testuser 계정들이 생성되었습니다.');

      // 최신 사용자 ID 추출 시도
      if (bodyText.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/)) {
        console.log('   사용자 UUID가 표시되어 있습니다.');
      }
    }

    if (bodyText.includes('planner_id') && bodyText.includes('NULL')) {
      console.log('⚠️  planner_id가 NULL인 라이선스가 있습니다 (활성화 실패)');
    } else if (bodyText.includes('planner_id')) {
      console.log('✅ planner_id가 설정된 라이선스가 있습니다 (활성화 성공)');
    }

    console.log('\n💡 Screenshot를 확인하여 자세한 내용을 파악하세요.\n');

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
  }

  console.log('✅ 완료!\n');
  process.exit(0);
})();
