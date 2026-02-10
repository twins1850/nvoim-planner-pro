const { chromium } = require('playwright');

(async () => {
  console.log('🔧 Vercel 환경 변수 자동 추가 중...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    // CRON_SECRET 생성 (랜덤 문자열)
    const cronSecret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    console.log('📋 추가할 환경 변수:');
    console.log('');
    console.log('1. CRON_SECRET =', cronSecret);
    console.log('   (이 값을 기록해두세요!)');
    console.log('');

    // 환경 변수 페이지로 이동
    console.log('Step 1: Vercel 환경 변수 페이지 확인...');
    await page.goto('https://vercel.com/twins1850s-projects/nvoim-planner-pro/settings/environment-variables', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // 현재 환경 변수 확인
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/vercel-env-before.png',
      fullPage: true
    });
    console.log('📸 Before: vercel-env-before.png\n');

    // CRON_SECRET 추가
    console.log('Step 2: CRON_SECRET 추가 중...');

    // "Add New" 버튼 클릭 (여러 가능한 선택자 시도)
    try {
      await page.click('button:has-text("Add New")');
    } catch (e) {
      await page.click('text=Add New');
    }
    await page.waitForTimeout(2000);

    // Key 입력
    await page.fill('input[name="key"], input[placeholder*="KEY"], input[placeholder*="Name"]', 'CRON_SECRET');
    await page.waitForTimeout(500);

    // Value 입력
    await page.fill('input[name="value"], textarea[name="value"], input[placeholder*="VALUE"], textarea[placeholder*="Value"]', cronSecret);
    await page.waitForTimeout(500);

    // Environment 선택 (Production, Preview, Development 모두)
    try {
      // Production 체크박스
      const productionCheckbox = await page.locator('label:has-text("Production")').locator('input[type="checkbox"]');
      if (productionCheckbox) {
        await productionCheckbox.check();
      }

      // Preview 체크박스
      const previewCheckbox = await page.locator('label:has-text("Preview")').locator('input[type="checkbox"]');
      if (previewCheckbox) {
        await previewCheckbox.check();
      }

      // Development 체크박스
      const developmentCheckbox = await page.locator('label:has-text("Development")').locator('input[type="checkbox"]');
      if (developmentCheckbox) {
        await developmentCheckbox.check();
      }
    } catch (e) {
      console.log('⚠️  Environment 체크박스 자동 선택 실패. 수동으로 선택해주세요.');
    }

    await page.waitForTimeout(1000);

    // Save 버튼 클릭
    try {
      await page.click('button:has-text("Save")');
      console.log('✅ CRON_SECRET 추가 완료!');
    } catch (e) {
      console.log('⚠️  Save 버튼을 찾을 수 없습니다. 수동으로 저장해주세요.');
    }

    await page.waitForTimeout(3000);

    // 결과 스크린샷
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/vercel-env-after.png',
      fullPage: true
    });
    console.log('📸 After: vercel-env-after.png\n');

    console.log('');
    console.log('📝 추가로 설정이 필요한 환경 변수:');
    console.log('');
    console.log('2. GMAIL_USER');
    console.log('   - 값: 발신할 Gmail 주소');
    console.log('   - 환경: Production만 선택');
    console.log('');
    console.log('3. GMAIL_APP_PASSWORD');
    console.log('   - 값: Gmail 앱 비밀번호 (16자리)');
    console.log('   - 생성 URL: https://myaccount.google.com/apppasswords');
    console.log('   - 환경: Production만 선택');
    console.log('');
    console.log('4. NEXT_PUBLIC_APP_URL (확인 필요)');
    console.log('   - 값: https://nvoim-planner-pro.vercel.app');
    console.log('   - 환경: Production, Preview, Development');
    console.log('');
    console.log('💡 Gmail 앱 비밀번호 생성 방법:');
    console.log('1. Google 계정 → 보안');
    console.log('2. 2단계 인증 활성화 (필수)');
    console.log('3. 앱 비밀번호 생성 → "메일" 선택');
    console.log('4. 생성된 16자리 비밀번호 복사');
    console.log('');

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/vercel-env-error.png',
      fullPage: true
    });
    console.log('📸 Error: vercel-env-error.png');
  }

  console.log('\n✅ 완료!\n');
  console.log('⚠️  중요: CRON_SECRET 값을 꼭 기록해두세요!');
  console.log('   CRON_SECRET =', cronSecret);
  console.log('');
  process.exit(0);
})();
