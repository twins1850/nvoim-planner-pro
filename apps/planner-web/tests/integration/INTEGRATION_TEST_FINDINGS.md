# Integration Test Findings - 통합 테스트 발견 사항

## 2026-02-02 - 초기 탐색 결과

### 환경 구성 완료 ✅

1. **학생 앱 웹 빌드**: 성공 (http://localhost:10001)
2. **플래너 앱 개발 서버**: 실행 중 (http://localhost:3000)
3. **Playwright 설정**: Multi-context 지원 추가
4. **테스트 스크립트**: package.json에 추가

### UI 구조 분석

#### 플래너 웹 앱 (localhost:3000)

**초대 코드 생성 UI** (`/dashboard/students`):
- 버튼: "초대 코드 생성"
- 코드 표시 모달:
  ```html
  <span class="text-2xl font-mono font-bold text-blue-600">{inviteCode}</span>
  ```
- 버튼: "닫기" (모달 닫기)
- 복사 버튼 포함

**API 호출**:
```typescript
await supabase.rpc('create_invite_code')
// Returns: { success: true, code: "ABC123" }
```

#### 학생 모바일 앱 (localhost:10001)

**React Native Web 렌더링 확인**:
- ✅ 표준 HTML `<input>` 요소 사용
- ✅ `placeholder`, `type` 속성 정상 작동
- ✅ Playwright 표준 셀렉터 사용 가능

**회원가입 화면** (`/register` or signup):
```typescript
// 현재 확인된 필드:
- 이름: <input placeholder="이름">
- 이메일: <input placeholder="이메일" type="email">
- 비밀번호: <input placeholder="비밀번호" type="password">
- 비밀번호 확인: <input placeholder="비밀번호 확인" type="password">
- 버튼: "회원가입"
```

**ConnectPlannerScreen** (onboarding 단계):
```typescript
// 코드에서 확인된 필드 (ConnectPlannerScreen.tsx):
- 이름: <TextInput placeholder="홍길동" />
- 전화번호: <TextInput placeholder="010-1234-5678" />
- 이메일: <TextInput placeholder="student@example.com" type="email" />
- 플래너 초대 코드: <TextInput placeholder="AB12CD" />
- 버튼: "플래너와 연결하기"
- Skip 버튼: "나중에 연결하기"
```

**API 호출**:
```typescript
await supabase.rpc('connect_student_with_info', {
  invite_code_input: inviteCode,
  student_name: name,
  student_phone: phone,
  student_email: email
})
```

### 🔴 발견된 문제점

#### 1. 학생 앱 플로우 불일치

**예상했던 플로우**:
```
회원가입 화면 → 초대코드 입력 포함 → 즉시 연결
```

**실제 플로우 (추정)**:
```
회원가입 화면 (기본 정보만) → 로그인 → ConnectPlannerScreen (초대코드 입력)
```

또는:
```
초대 링크 클릭 → ConnectPlannerScreen (회원가입 + 초대코드 동시)
```

**불확실한 사항**:
- ConnectPlannerScreen이 언제 나타나는가?
  - 회원가입 직후 자동 표시?
  - 별도 온보딩 단계?
  - 초대 링크를 통한 직접 접근?
- 회원가입과 플래너 연결이 별도 단계인가, 하나의 플로우인가?

#### 2. 테스트 시나리오 재설계 필요

현재 작성된 테스트 (`06-invite-code-flow.spec.ts`)는 다음을 가정:
```typescript
// ❌ 현재 테스트의 가정 (잘못됨)
await studentPage.click('button:has-text("시작하기")');
await studentPage.fill('input[placeholder*="초대 코드"]', inviteCode);
// ... 한 화면에서 모든 필드 입력
```

실제로는:
1. 회원가입 화면에서 기본 정보 입력
2. 인증 완료 후 ConnectPlannerScreen 표시 (추정)
3. 초대코드 및 추가 정보 입력

### 📋 다음 단계 옵션

#### Option A: 실제 플로우 완전 파악 (권장)
1. 학생 앱을 직접 조작하여 완전한 플로우 확인
2. ConnectPlannerScreen 진입 방법 명확화
3. 테스트 시나리오를 실제 플로우에 맞게 수정

**방법**:
- 수동으로 localhost:10001 접속
- 회원가입 → 로그인 → 다음 화면 확인
- 각 단계의 URL, 필드, 버튼 기록

#### Option B: 코드 분석으로 플로우 파악
1. `RootNavigator.tsx` 읽기 - 네비게이션 로직 확인
2. Auth flow 확인 - 회원가입 후 이동 경로
3. Onboarding flow 확인 - ConnectPlannerScreen 표시 조건

**필요한 파일**:
- `apps/student/src/navigation/RootNavigator.tsx`
- `apps/student/src/screens/auth/*.tsx`
- `apps/student/src/navigation/AuthStackNavigator.tsx` (있다면)

#### Option C: 간소화된 테스트 시작
1. 우선 플래너 앱의 초대 코드 생성만 테스트
2. 학생 앱 테스트는 플로우 파악 후 추가
3. 단계별 점진적 구현

### 🎯 권장 진행 방향

**1단계: 플로우 명확화**
- Option B (코드 분석)을 먼저 시도
- RootNavigator와 Auth flow 확인
- ConnectPlannerScreen 진입 조건 파악

**2단계: 테스트 수정**
- 실제 플로우에 맞게 테스트 재작성
- 각 단계별 helper 함수 생성
- 명확한 선택자 사용

**3단계: 실행 및 검증**
- 첫 번째 테스트 케이스부터 하나씩 실행
- 발견되는 문제 즉시 수정
- 기능별 완전히 완료 후 다음 기능 진행

### 📝 메모

- React Native Web은 표준 HTML input을 렌더링 ✅
- Playwright 표준 셀렉터 사용 가능 ✅
- 두 서버 모두 정상 실행 중 ✅
- 테스트 인프라 준비 완료 ✅
- **학생 앱 실제 플로우 파악 필요** 🔴

---

**다음 액션**:
1. RootNavigator.tsx 읽고 네비게이션 로직 파악
2. 실제 학생 앱 플로우 문서화
3. 테스트 시나리오 업데이트
