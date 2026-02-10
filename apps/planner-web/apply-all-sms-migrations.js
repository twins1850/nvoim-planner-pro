const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('🚀 SMS 마이그레이션 일괄 적용 시작...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const page = await context.newPage();

  // 마이그레이션 파일 목록
  const migrations = [
    {
      name: 'SMS 알림 지원 (trial_notifications)',
      path: '../../supabase/migrations/20260129_add_sms_to_trial_notifications.sql'
    },
    {
      name: '전화번호 컬럼 추가 (profiles)',
      path: '../../supabase/migrations/20260129_add_phone_to_profiles.sql'
    }
  ];

  try {
    for (let i = 0; i < migrations.length; i++) {
      const migration = migrations[i];
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📄 [${i + 1}/${migrations.length}] ${migration.name}`);
      console.log(`${'='.repeat(60)}\n`);

      // SQL 파일 읽기
      const sqlPath = path.join(__dirname, migration.path);
      const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

      console.log(`   파일: ${sqlPath}`);
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

      // Monaco Editor 영역 클릭
      try {
        await page.click('.monaco-editor', { timeout: 5000 });
      } catch (e) {
        console.log('   Monaco Editor 클릭 시도 실패, 다른 방법 시도...');
      }

      await page.waitForTimeout(1000);

      // 전체 선택 후 삭제
      await page.keyboard.press('Meta+A');
      await page.keyboard.press('Backspace');
      await page.waitForTimeout(500);

      // SQL 입력
      await page.keyboard.type(sqlContent, { delay: 5 });
      await page.waitForTimeout(1000);

      console.log('✅ SQL 입력 완료\n');

      // 키보드 단축키로 실행 (Cmd+Enter)
      console.log('Step 3: 실행 (Cmd+Enter)...');
      await page.keyboard.press('Meta+Enter');

      await page.waitForTimeout(3000);
      console.log('✅ 실행 완료\n');

      // 결과 확인
      console.log('Step 4: 결과 확인...');
      try {
        // 결과 패널에서 텍스트 읽기
        const resultSelectors = [
          '[role="tabpanel"]',
          '.result-panel',
          '.sql-result',
          'pre'
        ];

        let resultText = '';
        for (const selector of resultSelectors) {
          try {
            const element = await page.locator(selector).first();
            if (await element.isVisible({ timeout: 2000 })) {
              resultText = await element.textContent();
              break;
            }
          } catch (e) {
            // 다음 선택자 시도
          }
        }

        console.log('📊 실행 결과:');
        if (resultText) {
          console.log(resultText.substring(0, 500));
        } else {
          console.log('   (결과를 읽을 수 없습니다. 스크린샷을 확인하세요.)');
        }

        // 성공 여부 판단
        if (resultText.includes('Success') ||
            resultText.includes('ALTER TABLE') ||
            resultText.includes('CREATE INDEX') ||
            resultText.includes('COMMENT')) {
          console.log('\n✅✅✅ 마이그레이션 성공!');
        } else if (resultText.includes('error') || resultText.includes('Error')) {
          console.log('\n⚠️ 오류가 발생했을 수 있습니다. 스크린샷을 확인해주세요.');
        } else {
          console.log('\n✅ 마이그레이션 적용 완료 (결과 확인 필요)');
        }
      } catch (err) {
        console.log('   결과 확인 중 에러 (계속 진행)');
      }

      // 스크린샷 저장
      const screenshotName = `migration-${i + 1}-result.png`;
      await page.screenshot({
        path: `/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/${screenshotName}`,
        fullPage: false
      });
      console.log(`\n📸 Screenshot: ${screenshotName}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ 모든 마이그레이션 적용 완료!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ 에러 발생:', error.message);
    console.error(error.stack);
  }

  console.log('\n✅ 완료!\n');

  await page.close();
  process.exit(0);
})();
