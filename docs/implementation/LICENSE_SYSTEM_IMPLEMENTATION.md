# 라이선스 시스템 구현 현황

## 개요

NVOIM Planner Pro의 License-First 방식 라이선스 시스템 구현 상황을 정리한 문서입니다.

**구현 일자**: 2026-01-16
**구현 방식**: License-First (라이선스 키 먼저 생성 → 플래너 활성화)

---

## ✅ 완료된 작업

### 1. 데이터베이스 스키마 설계 (Phase 5)

**파일**: `supabase/migrations/018_license_first_system.sql`

**주요 변경사항**:
- `licenses` 테이블의 `planner_id` 컬럼을 NULL 허용으로 변경
- 새로운 컬럼 추가:
  - `purchased_by_email`: 구매자 이메일 (활성화 전)
  - `activated_at`: 라이선스 활성화 시간
  - `activated_by_user_id`: 활성화한 사용자 ID
  - `device_tokens`: 등록된 디바이스 정보 (JSONB)
  - `max_devices`: 최대 디바이스 수 (기본값: 2개)

**제약 조건**:
- `active_license_must_have_planner`: active 상태의 라이선스는 반드시 planner_id 필수

**인덱스**:
- `idx_licenses_status`: 상태별 검색 최적화
- `idx_licenses_purchased_by_email`: 이메일 검색 최적화
- `idx_licenses_activated_at`: 활성화 시간 정렬 최적화

**RLS 정책**:
- `Planners can view their own licenses`: 플래너가 자신의 라이선스 또는 이메일로 조회
- `Planners can activate their licenses`: 활성화 전 또는 자신의 라이선스 수정 가능

### 2. 디바이스 핑거프린팅 라이브러리

**파일**: `apps/planner-web/src/lib/deviceFingerprint.ts`

**기능**:
- `generateDeviceFingerprint()`: 브라우저 특성 기반 SHA-256 해시 생성
- `getCanvasFingerprint()`: Canvas 렌더링 기반 추가 고유성
- `getDeviceDescription()`: 사용자 친화적인 디바이스 설명 생성

**수집 정보**:
- User Agent
- 화면 해상도 (너비 x 높이 x 색상 깊이)
- 시간대 (Timezone)
- 언어 설정
- 플랫폼 정보
- 하드웨어 동시 실행 수
- Canvas 렌더링 특성

### 3. 라이선스 키 생성 및 파싱 유틸리티

**파일**: `apps/planner-web/src/lib/licenseGenerator.ts`

**기능**:
- `generateLicenseKey(durationDays, maxStudents)`: 라이선스 키 생성
- `generateBulkLicenseKeys()`: 대량 라이선스 키 생성
- `validateEncryptionKey()`: 암호화 키 검증

**라이선스 키 형식**:
```
{duration}D-{max_students}P-{encryption_key}
예시: 30D-15P-A1B2C3D4E5F6G7H8
```

**파일**: `apps/planner-web/src/lib/licenseUtils.ts`

**기능**:
- `parseLicenseKey()`: 라이선스 키 파싱
- `validateLicenseKeyFormat()`: 형식 검증
- `normalizeLicenseKey()`: 대문자 변환 및 공백 제거

---

## 📋 데이터베이스 스키마

### licenses 테이블 (업데이트됨)

```sql
CREATE TABLE public.licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_id UUID REFERENCES public.profiles(id), -- NULL 허용
  license_key TEXT UNIQUE NOT NULL,
  duration_days INTEGER NOT NULL,
  max_students INTEGER NOT NULL,
  status TEXT CHECK (status IN ('pending', 'active', 'expired')) DEFAULT 'pending',

  -- License-First 추가 컬럼
  purchased_by_email TEXT,
  activated_at TIMESTAMPTZ,
  activated_by_user_id UUID,
  device_tokens JSONB DEFAULT '[]'::jsonb,
  max_devices INTEGER DEFAULT 2,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- 제약 조건
  CONSTRAINT active_license_must_have_planner
    CHECK (status != 'active' OR planner_id IS NOT NULL)
);
```

### device_tokens JSONB 구조

```json
[
  {
    "fingerprint": "a1b2c3d4e5f6...",
    "registered_at": "2026-01-12T10:00:00Z",
    "last_seen": "2026-01-12T15:30:00Z",
    "user_agent": "Mozilla/5.0...",
    "description": "Chrome on Windows"
  }
]
```

---

## 🔄 라이선스 워크플로우

### License-First 방식

```
1. 관리자가 라이선스 키 생성 (planner_id = NULL, status = 'pending')
   ↓
2. 관리자가 플래너에게 라이선스 키 전달 (이메일/메신저)
   ↓
3. 플래너가 앱 최초 실행 시 라이선스 키 입력
   ↓
4. 디바이스 핑거프린트 생성 및 라이선스 검증
   ↓
5. 디바이스 등록 (device_tokens 업데이트)
   ↓
6. 가입 페이지로 이동 (개인정보 입력)
   ↓
7. 계정 생성 시 라이선스와 연결
   - planner_id 업데이트
   - status → 'active'
   - activated_at 기록
```

### 디바이스 제한

- 최대 2개 디바이스 등록 가능 (max_devices)
- 3번째 디바이스 등록 시도 시 에러 메시지 표시
- 등록된 디바이스 목록 확인 가능
- 현재 사용 중인 디바이스는 제거 불가

