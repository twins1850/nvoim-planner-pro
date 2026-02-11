# 파일 정리 계획

## 📊 현재 상태

- **총 파일**: 268개 (루트 폴더)
- **Markdown 문서**: 약 50개
- **이미지 파일**: 203개
- **SQL 파일**: 4개

## 🎯 제안하는 폴더 구조

```
/
├── docs/
│   ├── status/              # 개발 상태 문서 (10개)
│   │   ├── DEVELOPMENT_STATUS.md (메인)
│   │   ├── IMPLEMENTATION_STATUS.md
│   │   ├── HOMEWORK_FEATURE_STATUS.md
│   │   └── ...
│   │
│   ├── guides/              # 가이드 문서 (9개)
│   │   ├── QUICK_START_GUIDE.md
│   │   ├── TESTING_GUIDE.md
│   │   ├── MIGRATION_GUIDE.md
│   │   └── ...
│   │
│   ├── implementation/      # 구현 문서 (8개)
│   │   ├── IMPLEMENTATION_PLAN.md
│   │   ├── LICENSE_SYSTEM_IMPLEMENTATION.md
│   │   ├── REALTIME_IMPLEMENTATION.md
│   │   └── ...
│   │
│   ├── sessions/            # 세션 로그 (기존 + 새로운)
│   │   ├── 2026-02-11-1900.md
│   │   ├── SESSION_SUMMARY_*.md
│   │   └── ...
│   │
│   ├── snapshots/           # UI 스냅샷 문서 (13개)
│   │   ├── supabase-*.md
│   │   ├── dashboard-*.md
│   │   ├── student-app-*.md
│   │   └── ...
│   │
│   ├── troubleshooting/     # 문제 해결 문서 (5개)
│   │   ├── MIGRATION_ERROR_FIX.md
│   │   ├── URGENT_FIX_REQUIRED.md
│   │   ├── RLS_POLICY_TROUBLESHOOTING_GUIDE.md
│   │   └── ...
│   │
│   └── archive/             # 오래된/임시 문서
│       ├── CRITICAL_UPDATE_*.md
│       ├── PHASE*_COMPLETE.md
│       └── ...
│
├── screenshots/             # 스크린샷 이미지 (203개)
│   ├── ui/                  # UI 스크린샷
│   ├── testing/             # 테스트 스크린샷
│   └── documentation/       # 문서용 스크린샷
│
├── sql/                     # SQL 스크립트 (4개)
│   ├── migrations/          # 마이그레이션 스크립트
│   ├── fixes/               # 버그 수정 스크립트
│   └── admin/               # 관리자 스크립트
│
└── temp/                    # 임시 파일 (.backup, .old 등)
```

## 📝 파일 분류 규칙

### 1. docs/status/ (개발 상태)
- `*STATUS*.md`
- `*DEVELOPMENT*.md`
- 프로젝트 전체 진행 상황 문서

**이동 대상:**
- DEVELOPMENT_STATUS.md ⭐ (메인, 루트 유지)
- IMPLEMENTATION_STATUS.md
- HOMEWORK_FEATURE_STATUS.md
- PERFORMANCE_OPTIMIZATION_COMPLETE.md
- PHASE*_COMPLETE.md

### 2. docs/guides/ (가이드)
- `*GUIDE*.md`
- `*QUICK*.md`
- `*TESTING*.md`
- 사용자를 위한 가이드 문서

**이동 대상:**
- QUICK_START_GUIDE.md
- TESTING_GUIDE.md
- MIGRATION_GUIDE.md
- LESSONS_MIGRATION_GUIDE.md
- PLAYWRIGHT_CHROME_CONNECTION_GUIDE.md
- RLS_POLICY_TROUBLESHOOTING_GUIDE.md

### 3. docs/implementation/ (구현)
- `*IMPLEMENTATION*.md`
- `*PLAN*.md`
- 기능 구현 상세 문서

**이동 대상:**
- IMPLEMENTATION_PLAN.md
- IMPLEMENTATION_SUMMARY.md
- LICENSE_SYSTEM_IMPLEMENTATION.md
- REALTIME_IMPLEMENTATION.md
- COURSE_MANAGEMENT_DEVELOPMENT.md

### 4. docs/sessions/ (세션 로그)
- `SESSION_*.md`
- `*session*.md`
- 개발 세션 기록

**이동 대상:**
- SESSION_SUMMARY_*.md
- 개발일지_*.md

### 5. docs/snapshots/ (UI 스냅샷)
- `supabase-*.md`
- `dashboard-*.md`
- `student-app-*.md`
- `*after-*.md`, `*before-*.md`
- UI 상태 기록 문서

**이동 대상:**
- supabase-*.md (약 10개)
- dashboard-*.md
- student-app-*.md
- sql-editor-*.md
- after-*.md, before-*.md

