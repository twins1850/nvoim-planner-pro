const { chromium } = require('playwright');

// CRON_SECRET 값 (기록해두세요!)
const CRON_SECRET = 'txsrv0v6p3u26gq9stcoiex2uy4mfl0v';

(async () => {
  console.log('🔧 Vercel 환경 변수 추가 중...\n');
  console.log('⚠️  중요: CRON_SECRET =', CRON_SECRET);
  console.log('   이 값을 기록해두세요!\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    console.log('Step 1: 현재 페이지 확인...');
    const url = page.url();
    console.log('현재 URL:', url);

    if (!url.includes('vercel.com')) {
      console.log('Vercel 환경 변수 페이지로 이동...');
      await page.goto('https://vercel.com/twins1850s-projects/nvoim-planner-pro/settings/environment-variables');
      await page.waitForTimeout(5000);
    }

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/vercel-current.png',
      fullPage: true
    });
    console.log('📸 Screenshot: vercel-current.png\n');

    console.log('Step 2: 환경 변수 추가 방법 안내...\n');
    console.log('📋 추가할 환경 변수 목록:');
    console.log('');
    console.log('1️⃣  CRON_SECRET');
    console.log('   Key: CRON_SECRET');
    console.log('   Value:', CRON_SECRET);
    console.log('   Environments: ✅ Production, ✅ Preview, ✅ Development');
    console.log('');
    console.log('2️⃣  GMAIL_USER (Gmail 설정 필요)');
    console.log('   Key: GMAIL_USER');
    console.log('   Value: 발신용 Gmail 주소 (예: your-email@gmail.com)');
    console.log('   Environments: ✅ Production');
    console.log('');
    console.log('3️⃣  GMAIL_APP_PASSWORD (Gmail 앱 비밀번호 생성 필요)');
    console.log('   Key: GMAIL_APP_PASSWORD');
    console.log('   Value: 16자리 앱 비밀번호 (공백 없이)');
    console.log('   Environments: ✅ Production');
    console.log('   생성 URL: https://myaccount.google.com/apppasswords');
    console.log('');
    console.log('💡 Gmail 앱 비밀번호 생성 단계:');
    console.log('   1. https://myaccount.google.com/apppasswords 접속');
    console.log('   2. 앱 이름: "NVOIM Planner" 입력');
    console.log('   3. 생성된 16자리 비밀번호 복사 (공백 제거)');
    console.log('   4. Vercel에 붙여넣기');
    console.log('');
    console.log('📝 Vercel에서 환경 변수 추가하기:');
    console.log('   1. "Add New" 버튼 클릭');
    console.log('   2. Key와 Value 입력');
    console.log('   3. Environment 선택 (Production/Preview/Development)');
    console.log('   4. "Save" 클릭');
    console.log('   5. 모든 변수 추가 후 Vercel이 자동 재배포됨');
    console.log('');

    console.log('⏳ Vercel 페이지에서 위 환경 변수들을 추가해주세요...\n');

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
  }

  console.log('✅ 안내 완료!\n');
  console.log('🔒 보안 주의:');
  console.log('   - CRON_SECRET은 외부에 노출되지 않도록 주의하세요');
  console.log('   - Gmail 앱 비밀번호는 절대 GitHub에 커밋하지 마세요');
  console.log('');
  process.exit(0);
})();