---

## 🔐 보안 고려사항

### 디바이스 핑거프린팅

**장점**:
- 웹 브라우저에서 사용 가능
- 하드웨어 변경 없이도 일정한 값 유지
- 추가 소프트웨어 설치 불필요

**한계**:
- 브라우저 업데이트 시 변경 가능성
- 시크릿 모드에서 다른 값 생성 가능
- VPN/프록시로 우회 가능

**완화 전략**:
- 2개 디바이스 허용으로 유연성 확보
- 관리자 페이지에서 수동 디바이스 재설정 기능 제공 예정
- 의심스러운 활동 모니터링 (추후 구현)

### RLS (Row Level Security) 정책

- 플래너는 자신의 라이선스만 조회/수정 가능
- 활성화 전 라이선스는 이메일로도 조회 가능
- active 상태 전환 시 planner_id 필수 제약 조건

---

## 📊 사용량 추적 (추후 구현)

### usage_tracking 테이블 (계획)

```sql
CREATE TABLE public.usage_tracking (
  id UUID PRIMARY KEY,
  planner_id UUID REFERENCES profiles(id) NOT NULL,
  tracked_date DATE NOT NULL DEFAULT CURRENT_DATE,
  student_count INTEGER DEFAULT 0,
  homework_count INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  storage_used_mb NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(planner_id, tracked_date)
);
```

**집계 주기**: 일일 (cron job)

---

## 🧪 테스트 시나리오

### 베타 테스터 30명 배포 시나리오

**Day 1: 라이선스 생성 및 배포**
1. admin.html에서 라이선스 30개 일괄 생성
2. Excel/Google Sheets에 정리
3. 이메일/카카오톡으로 개별 전송

**Day 2-7: 활성화 모니터링**
1. admin.html에서 활성화율 확인
2. 미활성화 테스터에게 리마인더 발송

**Week 2-4: 사용량 모니터링**
1. 테스터별 학생 수 확인
2. 숙제 생성 활동 확인
3. 피드백 수집

---

## ✅ 추가 완료된 작업 (2026-01-16)

### Phase 6-7: License-First 플로우 검증 완료
**파일**:
- `apps/planner-web/src/app/api/admin/licenses/generate/route.ts` - 이미 License-First 패턴 구현됨
- `apps/planner-web/src/app/api/auth/activate-license/route.ts` - 디바이스 핑거프린팅 및 검증 완료
- `apps/planner-web/src/app/license-activate/page.tsx` - 라이선스 활성화 페이지 완료
- `apps/planner-web/src/app/auth/signup/page.tsx` - 토큰 기반 가입 플로우 완료
- `apps/planner-web/src/middleware.ts` - 라이선스 검증, 만료 확인, 학생 수 제한 체크 완료

**주요 기능**:
- ✅ 라이선스 키 먼저 생성 (planner_id = NULL)
- ✅ 디바이스 핑거프린트 기반 검증
- ✅ 토큰 기반 활성화 플로우
- ✅ 미들웨어 라이선스 검증 (만료, 학생 수 제한)
- ✅ 관리자 권한 검증

### Phase 8: 디바이스 관리 UI 구현 완료
**파일**: `apps/planner-web/src/app/settings/devices/page.tsx`

**주요 기능**:
- ✅ 등록된 디바이스 목록 표시
- ✅ 현재 디바이스 자동 감지 및 강조 표시
- ✅ 디바이스 이름 편집 기능 (인라인 편집)
- ✅ 디바이스 제거 기능 (현재 디바이스 제외)
- ✅ 최대 디바이스 수 (2개) 표시
- ✅ User Agent 정보 표시
- ✅ 등록일/마지막 사용일 표시
- ✅ 설정 페이지 네비게이션 통합 (`apps/planner-web/src/app/settings/SettingsContent.tsx`)

**UI 특징**:
- 현재 디바이스는 파란색 배경으로 강조 표시
- 디바이스 이름 클릭하여 편집 가능
- 디바이스별 등록일/마지막 사용 시간 표시
- User Agent 정보로 브라우저/OS 확인 가능

---

## 🚀 향후 개선 사항 (선택사항)

### 관리자 페이지 개선
- [ ] admin.html UI 재설계 (현대적인 디자인)
- [ ] 라이선스 통계 대시보드
- [ ] 사용량 추적 시스템 (usage_tracking 테이블)

### 고급 디바이스 관리
- [ ] 디바이스 별칭 자동 감지 (Chrome on Windows, Safari on macOS 등)
- [ ] 디바이스 활동 로그 (로그인 이력)
- [ ] 의심스러운 디바이스 알림

### 라이선스 관리 고도화
- [ ] 라이선스 갱신 알림 시스템
- [ ] 자동 라이선스 만료 처리 (cron job)
- [ ] 라이선스 업그레이드 플로우 (학생 수 증가)

---

## 📝 참고 문서

- [계획서](/Users/twins/.claude/plans/starry-wibbling-liskov.md) - 전체 License-First 구현 계획
- [Supabase 스키마](/Users/twins/Downloads/nvoim-planer-pro/supabase/schema.sql) - 기존 데이터베이스 구조
- [admin.html](/Users/twins/Downloads/nvoim-planer-pro/apps/planner-web/public/admin.html) - 관리자 콘솔 (구 버전)
