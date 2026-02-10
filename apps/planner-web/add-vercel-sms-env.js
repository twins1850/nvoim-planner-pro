const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Vercel SMS 환경 변수 자동 추가 시작...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const page = await context.newPage();

  // 추가할 환경 변수 목록
  const envVars = [
    {
      key: 'SOLAPI_API_KEY',
      value: 'your_solapi_api_key_here',
      description: 'Solapi API Key (solapi.com에서 발급)'
    },
    {
      key: 'SOLAPI_API_SECRET',
      value: 'your_solapi_api_secret_here',
      description: 'Solapi API Secret'
    },
    {
      key: 'SOLAPI_FROM_NUMBER',
      value: '01012345678',
      description: 'SMS 발신번호 (숫자만, - 없이)'
    }
  ];

  try {
    // Vercel 환경 변수 페이지 접속
    console.log('Step 1: Vercel 환경 변수 페이지 접속...');
    await page.goto('https://vercel.com/twins-projects-96c28b4d/nvoim-planner-pro/settings/environment-variables', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    await page.waitForTimeout(3000);
    console.log('✅ 페이지 로드 완료\n');

    for (let i = 0; i < envVars.length; i++) {
      const env = envVars[i];
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📝 [${i + 1}/${envVars.length}] ${env.key} 추가 중...`);
      console.log(`   설명: ${env.description}`);
      console.log(`${'='.repeat(60)}\n`);

      // Add New 버튼 찾기 및 클릭
      console.log('Step 2: "Add New" 버튼 클릭...');
      try {
        // 여러 선택자 시도
        const addButtonSelectors = [
          'button:has-text("Add New")',
          'button:has-text("Add")',
          '[data-testid="add-env-button"]',
          'button[type="button"]:has-text("New")'
        ];

        let clicked = false;
        for (const selector of addButtonSelectors) {
          try {
            await page.click(selector, { timeout: 3000 });
            clicked = true;
            console.log('✅ "Add New" 버튼 클릭 성공');
            break;
          } catch (e) {
            // 다음 선택자 시도
          }
        }

        if (!clicked) {
          console.log('⚠️ "Add New" 버튼을 찾을 수 없습니다. 수동으로 클릭해주세요.');
          await page.waitForTimeout(5000); // 사용자가 클릭할 시간
        }
      } catch (e) {
        console.log('⚠️ 버튼 클릭 실패, 계속 진행...');
      }

      await page.waitForTimeout(2000);

      // Key 입력
      console.log('Step 3: Key 입력...');
      try {
        // Key 입력 필드 찾기
        const keySelectors = [
          'input[name="key"]',
          'input[placeholder*="KEY"]',
          'input[placeholder*="Key"]',
          'input[type="text"]'
        ];

        for (const selector of keySelectors) {
          try {
            await page.fill(selector, env.key, { timeout: 2000 });
            console.log(`✅ Key 입력: ${env.key}`);
            break;
          } catch (e) {
            // 다음 선택자 시도
          }
        }
      } catch (e) {
        console.log('⚠️ Key 입력 실패');
      }

      await page.waitForTimeout(1000);

      // Value 입력
      console.log('Step 4: Value 입력...');
      try {
        const valueSelectors = [
          'input[name="value"]',
          'textarea[name="value"]',
          'input[placeholder*="VALUE"]',
          'input[placeholder*="Value"]',
          'textarea'
        ];

        for (const selector of valueSelectors) {
          try {
            await page.fill(selector, env.value, { timeout: 2000 });
            console.log(`✅ Value 입력: ${env.value}`);
            break;
          } catch (e) {
            // 다음 선택자 시도
          }
        }
      } catch (e) {
        console.log('⚠️ Value 입력 실패');
      }

      await page.waitForTimeout(1000);

      // Environment 선택 (Production, Preview, Development 모두)
      console.log('Step 5: Environment 선택 (모두 선택)...');
      try {
        const envCheckboxes = [
          'input[value="production"]',
          'input[value="preview"]',
          'input[value="development"]'
        ];

        for (const checkbox of envCheckboxes) {
          try {
            const isChecked = await page.isChecked(checkbox, { timeout: 1000 });
            if (!isChecked) {
              await page.check(checkbox);
            }
          } catch (e) {
            // 이미 체크되어 있거나 찾을 수 없음
          }
        }
        console.log('✅ Environment 선택 완료');
      } catch (e) {
        console.log('⚠️ Environment 선택 실패 (기본값 사용)');
      }

      await page.waitForTimeout(1000);

      // Save 버튼 클릭
      console.log('Step 6: Save 버튼 클릭...');
      try {
        const saveSelectors = [
          'button:has-text("Save")',
          'button[type="submit"]',
          'button:has-text("Add")',
          '[data-testid="save-button"]'
        ];

        for (const selector of saveSelectors) {
          try {
            await page.click(selector, { timeout: 2000 });
            console.log('✅ Save 버튼 클릭 성공');
            break;
          } catch (e) {
            // 다음 선택자 시도
          }
        }
      } catch (e) {
        console.log('⚠️ Save 버튼 클릭 실패');
      }

      await page.waitForTimeout(3000);

      // 스크린샷 저장
      const screenshotName = `vercel-env-${i + 1}-${env.key}.png`;
      await page.screenshot({
        path: `/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/${screenshotName}`,
        fullPage: false
      });
      console.log(`📸 Screenshot: ${screenshotName}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ 모든 환경 변수 추가 완료!');
    console.log('='.repeat(60));
    console.log('');
    console.log('⚠️ 중요: 플레이스홀더 값으로 설정되었습니다!');
    console.log('');
    console.log('📌 다음 단계:');
    console.log('   1. https://solapi.com 에서 회원가입');
    console.log('   2. API Key와 Secret 발급');
    console.log('   3. Vercel 대시보드에서 실제 값으로 업데이트');
    console.log('');

    // 최종 스크린샷
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/vercel-env-final.png',
      fullPage: true
    });
    console.log('📸 최종 Screenshot: vercel-env-final.png');

  } catch (error) {
    console.error('\n❌ 에러 발생:', error.message);
    console.error(error.stack);
  }

  console.log('\n✅ 완료!\n');

  await page.close();
  process.exit(0);
})();
