const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('🚀 SMS 마이그레이션 적용 시작...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const page = await context.newPage();

  try {
    // SQL 파일 읽기
    const sqlPath = path.join(__dirname, '../../supabase/migrations/20260129_add_sms_to_trial_notifications.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📄 SQL 파일 읽기 완료');
    console.log(`   경로: ${sqlPath}`);
    console.log(`   크기: ${sqlContent.length} bytes\n`);

    // Supabase SQL Editor 접속
    console.log('Step 1: Supabase SQL Editor 접속...');
    await page.goto('https://supabase.com/dashboard/project/ugvvovdbifawiqjhuzak/sql/new', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    await page.waitForTimeout(3000);
    console.log('✅ SQL Editor 페이지 로드 완료\n');

    // Monaco Editor에 SQL 입력
    console.log('Step 2: SQL 입력 중...');

    // Monaco Editor 찾기 및 포커스
    await page.evaluate(() => {
      const editor = document.querySelector('.monaco-editor');
      if (editor) {
        editor.click();
      }
    });

    await page.waitForTimeout(1000);

    // Cmd+A로 전체 선택 후 삭제
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(500);

    // SQL 입력
    await page.keyboard.type(sqlContent, { delay: 10 });
    await page.waitForTimeout(1000);

    console.log('✅ SQL 입력 완료\n');

    // Run 버튼 클릭
    console.log('Step 3: Run 버튼 클릭...');
    const runButton = await page.locator('button:has-text("Run")').first();
    await runButton.click();

    await page.waitForTimeout(3000);
    console.log('✅ 실행 완료\n');

    // 결과 확인
    console.log('Step 4: 결과 확인...');
    const resultText = await page.locator('[role="tabpanel"]').first().textContent();

    console.log('📊 실행 결과:');
    console.log(resultText);

    if (resultText.includes('Success') || resultText.includes('ALTER TABLE')) {
      console.log('\n✅✅✅ SMS 마이그레이션 적용 성공!');
    } else if (resultText.includes('error') || resultText.includes('Error')) {
      console.log('\n⚠️ 오류가 발생했습니다. 위 결과를 확인해주세요.');
    } else {
      console.log('\n✅ 마이그레이션 적용 완료 (결과 확인 필요)');
    }

    // 스크린샷 저장
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/sms-migration-result.png',
      fullPage: false
    });
    console.log('\n📸 Screenshot: sms-migration-result.png');

  } catch (error) {
    console.error('\n❌ 에러 발생:', error.message);
    console.error(error.stack);
  }

  console.log('\n✅ 완료!\n');

  await page.close();
  process.exit(0);
})();
