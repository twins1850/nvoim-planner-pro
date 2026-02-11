# Sentry 설정 가이드

## 🎯 Sentry란?

Sentry는 프로덕션 환경에서 발생하는 에러를 실시간으로 추적하고 모니터링하는 도구입니다.

### 주요 기능:
- ✅ 실시간 에러 추적 및 알림
- ✅ 소스맵 지원으로 원본 코드 위치 표시
- ✅ 세션 리플레이 (사용자 행동 재현)
- ✅ 성능 모니터링
- ✅ 에러 발생 전 이벤트 추적 (Breadcrumbs)

---

## 📦 설치 완료 상태

✅ `@sentry/nextjs` 패키지 설치됨
✅ 설정 파일 3개 생성됨:
- `sentry.client.config.ts` (클라이언트)
- `sentry.server.config.ts` (서버)
- `sentry.edge.config.ts` (Edge Functions)

✅ `next.config.ts`에 Sentry 통합 완료

---

## 🔧 설정 방법

### 1단계: Sentry 프로젝트 생성

1. [Sentry.io](https://sentry.io/) 접속 및 회원가입 (무료)
2. 새 프로젝트 생성:
   - Platform: **Next.js** 선택
   - Project Name: `nvoim-planner-pro`
   - Team: 기본 팀 선택

3. DSN 복사:
   - 프로젝트 생성 후 표시되는 DSN 복사
   - 형식: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`

### 2단계: 환경 변수 설정

#### 로컬 개발 환경 (`.env.local`)

`.env.local` 파일에 다음 내용 추가:

```bash
# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://your-actual-dsn@sentry.io/your-project-id
SENTRY_ORG=your-org-name
SENTRY_PROJECT=nvoim-planner-pro
SENTRY_AUTH_TOKEN=your_auth_token_here
```

#### Auth Token 생성 방법:

1. Sentry 대시보드 > Settings > Account > API > Auth Tokens
2. "Create New Token" 클릭
3. Scopes 선택:
   - ✅ `project:read`
   - ✅ `project:releases`
   - ✅ `org:read`
4. Token 생성 후 복사하여 `SENTRY_AUTH_TOKEN`에 설정

### 3단계: Vercel 환경 변수 설정

Vercel Dashboard > Settings > Environment Variables:

| 변수 이름 | 값 | 환경 |
|---------|---|-----|
| `NEXT_PUBLIC_SENTRY_DSN` | `https://xxxxx@sentry.io/xxxxx` | Production, Preview, Development |
| `SENTRY_ORG` | `your-org-name` | Production |
| `SENTRY_PROJECT` | `nvoim-planner-pro` | Production |
| `SENTRY_AUTH_TOKEN` | `your_auth_token` | Production (Secret) |

---

## ✅ 검증 방법

### 1. 로컬 테스트

개발 서버 실행:
```bash
npm run dev
```

브라우저 콘솔에서 테스트 에러 발생:
```javascript
// 개발자 도구 > Console
throw new Error('Sentry Test Error')
```

Sentry Dashboard에서 에러 확인 (몇 초 내 표시됨)

### 2. 프로덕션 빌드 테스트

```bash
npm run build
npm run start
```

빌드 시 로그 확인:
- `[Sentry] Successfully uploaded source maps` 메시지 확인

### 3. 실제 에러 캡처 테스트

의도적으로 에러 발생시키기:

```typescript
// 임시로 아무 파일에 추가
import * as Sentry from '@sentry/nextjs';

try {
  throw new Error('Test error for Sentry');
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      section: 'test',
    },
    extra: {
      testInfo: 'This is a test error',
    },
  });
}
```

---

## 📊 Sentry Dashboard 사용법

### 에러 확인:
1. Sentry Dashboard > Issues
2. 각 에러 클릭 시:
   - **Stack Trace**: 에러 발생 위치 (원본 소스 코드)
   - **Breadcrumbs**: 에러 발생 전 이벤트 로그
   - **User Context**: 사용자 정보 (있는 경우)
   - **Device Info**: 브라우저, OS 정보

### Session Replay:
- 사용자가 에러를 경험한 순간의 화면 녹화 재생
- 사용자 행동 패턴 분석

### Performance Monitoring:
- API 응답 시간
- 페이지 로딩 속도
- 트랜잭션 추적

---

## 🎨 고급 설정

### 1. 사용자 정보 추적

```typescript
import * as Sentry from '@sentry/nextjs';

// 로그인 시
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.full_name,
});

// 로그아웃 시
Sentry.setUser(null);
```

### 2. 커스텀 컨텍스트 추가

```typescript
Sentry.setContext('student_context', {
  studentId: '123',
  studentName: 'John Doe',
});
```

### 3. 성능 추적

```typescript
import * as Sentry from '@sentry/nextjs';

const transaction = Sentry.startTransaction({
  name: 'Student Profile Load',
  op: 'page_load',
});

// ... 작업 수행

transaction.finish();
```

---

## 🚨 주의사항

1. **민감한 정보 마스킹**:
   - Sentry 설정에서 `maskAllText: true` 적용됨
   - 비밀번호, 토큰 등 자동 필터링

2. **에러율 제한**:
   - 무료 플랜: 월 5,000 에러까지
   - 초과 시 샘플링 적용 가능

3. **소스맵 업로드**:
   - 프로덕션 빌드 시 자동 업로드
   - `.sentryclirc` 파일 `.gitignore`에 추가됨

---

## 📚 참고 자료

- [Sentry Next.js 공식 문서](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry 대시보드](https://sentry.io/)
- [Session Replay 설정](https://docs.sentry.io/platforms/javascript/session-replay/)

---

## ✅ 완료 체크리스트

- [ ] Sentry 프로젝트 생성
- [ ] DSN 복사 및 환경 변수 설정
- [ ] Auth Token 생성 및 설정
- [ ] Vercel 환경 변수 설정
- [ ] 로컬 테스트 에러 확인
- [ ] 프로덕션 빌드 테스트
- [ ] Sentry Dashboard에서 에러 확인
- [ ] Session Replay 작동 확인

---

**설정 완료 후 이 파일은 삭제해도 됩니다.**
