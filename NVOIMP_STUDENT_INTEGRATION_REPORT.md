# nvoimp 학생 연동 고도화 - 최종 개발 보고서

**작성일**: 2026년 2월 19일
**버전**: Phase 고도화 v1.0 완료

---

## 1. 개요

### 1.1 목적
앤보임 플래너 프로와 nvoimp.com 간의 학생 연동 흐름을 자동화하여, 플래너가 nvoimp 학생 목록에서 학생을 선택하고 초대 코드를 일괄 생성할 수 있도록 구현.

### 1.2 Before/After

| 항목 | 이전 | 이후 |
|------|------|------|
| 학생 목록 조회 | 0명 반환 (파싱 버그) | 31명 수강회원만 정확 반환 |
| 초대 코드 유효기간 | 24시간 | **7일** |
| 종료회원 필터링 | ❌ 미작동 (265명 혼재) | ✅ 수강회원 31명만 표시 |
| 신규 학생 이름 표시 | "Unknown" | 실제 이름 정상 표시 |
| 라이선스 현황 | 미표시 | "0/30명 사용 중" 실시간 표시 |
| 앱 연결 상태 | 미표시 | ✅/🟡/⬜ 배지로 표시 |
| 초대 코드 생성 | 수동 (별도 탭) | 체크박스 선택 후 원클릭 생성 |

---

## 2. 구현 내용

### 2.1 API 개발

#### `GET /api/nvoimp/sync-students`
nvoimp.com에서 수강회원 목록을 가져와 플래너 앱 연결 상태와 함께 반환.

**핵심 로직:**
```
1. nvoimp.com 로그인 (쿠키 획득)
2. StudentManage.asp 크롤링
3. <select id="SearchID"> 파싱 → 수강회원만 필터링
4. students 테이블에서 연결 상태 조회
5. invite_codes 테이블에서 유효 코드 만료일 조회
6. get_license_student_status RPC 호출
7. 통합 응답 반환
```

**반환 데이터:**
```json
{
  "nvoimp_students": [
    {
      "nvoimp_student_id": "jacob2012",
      "name": "강병규",
      "app_connected": false,
      "invite_pending": false,
      "invite_days_left": null
    }
  ],
  "license_status": {
    "max_students": 30,
    "current_students": 0,
    "remaining_slots": 30,
    "has_license": true
  }
}
```

#### `POST /api/nvoimp/import-students`
선택된 학생들에게 초대 코드를 일괄 생성.

**핵심 로직:**
```
1. 라이선스 슬롯 확인 (부족 시 400 에러)
2. 기존 students 레코드 확인 (중복 방지)
3. 신규: invite_codes 삽입 (7일 유효기간)
4. students upsert (teacher_id, nvoimp_student_id 기준)
5. 결과 반환 (new/already_imported/already_connected)
```

### 2.2 파싱 엔진 개선

nvoimp.com 학생 목록 파싱 방식을 3단계에 걸쳐 개선:

#### 1차 시도: 테이블 행 파싱 (실패)
```typescript
// F_STDT_ID=(\d+) 패턴으로 숫자 ID 추출 시도
// → 실제 ID는 숫자가 아닌 문자열 로그인 ID (jacob2012, kzo1002 등)
// → 0명 반환
```

#### 2차 시도: select 파싱 (부분 성공)
```typescript
// <select id="SearchID"> 파싱
// → <option value="jacob2012" >(공백) 매칭 실패
// → fallback 동작으로 15명만 반환
```

#### 3차 (최종): 패턴 수정 + 필터 강화
```typescript
// [^>]*> 패턴으로 공백 처리
// status !== '수강회원' 으로 강한 필터링
// → 수강회원 31명 정확 반환 ✅
```

### 2.3 UI 개선

**NvoimSettings.tsx 학생 임포트 섹션:**
```
라이선스: 0/30명 사용 중 (30슬롯 남음)

☐ 미등록 전체 선택 (31명)
─────────────────────────────────
☑ 강병규   ID: jacob2012   ⬜ 미등록
☑ 김시온   ID: kzo1002     ✅ 앱 연결됨
☐ 김영원   ID: kyw0408     🟡 초대 중 (D-5일)
...

[초대 코드 생성]
```

---

## 3. 버그 수정 상세

### Bug #1: 학생 목록 0명 반환
- **파일**: `sync-students/route.ts`
- **원인**: `parseStudentListHtml`이 `F_STDT_ID=(\d+)` 패턴으로 테이블 행 파싱 시도. 실제 nvoimp.com은 `<select id="SearchID">`에 전체 학생을 포함하며, ID는 숫자(F_STDT_ID)가 아닌 로그인 ID 문자열.
- **수정**: `<select id="SearchID">` 옵션 전체 파싱으로 전환.

### Bug #2: 15명만 반환 (fallback 동작)
- **파일**: `sync-students/route.ts`
- **원인**: nvoimp HTML에서 `<option value="jacob2012" >` 형태로 value와 `>` 사이에 공백 존재. `">(` 패턴이 매칭 실패 → fallback으로 현재 페이지 테이블 파싱 (15명).
- **수정**: `[^>]*>(` 패턴 사용 (`[^>]*`이 공백 포함 모든 문자 처리).

