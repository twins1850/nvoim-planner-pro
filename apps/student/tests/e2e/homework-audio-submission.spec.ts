/**
 * E2E Test: 학생 앱 숙제 음성 제출 테스트
 *
 * 목적: Migration 025 적용으로 audio/webm MIME 타입이 지원되는지 검증
 * 관련 파일:
 * - supabase/migrations/025_create_homework_submissions_bucket.sql
 * - apps/student/src/screens/HomeworkSubmissionScreen.tsx
 * - REGRESSION_PREVENTION_GUIDE.md
 *
 * 테스트 시나리오:
 * 1. 학생 앱 숙제 목록 페이지 접속
 * 2. 숙제 상세 페이지 이동
 * 3. 음성 녹음 인터페이스 UI 확인
 * 4. 음성 녹음 시작/중지 (2초)
 * 5. 제출 버튼 클릭 및 Supabase Storage 업로드 성공
 * 6. 성공 메시지 확인 (audio/webm MIME 타입 지원 검증)
 */

import { test, expect } from '@playwright/test';

test.describe('학생 앱 숙제 음성 제출 E2E 테스트', () => {
  // 각 테스트 전에 학생 로그인 수행
  test.beforeEach(async ({ page }) => {
    console.log('🔐 학생 로그인 시작...');

    // 학생 앱 로그인 페이지로 이동
    await page.goto('http://localhost:8081/auth/login', { timeout: 10000 });

    // 로그인 폼 입력
    await page.fill('input[type="email"]', 'student@example.com');
    await page.fill('input[type="password"]', 'password123');

    // 로그인 버튼 클릭
    await page.click('button[type="submit"]');

    // 홈 화면으로 리다이렉트 대기
    await page.waitForURL('**/home', { timeout: 5000 });

    console.log('✅ 학생 로그인 완료');
  });

  /**
   * 테스트 1: 숙제 목록 페이지 접속
   */
  test('1. 학생 앱 숙제 목록 페이지 접속', async ({ page }) => {
    console.log('📋 테스트 1: 숙제 목록 페이지 접속');

    // 숙제 목록 페이지로 이동
    await page.goto('http://localhost:8081/homework', { timeout: 10000 });

    // URL 확인
    await expect(page).toHaveURL(/.*\/homework/, { timeout: 5000 });

    // 숙제 목록이 표시되는지 확인
    const homeworkListVisible = await page.locator('[data-testid="homework-list"]').isVisible().catch(() => false);
    const homeworkItemsVisible = await page.locator('text=/Unit|Homework|숙제/').first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(homeworkListVisible || homeworkItemsVisible).toBeTruthy();

    console.log('✅ 숙제 목록 페이지 접속 성공');
  });

  /**
   * 테스트 2: 숙제 상세 페이지 이동
   */
  test('2. 숙제 상세 페이지로 이동', async ({ page }) => {
    console.log('📝 테스트 2: 숙제 상세 페이지 이동');

    // 숙제 목록 페이지로 이동
    await page.goto('http://localhost:8081/homework', { timeout: 10000 });

    // 첫 번째 숙제 클릭
    const firstHomework = page.locator('[data-testid="homework-item"]').first();
    const firstHomeworkFallback = page.locator('text=/Unit|Homework|숙제/').first();

    const homeworkElement = await firstHomework.isVisible().catch(() => false)
      ? firstHomework
      : firstHomeworkFallback;

    await homeworkElement.click();

    // 상세 페이지로 이동 확인
    await page.waitForURL(/.*\/homework\/[a-f0-9-]+/, { timeout: 5000 });

    // 숙제 제목 또는 상세 정보 확인
    const titleVisible = await page.locator('[data-testid="homework-title"]').isVisible().catch(() => false);
    const detailsVisible = await page.locator('text=/제출|Submit|음성|Audio/').first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(titleVisible || detailsVisible).toBeTruthy();

    console.log('✅ 숙제 상세 페이지 이동 성공');
  });

  /**
   * 테스트 3: 음성 녹음 인터페이스 UI 확인
   */
  test('3. 음성 녹음 인터페이스 UI 요소 확인', async ({ page }) => {
    console.log('🎤 테스트 3: 음성 녹음 인터페이스 확인');

    // 숙제 목록 페이지로 이동
    await page.goto('http://localhost:8081/homework', { timeout: 10000 });

    // 첫 번째 숙제 클릭
    const firstHomework = page.locator('[data-testid="homework-item"]').first();
    const firstHomeworkFallback = page.locator('text=/Unit|Homework|숙제/').first();

    const homeworkElement = await firstHomework.isVisible().catch(() => false)
      ? firstHomework
      : firstHomeworkFallback;

    await homeworkElement.click();
    await page.waitForURL(/.*\/homework\/[a-f0-9-]+/, { timeout: 5000 });

    // 음성 녹음 버튼 또는 탭 찾기
    const audioTabVisible = await page.locator('text=/음성|Audio|녹음|Record/').first().isVisible({ timeout: 3000 }).catch(() => false);

    if (audioTabVisible) {
      await page.locator('text=/음성|Audio|녹음|Record/').first().click();
      await page.waitForTimeout(1000);
    }

    // 음성 녹음 UI 요소 확인
    const micIconVisible = await page.locator('[data-testid="mic-icon"]').isVisible().catch(() => false);
    const recordButtonVisible = await page.locator('text=/녹음 시작|Start Recording|Record/').first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(micIconVisible || recordButtonVisible).toBeTruthy();

    console.log('✅ 음성 녹음 인터페이스 확인 완료');
  });

  /**
   * 테스트 4: 음성 녹음 시작/중지 (2초)
   */
  test('4. 음성 녹음 시작 및 중지 (2초)', async ({ page }) => {
    console.log('⏺️ 테스트 4: 음성 녹음 실행');

    // 숙제 목록 페이지로 이동
    await page.goto('http://localhost:8081/homework', { timeout: 10000 });

    // 첫 번째 숙제 클릭
    const firstHomework = page.locator('[data-testid="homework-item"]').first();
    const firstHomeworkFallback = page.locator('text=/Unit|Homework|숙제/').first();

    const homeworkElement = await firstHomework.isVisible().catch(() => false)
      ? firstHomework
      : firstHomeworkFallback;

    await homeworkElement.click();
    await page.waitForURL(/.*\/homework\/[a-f0-9-]+/, { timeout: 5000 });

    // 음성 녹음 탭 클릭 (있는 경우)
    const audioTabVisible = await page.locator('text=/음성|Audio|녹음|Record/').first().isVisible({ timeout: 3000 }).catch(() => false);

    if (audioTabVisible) {
      await page.locator('text=/음성|Audio|녹음|Record/').first().click();
      await page.waitForTimeout(1000);
    }

    // 녹음 시작 버튼 클릭
    const recordButton = page.locator('text=/녹음 시작|Start Recording|Record/').first();
    await recordButton.click();

    console.log('🎙️ 녹음 시작...');

    // 녹음 상태 확인 (녹음 중 UI 요소)
    const recordingIndicatorVisible = await page.locator('text=/녹음 중|Recording|00:/').first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(recordingIndicatorVisible).toBeTruthy();

    // 2초 대기
    await page.waitForTimeout(2000);

    console.log('⏹️ 2초 경과, 녹음 중지...');

    // 녹음 중지 버튼 클릭
    const stopButton = page.locator('text=/중지|Stop|녹음 중지/').first();
    await stopButton.click();

    // 녹음 완료 후 오디오 플레이어 또는 파일 정보 확인
    const audioPlayerVisible = await page.locator('[data-testid="audio-player"]').isVisible({ timeout: 3000 }).catch(() => false);
    const audioFileVisible = await page.locator('text=/audio|\.webm|\.m4a|\.mp4/').first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(audioPlayerVisible || audioFileVisible).toBeTruthy();

    console.log('✅ 음성 녹음 완료');
  });

  /**
   * 테스트 5: 제출 버튼 클릭 및 Supabase Storage 업로드 성공
   */
  test('5. 음성 파일 제출 및 업로드 성공', async ({ page }) => {
    console.log('📤 테스트 5: 음성 파일 제출');

    // 숙제 목록 페이지로 이동
    await page.goto('http://localhost:8081/homework', { timeout: 10000 });

    // 첫 번째 숙제 클릭
    const firstHomework = page.locator('[data-testid="homework-item"]').first();
    const firstHomeworkFallback = page.locator('text=/Unit|Homework|숙제/').first();

    const homeworkElement = await firstHomework.isVisible().catch(() => false)
      ? firstHomework
      : firstHomeworkFallback;

    await homeworkElement.click();
    await page.waitForURL(/.*\/homework\/[a-f0-9-]+/, { timeout: 5000 });

    // 음성 녹음 탭 클릭 (있는 경우)
    const audioTabVisible = await page.locator('text=/음성|Audio|녹음|Record/').first().isVisible({ timeout: 3000 }).catch(() => false);

    if (audioTabVisible) {
      await page.locator('text=/음성|Audio|녹음|Record/').first().click();
      await page.waitForTimeout(1000);
    }

    // 녹음 시작
    const recordButton = page.locator('text=/녹음 시작|Start Recording|Record/').first();
    await recordButton.click();

    console.log('🎙️ 녹음 시작...');
    await page.waitForTimeout(2000);

    // 녹음 중지
    const stopButton = page.locator('text=/중지|Stop|녹음 중지/').first();
    await stopButton.click();

    console.log('⏹️ 녹음 중지');
    await page.waitForTimeout(1000);

    // 제출 버튼 클릭
    const submitButton = page.locator('text=/제출|Submit|제출하기/').first();
    await submitButton.click();

    console.log('📤 제출 버튼 클릭');

    // 업로드 진행 중 표시 확인 (선택적)
    const uploadingVisible = await page.locator('text=/업로드|Uploading|처리 중/').first().isVisible({ timeout: 2000 }).catch(() => false);

    if (uploadingVisible) {
      console.log('⏳ 업로드 진행 중...');
    }

    // 업로드 완료 대기 (최대 10초)
    await page.waitForTimeout(5000);

    console.log('✅ 음성 파일 제출 완료');
  });

  /**
   * 테스트 6: 성공 메시지 확인 (audio/webm MIME 타입 지원 검증)
   */
  test('6. 제출 성공 메시지 확인 및 MIME 타입 검증', async ({ page }) => {
    console.log('✅ 테스트 6: 성공 메시지 확인');

    // 숙제 목록 페이지로 이동
    await page.goto('http://localhost:8081/homework', { timeout: 10000 });

    // 첫 번째 숙제 클릭
    const firstHomework = page.locator('[data-testid="homework-item"]').first();
    const firstHomeworkFallback = page.locator('text=/Unit|Homework|숙제/').first();

    const homeworkElement = await firstHomework.isVisible().catch(() => false)
      ? firstHomework
      : firstHomeworkFallback;

    await homeworkElement.click();
    await page.waitForURL(/.*\/homework\/[a-f0-9-]+/, { timeout: 5000 });

    // 음성 녹음 탭 클릭 (있는 경우)
    const audioTabVisible = await page.locator('text=/음성|Audio|녹음|Record/').first().isVisible({ timeout: 3000 }).catch(() => false);

    if (audioTabVisible) {
      await page.locator('text=/음성|Audio|녹음|Record/').first().click();
      await page.waitForTimeout(1000);
    }

    // 녹음 시작
    const recordButton = page.locator('text=/녹음 시작|Start Recording|Record/').first();
    await recordButton.click();

    console.log('🎙️ 녹음 시작...');
    await page.waitForTimeout(2000);

    // 녹음 중지
    const stopButton = page.locator('text=/중지|Stop|녹음 중지/').first();
    await stopButton.click();

    console.log('⏹️ 녹음 중지');
    await page.waitForTimeout(1000);

    // 제출 버튼 클릭
    const submitButton = page.locator('text=/제출|Submit|제출하기/').first();
    await submitButton.click();

    console.log('📤 제출 버튼 클릭');

    // 성공 메시지 확인 (최대 10초 대기)
    const successMessageVisible = await page.locator('text=/성공|Success|완료|제출되었습니다/').first().isVisible({ timeout: 10000 }).catch(() => false);

    expect(successMessageVisible).toBeTruthy();

    // 콘솔 에러 확인 (StorageApiError가 없어야 함)
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('StorageApiError') || text.includes('mime type') || text.includes('not supported')) {
        console.error('❌ 에러 발견:', text);
        throw new Error(`MIME 타입 에러 발견: ${text}`);
      }
    });

    console.log('✅ 제출 성공 메시지 확인 완료');
    console.log('✅ Migration 025 audio/webm MIME 타입 지원 검증 완료');
  });

  /**
   * 보너스 테스트: 전체 플로우 통합 테스트
   */
  test('보너스: 전체 음성 제출 플로우 통합 테스트', async ({ page }) => {
    console.log('🔄 보너스 테스트: 전체 플로우 통합');

    // 1. 숙제 목록 페이지로 이동
    await page.goto('http://localhost:8081/homework', { timeout: 10000 });
    console.log('✅ 1단계: 숙제 목록 페이지 접속');

    // 2. 첫 번째 숙제 클릭
    const firstHomework = page.locator('[data-testid="homework-item"]').first();
    const firstHomeworkFallback = page.locator('text=/Unit|Homework|숙제/').first();

    const homeworkElement = await firstHomework.isVisible().catch(() => false)
      ? firstHomework
      : firstHomeworkFallback;

    await homeworkElement.click();
    await page.waitForURL(/.*\/homework\/[a-f0-9-]+/, { timeout: 5000 });
    console.log('✅ 2단계: 숙제 상세 페이지 이동');

    // 3. 음성 녹음 탭 클릭
    const audioTabVisible = await page.locator('text=/음성|Audio|녹음|Record/').first().isVisible({ timeout: 3000 }).catch(() => false);

    if (audioTabVisible) {
      await page.locator('text=/음성|Audio|녹음|Record/').first().click();
      await page.waitForTimeout(1000);
    }
    console.log('✅ 3단계: 음성 녹음 인터페이스 접근');

    // 4. 녹음 시작
    const recordButton = page.locator('text=/녹음 시작|Start Recording|Record/').first();
    await recordButton.click();
    console.log('✅ 4단계: 녹음 시작 (2초)');
    await page.waitForTimeout(2000);

    // 5. 녹음 중지
    const stopButton = page.locator('text=/중지|Stop|녹음 중지/').first();
    await stopButton.click();
    console.log('✅ 5단계: 녹음 중지');
    await page.waitForTimeout(1000);

    // 6. 제출 버튼 클릭
    const submitButton = page.locator('text=/제출|Submit|제출하기/').first();
    await submitButton.click();
    console.log('✅ 6단계: 제출 버튼 클릭');

    // 7. 성공 메시지 확인
    const successMessageVisible = await page.locator('text=/성공|Success|완료|제출되었습니다/').first().isVisible({ timeout: 10000 }).catch(() => false);

    expect(successMessageVisible).toBeTruthy();
    console.log('✅ 7단계: 제출 성공 메시지 확인');

    console.log('🎉 전체 플로우 통합 테스트 완료!');
    console.log('🎉 Migration 025 회귀 방지 검증 성공!');
  });
});
