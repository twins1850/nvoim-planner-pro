# 통합 테스트 실행 가이드

## 📋 개요

플래너 웹 앱과 학생 모바일 앱 간의 통합 테스트 시스템입니다.
Playwright를 사용하여 실제 사용자 플로우를 자동으로 테스트합니다.

## 🎯 테스트 목록

### 06-invite-code-flow.spec.ts (4개 테스트)
1. ✅ **Complete flow**: 플래너가 초대코드 생성 → 학생이 연결
2. ✅ **Invalid codes**: 잘못된/만료된 코드 처리
3. ✅ **Student limit**: 5명 제한 검증, 6번째 학생 거부
4. ✅ **Duplicate prevention**: 중복 학생 연결 방지

**현재 상태**: 4/4 통과 (100% 성공률) ✅

## 🚀 빠른 시작

### 1단계: 학생 앱 서버 확인

```bash
# 현재 실행 중인지 확인
lsof -ti:10001

# 실행 중이 아니면 시작
cd apps/student
npx serve web-build -l 10001
```

### 2단계: 테스트 실행

```bash
# 모든 통합 테스트 실행 (권장)
cd apps/planner-web
npm run test:integration

# 특정 테스트만 실행
npm run test:integration tests/integration/06-invite-code-flow.spec.ts

# UI 모드로 실행 (디버깅용)
npm run test:integration:ui

# 브라우저 표시하며 실행 (디버깅용)
npm run test:integration:headed
```

## 📊 예상 결과

### 성공 시
```
Running 4 tests using 1 worker
🧪 Starting student limit enforcement test
🧪 Starting duplicate connection prevention test
  4 passed (3.4m)
```

### 실패 시
- 스크린샷이 `test-results/` 디렉토리에 저장됩니다
- 에러 컨텍스트가 `error-context.md` 파일에 저장됩니다
- 로그를 확인하여 문제를 파악할 수 있습니다

## 🔧 필수 조건

### 환경 변수
`.env.local` 파일에 다음 환경 변수가 설정되어 있어야 합니다:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 서버 상태
- ✅ **플래너 앱**: http://localhost:3000 (자동으로 시작됨)
- ✅ **학생 앱**: http://localhost:10001 (수동으로 시작 필요)
- ✅ **Supabase**: 프로덕션 데이터베이스 연결

## 🎨 테스트 구조

### Browser Context 전략
```typescript
// Tests 1-3: 공유 컨텍스트 사용
test.beforeAll(async ({ browser }) => {
  context = await browser.newContext();
});

// Test 4: 격리된 컨텍스트 사용 (인증 상태 오염 방지)
test('Duplicate prevention', async ({ browser }) => {
  const freshContext = await browser.newContext();
  // ... 테스트 로직 ...
  await freshContext.close();
});
```

### 데이터 정리
```typescript
// 각 테스트 후 자동 정리
test.afterEach(async () => {
  await cleanupTestUser(plannerEmail);
  await cleanupTestUser(studentEmail);
});
```

## 🐛 문제 해결

### 학생 앱이 로드되지 않음
```bash
# 1. 학생 앱 웹 빌드 확인
cd apps/student
ls -la web-build/

# 2. 빌드가 없으면 다시 빌드
npm run build:web

# 3. 서버 재시작
npx serve web-build -l 10001
```

### 테스트 타임아웃
```typescript
// 개별 테스트 타임아웃 증가 (기본: 60초)
test('My test', () => {
  test.setTimeout(180000); // 3분
  // ...
});
```

### 데이터베이스 정리 오류
```bash
# Supabase 대시보드에서 직접 확인
# https://supabase.com/dashboard

# 테스트 사용자 수동 삭제
# Authentication > Users > 검색: "nplanner-test-"
```

### 포트 충돌
```bash
# 10001 포트 사용 중인 프로세스 확인
lsof -ti:10001

# 프로세스 종료
kill $(lsof -ti:10001)

# 서버 재시작
cd apps/student && npx serve web-build -l 10001
```

## 📈 테스트 성능

### 실행 시간
- **전체 테스트**: 약 3-4분
- **개별 테스트**: 약 30-60초
- **병렬 실행**: 현재 1 worker (순차 실행)

### 최적화 팁
```bash
# 디버그 모드 비활성화
DEBUG='' npm run test:integration

# 브라우저 헤드리스 모드 (더 빠름)
npm run test:integration  # 기본값

# 특정 테스트만 실행
npm run test:integration tests/integration/06-invite-code-flow.spec.ts
```

## 🎯 다음 단계

### 추가 예정 테스트
- [ ] 메시지 전송/수신 플로우
- [ ] 숙제 배정 및 제출 플로우
- [ ] 비디오 업로드 및 AI 분석 플로우
- [ ] 실시간 알림 시스템

### CI/CD 통합
```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build:web
      - run: npx serve web-build -l 10001 &
      - run: npm run test:integration
```

## 📚 참고 자료

### Playwright 문서
- [Getting Started](https://playwright.dev/docs/intro)
- [Test Fixtures](https://playwright.dev/docs/test-fixtures)
- [Browser Contexts](https://playwright.dev/docs/browser-contexts)

### 프로젝트 문서
- [DEVELOPMENT_STATUS.md](/DEVELOPMENT_STATUS.md) - Phase 10 참조
- [테스트 코드](/apps/planner-web/tests/integration/06-invite-code-flow.spec.ts)
- [커밋 히스토리](git log --oneline | grep "test(integration)")

---

**마지막 업데이트**: 2026년 2월 3일
**작성자**: Claude Code Assistant
**상태**: ✅ 모든 테스트 통과 (4/4)
