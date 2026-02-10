const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('📋 Supabase 테이블 생성 중...\n');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  try {
    // SQL 파일 읽기
    const sqlPath = path.join(__dirname, 'create-trial-notifications-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('1. SQL Editor 열기...');
    await page.goto('https://supabase.com/dashboard/project/ybcjkdcdruquqrdahtga/sql/new');
    await page.waitForTimeout(3000);

    console.log('2. SQL 작성 중...');

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
    }, sql);

    await page.waitForTimeout(1000);

    console.log('3. SQL 실행...\n');
    await page.keyboard.press('Meta+Enter');
    await page.waitForTimeout(5000);

    await page.screenshot({
      path: '/private/tmp/claude/-Users-twins-Downloads-nvoim-planer-pro/57f14862-c42d-48ad-8238-862bf2b16e12/scratchpad/table-created.png',
      fullPage: true
    });
    console.log('📸 Screenshot: table-created.png\n');

    const bodyText = await page.textContent('body');

    console.log('📊 결과:');

    if (bodyText.includes('CREATE TABLE') || bodyText.includes('Success')) {
      console.log('✅✅✅ trial_notifications 테이블 생성 완료!\n');
      console.log('생성된 항목:');
      console.log('  - 테이블: trial_notifications');
      console.log('  - 인덱스: 3개 (license_id, sent_at, type)');
      console.log('  - RLS 정책: 2개 (사용자 조회, Service role 관리)');
      console.log('  - UNIQUE 제약: license_id + notification_type\n');
    } else if (bodyText.includes('already exists')) {
      console.log('⚠️  테이블이 이미 존재합니다.');
    } else {
      console.log('⚠️  Screenshot를 확인하여 결과를 검증하세요.\n');
    }

  } catch (error) {
    console.error('\n❌ 에러:', error.message);
  }

  console.log('✅ 완료!\n');
  process.exit(0);
})();