### 6. docs/troubleshooting/ (문제 해결)
- `*FIX*.md`
- `*ERROR*.md`
- `*TROUBLESHOOTING*.md`
- 버그 수정 및 문제 해결

**이동 대상:**
- MIGRATION_ERROR_FIX.md
- QUICK_FIX.md
- URGENT_FIX_REQUIRED.md
- RLS_POLICY_TROUBLESHOOTING_GUIDE.md (중복)

### 7. docs/archive/ (아카이브)
- 완료된 phase 문서
- 오래된 critical update 문서
- 임시 테스트 문서

**이동 대상:**
- CRITICAL_UPDATE_*.md
- PHASE*_VERIFICATION.md
- PHASE*_TEST_*.md
- calendar-state-*.md
- planner-*.md (테스트 기록)

### 8. screenshots/ (이미지)
- `*.png` (203개)
- 스크린샷 및 다이어그램

**분류:**
- ui/ - UI 스크린샷
- testing/ - 테스트 결과
- documentation/ - 문서용 이미지

### 9. sql/ (SQL 스크립트)
- `*.sql`
- 데이터베이스 스크립트

**분류:**
- migrations/ - 마이그레이션
- fixes/ - 버그 수정
- admin/ - 관리자 작업

## 🔄 자동 정리 규칙

향후 생성되는 파일들을 위한 규칙:

### 파일명 패턴 → 폴더 매핑

```typescript
const fileOrganizationRules = {
  // 개발 상태
  /.*STATUS.*\.md/i: 'docs/status/',
  /.*DEVELOPMENT.*\.md/i: 'docs/status/',

  // 가이드
  /.*GUIDE.*\.md/i: 'docs/guides/',
  /.*QUICK.*\.md/i: 'docs/guides/',

  // 구현
  /.*IMPLEMENTATION.*\.md/i: 'docs/implementation/',
  /.*PLAN.*\.md/i: 'docs/implementation/',

  // 세션
  /SESSION.*\.md/i: 'docs/sessions/',
  /^개발일지.*\.md/: 'docs/sessions/',
  /^\d{4}-\d{2}-\d{2}.*\.md/: 'docs/sessions/',

  // 스냅샷
  /supabase-.*\.md/: 'docs/snapshots/',
  /dashboard-.*\.md/: 'docs/snapshots/',
  /student-app-.*\.md/: 'docs/snapshots/',

  // 문제 해결
  /.*FIX.*\.md/i: 'docs/troubleshooting/',
  /.*ERROR.*\.md/i: 'docs/troubleshooting/',
  /.*TROUBLESHOOTING.*\.md/i: 'docs/troubleshooting/',

  // 이미지
  /.*\.png$/: 'screenshots/',
  /.*\.jpg$/: 'screenshots/',
  /.*\.jpeg$/: 'screenshots/',

  // SQL
  /.*\.sql$/: 'sql/',
}
```

## ✅ 실행 계획

### Phase 1: 폴더 생성
```bash
mkdir -p docs/{status,guides,implementation,sessions,snapshots,troubleshooting,archive}
mkdir -p screenshots/{ui,testing,documentation}
mkdir -p sql/{migrations,fixes,admin}
mkdir -p temp
```

### Phase 2: 파일 이동
1. Markdown 문서 (50개)
2. 이미지 파일 (203개)
3. SQL 파일 (4개)

### Phase 3: 검증
- 이동된 파일 개수 확인
- 깨진 링크 없는지 확인
- README 업데이트

### Phase 4: Git 정리
- .gitignore 업데이트
- 불필요한 파일 제외

## 🛡️ 보존 규칙

**루트에 유지할 파일:**
- README.md
- DEVELOPMENT_STATUS.md (메인 상태 문서)
- CLAUDE.md
- package.json
- tsconfig.json
- next.config.ts
- 기타 설정 파일

**백업:**
- 모든 이동 작업 전 백업 생성
- `git commit` 또는 `.backup` 폴더

## 📊 예상 결과

**Before:**
```
/ (268개 파일)
├── *.md (50개)
├── *.png (203개)
├── *.sql (4개)
└── ...
```

**After:**
```
/ (깔끔!)
├── docs/ (50개 문서, 체계적 정리)
├── screenshots/ (203개 이미지, 카테고리별)
├── sql/ (4개 스크립트, 목적별)
├── README.md
├── DEVELOPMENT_STATUS.md
└── 설정 파일들
```

## 🚀 실행 명령어

```bash
# 1. 폴더 생성
./scripts/create-folders.sh

# 2. 파일 이동
./scripts/organize-files.sh

# 3. 검증
./scripts/verify-organization.sh

# 4. Git 커밋
git add .
git commit -m "docs: Reorganize project files into structured folders"
```

---

**실행 승인 필요 여부**: 예
**예상 소요 시간**: 5-10분
**롤백 가능 여부**: 예 (Git 사용)
