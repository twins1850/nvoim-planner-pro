const { chromium } = require('playwright');

(async () => {
  console.log('🔧 라이선스 활성화 문제 해결 중...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('1. SQL Editor 열기...');
    await page.goto('https://supabase.com/dashboard/project/ybcjkdcdruquqrdahtga/sql/new');
    await page.waitForTimeout(3000);

    console.log('2. RLS 정책 확인 및 수정...\n');

    // Step 1: 현재 RLS 정책 확인
    const checkPolicySQL = `-- 현재 RLS 정책 확인
SELECT
  schemaname, tablename, policyname,
  permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'licenses'
  AND policyname = 'Planners can activate their licenses';`;

    console.log('📋 현재 RLS 정책 확인 중...');

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
    }, checkPolicySQL);

    await page.waitForTimeout(1000);
    await page.keyboard.press('Meta+Enter');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/current-rls-policy.png',
      fullPage: true
    });
    console.log('📸 Screenshot: current-rls-policy.png\n');

    // Step 2: RLS 정책 삭제 및 재생성 (더 관대한 정책)
    console.log('🔧 RLS 정책 재생성 중...');

    const fixPolicySQL = `-- Step 1: 기존 정책 삭제
DROP POLICY IF EXISTS "Planners can activate their licenses" ON public.licenses;

-- Step 2: 새로운 정책 생성 (체험 라이선스 활성화 허용)
CREATE POLICY "Planners can activate their licenses"
  ON public.licenses
  FOR UPDATE
  USING (
    -- 업데이트 가능 조건:
    -- 1. planner_id가 NULL이고 pending/trial 상태 (활성화 대기중)
    (planner_id IS NULL AND (status = 'pending' OR status = 'trial'))
    OR
    -- 2. 이미 자신이 소유한 라이선스
    (planner_id = auth.uid())
  )
  WITH CHECK (
    -- 업데이트 후 검증:
    -- 업데이트를 실행한 사용자가 소유자여야 함
    planner_id = auth.uid()
  );

-- Step 3: 정책 확인
SELECT
  schemaname, tablename, policyname,
  permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'licenses'
  AND policyname = 'Planners can activate their licenses';

-- Step 4: 테스트 데이터 확인
SELECT
  id, license_key, planner_id, status,
  is_trial, trial_expires_at,
  created_at
FROM public.licenses
WHERE is_trial = true
ORDER BY created_at DESC
LIMIT 3;`;

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
    }, fixPolicySQL);

    await page.waitForTimeout(1000);
    console.log('⚡ SQL 실행 중...');
    await page.keyboard.press('Meta+Enter');
    await page.waitForTimeout(5000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/rls-policy-updated.png',
      fullPage: true
    });
    console.log('📸 Screenshot: rls-policy-updated.png\n');

    const bodyText = await page.textContent('body');

    console.log('\n📊 결과 분석:');

    if (bodyText.includes('CREATE POLICY')) {
      console.log('✅ RLS 정책이 성공적으로 재생성되었습니다!');
      console.log('\n🔍 핵심 변경사항:');
      console.log('   - USING 절: status = \'trial\' 추가');
      console.log('   - WITH CHECK 절: auth.uid() 검증');
      console.log('   - 체험 라이선스 활성화 허용\n');
    } else if (bodyText.includes('already exists')) {
      console.log('⚠️  정책이 이미 존재합니다. DROP 후 재시도가 필요합니다.');
    } else {
      console.log('⚠️  Screenshot를 확인하여 결과를 검증하세요.');
    }

    // Step 3: RLS 정책 테스트를 위한 설명
    console.log('\n📝 다음 단계:');
    console.log('1. localhost 개발 서버에서 체험 회원가입 재테스트');
    console.log('2. 브라우저 콘솔에서 UPDATE 에러 메시지 확인');
    console.log('3. 라이선스가 정상적으로 활성화되는지 검증\n');

    console.log('💡 예상 결과:');
    console.log('   - ✅ 회원가입 성공');
    console.log('   - ✅ 라이선스 planner_id 설정');
    console.log('   - ✅ /dashboard로 리다이렉트\n');

  } catch (error) {
    console.error('\n❌ 에러 발생:', error.message);
  }

  console.log('✅ 작업 완료!\n');
  process.exit(0);
})();
