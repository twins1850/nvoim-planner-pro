const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Vercel 환경 변수 Form 구조 확인...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  // 현재 활성 페이지 사용
  const pages = context.pages();
  const page = pages[pages.length - 1];

  try {
    console.log('📂 현재 페이지 URL:', page.url());
    console.log('');

    // "Add New" 버튼 클릭
    console.log('Step 1: "Add New" 버튼 클릭...');

    const addButtonSelectors = [
      'button:has-text("Add New")',
      'button:has-text("Add")',
      'text=Add New',
      '[data-testid="add-env-var"]'
    ];

    let clicked = false;
    for (const selector of addButtonSelectors) {
      try {
        await page.click(selector, { timeout: 3000 });
        clicked = true;
        console.log('✅ 버튼 클릭 성공:', selector);
        break;
      } catch (e) {
        console.log('⏭️  시도:', selector);
      }
    }

    if (!clicked) {
      console.log('❌ 버튼을 찾지 못했습니다.');
      process.exit(1);
    }

    await page.waitForTimeout(2000);

    // Form 구조 분석
    console.log('\nStep 2: Form 구조 분석...');
    console.log('');

    // 모든 input 필드 찾기
    const inputs = await page.$$('input[type="text"], input[type="password"], input:not([type])');
    console.log(`📊 총 input 필드 수: ${inputs.length}`);
    console.log('');

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const placeholder = await input.getAttribute('placeholder');
      const name = await input.getAttribute('name');
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');

      console.log(`Input ${i + 1}:`);
      console.log(`  - placeholder: ${placeholder}`);
      console.log(`  - name: ${name}`);
      console.log(`  - id: ${id}`);
      console.log(`  - aria-label: ${ariaLabel}`);
      console.log('');
    }

    // Label 찾기
    const labels = await page.$$('label');
    console.log(`📊 총 label 수: ${labels.length}`);
    console.log('');

    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      const text = await label.textContent();
      const htmlFor = await label.getAttribute('for');

      console.log(`Label ${i + 1}:`);
      console.log(`  - text: ${text}`);
      console.log(`  - for: ${htmlFor}`);
      console.log('');
    }

    // 스크린샷
    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/vercel-form-structure.png',
      fullPage: true
    });

    console.log('📸 Screenshot: vercel-form-structure.png');
    console.log('');
    console.log('✅ 분석 완료! 모달을 닫지 않고 유지합니다.');

  } catch (error) {
    console.error('❌ 에러:', error.message);
  }

  process.exit(0);
})();
