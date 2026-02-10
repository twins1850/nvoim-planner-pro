const { chromium } = require('playwright');

(async () => {
  console.log('🔧 RLS 정책 수정 (확인 버튼 클릭)...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('1. "Run this query" 버튼 찾는 중...');

    // 확인 버튼 클릭
    try {
      const runButton = await page.waitForSelector('button:has-text("Run this query")', { timeout: 3000 });
      if (runButton) {
        console.log('✅ 확인 버튼 발견!');
        await runButton.click();
        console.log('⚡ 쿼리 실행 중...\n');
        await page.waitForTimeout(5000);
      }
    } catch (e) {
      console.log('⚠️  확인 버튼이 없거나 이미 실행되었습니다.');
    }

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/rls-policy-confirmed.png',
      fullPage: true
    });
    console.log('📸 Screenshot: rls-policy-confirmed.png\n');

    const bodyText = await page.textContent('body');

    console.log('📊 결과 확인:');

    if (bodyText.includes('Success') || bodyText.includes('CREATE POLICY')) {
      console.log('✅✅✅ RLS 정책 수정 완료!\n');
      console.log('📋 변경 내용:');
      console.log('   - DROP POLICY: 기존 정책 삭제');
      console.log('   - CREATE POLICY: 새 정책 생성');
      console.log('   - USING: status = \'trial\' 조건 추가');
      console.log('   - WITH CHECK: auth.uid() 검증\n');
    } else if (bodyText.includes('Error') || bodyText.includes('error')) {
      console.log('❌ 에러 발생! Screenshot를 확인하세요.\n');
    } else {
      console.log('⚠️  결과를 Screenshot에서 확인하세요.\n');
    }

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
  }

  console.log('✅ 완료!\n');
  process.exit(0);
})();
