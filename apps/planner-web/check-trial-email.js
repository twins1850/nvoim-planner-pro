const { chromium } = require('playwright');

(async () => {
  console.log('📧 Gmail 이메일 확인 중...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('Step 1: Gmail 이메일 페이지로 이동...');
    await page.goto('https://mail.google.com/mail/u/0/#inbox/FMfcgzQfBZlQvqKhPkbSkJxJFwpxkxnL');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/gmail-email.png',
      fullPage: true
    });
    console.log('📸 Screenshot: gmail-email.png\n');

    console.log('Step 2: 이메일 내용 추출 중...');

    // 이메일 제목 추출
    const subject = await page.locator('h2').first().textContent().catch(() => '제목 없음');
    console.log('📧 제목:', subject);
    console.log('');

    // 이메일 본문 추출
    const bodyText = await page.locator('[role="main"]').textContent().catch(() => '');
    console.log('📄 본문 일부:');
    console.log(bodyText.substring(0, 500));
    console.log('...\n');

    // 에러 메시지나 이상한 부분 찾기
    const hasUndefined = bodyText.includes('undefined');
    const hasNull = bodyText.includes('null');
    const hasError = bodyText.includes('Error') || bodyText.includes('error');
    const hasMissing = bodyText.includes('[object Object]');

    console.log('🔍 에러 체크:');
    console.log('  - undefined 포함:', hasUndefined ? '⚠️  예' : '✅ 아니오');
    console.log('  - null 포함:', hasNull ? '⚠️  예' : '✅ 아니오');
    console.log('  - Error 포함:', hasError ? '⚠️  예' : '✅ 아니오');
    console.log('  - [object Object] 포함:', hasMissing ? '⚠️  예' : '✅ 아니오');
    console.log('');

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
  }

  console.log('✅ 완료!\n');
  process.exit(0);
})();