### Bug #3: 265명 반환 (종료회원 혼재)
- **파일**: `sync-students/route.ts`
- **원인**: 기존 필터 `if (status && status !== '수강회원') continue`에서 `status`가 `undefined`일 때 `&&`가 단락평가(short-circuit)로 false → continue 실행 안됨 → 종료회원 포함.
- **수정**: `if (status !== '수강회원') continue`로 강화. status가 없는 항목(전체선택 옵션 등)도 제외.
- **결과**: 265명 → 31명 (수강회원만 정확 반환).

### Bug #4: 신규 학생 "Unknown" 표시
- **파일**: `StudentsContent.tsx`
- **원인**: `name: profile?.full_name || 'Unknown'`에서 `profile`은 `profiles` 테이블을 참조하는데, nvoimp에서 임포트된 학생은 `profiles` 테이블에 레코드가 없고 `student_profiles` 테이블에만 있음.
- **수정**: `name: sp.full_name || profile?.full_name || 'Unknown'`으로 `student_profiles` 테이블 우선 참조.

---

## 4. 검증 결과

### 4.1 API 테스트

| 테스트 항목 | 결과 |
|-------------|------|
| nvoimp.com 로그인 | ✅ 성공 |
| 학생 목록 파싱 | ✅ 31명 (수강회원만) |
| 종료회원 필터링 | ✅ 제외 확인 (265 → 31) |
| 라이선스 현황 조회 | ✅ 0/30명 정상 반환 |
| 초대 코드 생성 API | ✅ 7일 유효기간으로 생성 |
| 중복 방지 | ✅ 기존 코드 재사용 |

### 4.2 UI 테스트 (Playwright)

| 테스트 항목 | 결과 |
|-------------|------|
| 설정 → 앤보임 연동 탭 | ✅ 정상 로드 |
| "학생 목록 불러오기" 클릭 | ✅ 31명 수강회원 목록 표시 |
| 라이선스 배지 표시 | ✅ "0/30명 사용 중 (30슬롯 남음)" |
| 학생 연결 상태 배지 | ✅ ⬜ 미등록 / ✅ 앱 연결됨 표시 |
| 학생 관리 페이지 이름 표시 | ✅ "Unknown" 없이 실제 이름 표시 |

### 4.3 E2E 연동 테스트 (이전 세션에서 확인)

```
플래너: 초대 코드 생성 → 코드 복사
학생앱: 초대 코드 입력 → 연결
플래너: is_connected = true, ✅ 앱 연결됨 표시
```
✅ E2E 흐름 정상 작동 확인

---

## 5. 현재 시스템 아키텍처

```
플래너 웹앱 (Next.js)
├── /dashboard/settings?tab=nvoimp
│   ├── NvoimSettings.tsx
│   │   ├── 앤보임 로그인 정보 저장
│   │   ├── 학생 임포트 (학생 목록 불러오기 → 초대 코드 생성)
│   │   └── 최근 동기화 내역
│   └── API Routes
│       ├── GET /api/nvoimp/sync-students    ← 학생 목록 + 상태
│       ├── POST /api/nvoimp/import-students ← 초대 코드 생성
│       ├── POST /api/nvoimp/sync-feedback   ← 피드백 수집+번역
│       └── POST /api/nvoimp/credentials     ← 자격증명 저장
│
Supabase
├── nvoimp_credentials (암호화된 로그인 정보)
├── students (teacher_id, nvoimp_student_id, invite_code, is_connected)
├── invite_codes (code, expires_at, student_id)
├── lesson_feedback (원어민 피드백 + 한글 번역)
└── nvoimp_sync_log (동기화 이력)
│
Edge Functions (Supabase)
├── nvoimp-sync-onestop (출결 자동화, 30분 주기)
└── nvoimp-sync-feedback (피드백 번역, 1시간 주기)
│
학생 앱 (React Native Expo)
└── LessonFeedbackScreen (한글 번역 피드백 표시)
```

---

## 6. 남은 작업 / 향후 개선 사항

| 항목 | 우선순위 | 비고 |
|------|----------|------|
| 초대 코드 카카오톡/문자 공유 버튼 | 중 | 현재 클립보드 복사만 구현 |
| 학생 앱 - 초대 코드 입력 UI 개선 | 중 | 현재 기본 텍스트 입력 |
| nvoimp 피드백 실제 학생과 매핑 | 높음 | nvoimp_student_id 연결 후 동기화 |
| pg_cron 출결 동기화 실제 작동 확인 | 중 | 수업 데이터 필요 |
| 라이선스 업그레이드 유도 UI | 낮음 | 슬롯 소진 시 안내 메시지 |

---

## 7. 결론

nvoimp.com 학생 연동 고도화 작업이 완료되었습니다.

- **파싱 버그 3개** 수정으로 학생 목록 조회 정상화 (0명 → 31명 수강회원 정확 반환)
- **초대 코드 7일 유효기간** 적용으로 실무 적합성 향상
- **수강회원 필터링** 정확 작동으로 종료회원 혼재 문제 해결
- **라이선스 슬롯 실시간 표시** 및 **앱 연결 상태 배지**로 플래너 UX 개선
- **E2E 흐름** (nvoimp → 초대 코드 → 학생 앱 연결) 검증 완료
