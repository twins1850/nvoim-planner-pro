const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Vercel SMS 환경 변수 설정 시작...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const page = await context.newPage();

  try {
    // Vercel 환경 변수 페이지 접속
    console.log('Step 1: Vercel 환경 변수 페이지 접속...');
    await page.goto('https://vercel.com/twins-projects-96c28b4d/nvoim-planner-pro/settings/environment-variables', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    await page.waitForTimeout(3000);
    console.log('✅ 환경 변수 페이지 로드 완료\n');

    // 스크린샷 저장
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/vercel-env-page.png',
      fullPage: true
    });
    console.log('📸 Screenshot: vercel-env-page.png\n');

    console.log('━'.repeat(60));
    console.log('📝 추가할 환경 변수:');
    console.log('━'.repeat(60));
    console.log('');
    console.log('1️⃣ SOLAPI_API_KEY');
    console.log('   Value: (Solapi API Key)');
    console.log('   Environment: Production, Preview, Development');
    console.log('');
    console.log('2️⃣ SOLAPI_API_SECRET');
    console.log('   Value: (Solapi API Secret)');
    console.log('   Environment: Production, Preview, Development');
    console.log('');
    console.log('3️⃣ SOLAPI_FROM_NUMBER');
    console.log('   Value: 01012345678 (실제 발신번호)');
    console.log('   Environment: Production, Preview, Development');
    console.log('');
    console.log('━'.repeat(60));
    console.log('');

    console.log('💡 안내:');
    console.log('   1. Vercel 대시보드가 브라우저에 열렸습니다.');
    console.log('   2. "Add New" 버튼을 클릭하세요.');
    console.log('   3. 위의 환경 변수를 하나씩 추가하세요.');
    console.log('   4. 각 환경 변수마다 "Save" 버튼을 클릭하세요.');
    console.log('');
    console.log('📌 Solapi 계정이 없다면:');
    console.log('   https://solapi.com 에서 회원가입하고');
    console.log('   API Key를 발급받으세요. (무료 크레딧 제공)');
    console.log('');

    // 환경 변수가 이미 있는지 확인
    await page.waitForTimeout(2000);
    const pageText = await page.textContent('body');

    if (pageText.includes('SOLAPI_API_KEY')) {
      console.log('✅ SOLAPI_API_KEY가 이미 설정되어 있습니다!');
    } else {
      console.log('⚠️ SOLAPI_API_KEY가 아직 설정되지 않았습니다.');
    }

    if (pageText.includes('SOLAPI_API_SECRET')) {
      console.log('✅ SOLAPI_API_SECRET가 이미 설정되어 있습니다!');
    } else {
      console.log('⚠️ SOLAPI_API_SECRET가 아직 설정되지 않았습니다.');
    }

    if (pageText.includes('SOLAPI_FROM_NUMBER')) {
      console.log('✅ SOLAPI_FROM_NUMBER가 이미 설정되어 있습니다!');
    } else {
      console.log('⚠️ SOLAPI_FROM_NUMBER가 아직 설정되지 않았습니다.');
    }

    console.log('');
    console.log('━'.repeat(60));
    console.log('⏸️  Vercel 페이지를 열어두었습니다.');
    console.log('   환경 변수 설정을 완료하면 이 스크립트를 종료하세요. (Ctrl+C)');
    console.log('━'.repeat(60));

    // 사용자가 작업할 시간을 주기 위해 대기
    await page.waitForTimeout(300000); // 5분 대기

  } catch (error) {
    console.error('\n❌ 에러 발생:', error.message);
    console.error(error.stack);
  }

  console.log('\n✅ 완료!\n');

  await page.close();
  process.exit(0);
})();
