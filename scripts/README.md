# 🛠️ 개발 효율화 스크립트 가이드

**작성일**: 2026-02-13
**목적**: Migration 관리 자동화 및 개발 워크플로우 효율화

---

## 📋 스크립트 목록

### 1. `apply-migrations.sh` - 자동 Migration 적용
**용도**: 모든 migration 파일을 Local Docker Supabase에 자동 적용

**사용법**:
```bash
./scripts/apply-migrations.sh
```

**기능**:
- ✅ `supabase/migrations/` 디렉토리의 모든 `.sql` 파일 자동 감지
- ✅ 순서대로 Local Docker Supabase에 적용
- ✅ 성공/실패 건수 요약 표시
- ✅ homework-submissions bucket 상태 자동 확인

**예상 출력**:
```
================================================
🚀 Migration 자동 적용 스크립트
================================================

✅ Supabase Docker 컨테이너 실행 중

📋 총 21개의 migration 파일 발견

📄 적용 중: 025_create_homework_submissions_bucket.sql
   ✅ 성공

================================================
📊 적용 결과
================================================
✅ 성공: 21개

🔍 homework-submissions bucket 상태 확인:
          id          |         name         |     allowed_mime_types
----------------------+----------------------+---------------------------
 homework-submissions | homework-submissions | {audio/webm,audio/mp4,...}

🎉 Migration 적용 완료!
```

---

### 2. `sync-to-cloud.sh` - Local ↔ Cloud 동기화
**용도**: Migration을 Local과 Cloud Supabase 모두에 적용

**사용법**:
```bash
./scripts/sync-to-cloud.sh
```

**기능**:
- ✅ Step 1: Local Docker Supabase 동기화 (apply-migrations.sh 실행)
- ✅ Step 2: Cloud Supabase 동기화 (Supabase CLI 사용)
- ✅ .env 파일에서 자동으로 Cloud URL 감지
- ✅ Supabase CLI 미설치 시 수동 가이드 제공

**필수 조건**:
- Cloud 동기화를 원하면 `.env.local`에 다음 설정 필요:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  ```
- Supabase CLI 설치 (선택):
  ```bash
  npm install -g supabase
  ```

**예상 출력**:
```
================================================
🔄 Local ↔ Cloud Supabase 동기화
================================================

✅ Cloud Supabase URL 감지: https://ybcjkdcdruquqrdahtga.supabase.co

──────────────────────────────────────────────
📦 Step 1: Local Docker Supabase 동기화
──────────────────────────────────────────────

[apply-migrations.sh 출력...]

──────────────────────────────────────────────
☁️  Step 2: Cloud Supabase 동기화
──────────────────────────────────────────────

⚠️  Supabase CLI가 설치되지 않았습니다.

💡 대안: Supabase Studio에서 수동으로 SQL 실행
   1. https://supabase.com/dashboard 접속
   2. SQL Editor 열기
   3. 아래 파일 내용 복사 후 실행:

📋 최근 migration 파일 (최신 5개):
     1  supabase/migrations/028_scheduled_homework_delivery.sql
     2  supabase/migrations/025_create_homework_submissions_bucket.sql
     3  supabase/migrations/024_homework_submissions_storage_policies.sql
     ...

🚨 반드시 적용해야 할 Migration:
   - 025_create_homework_submissions_bucket.sql
   - 024_homework_submissions_storage_policies.sql
```

---

## 🔧 Git Hooks (자동 실행)

### Pre-commit Hook
**위치**: `.git/hooks/pre-commit`
**실행 시점**: `git commit` 명령어 실행 시 자동

**검증 항목**:
1. ❌ **차단**: Migration 파일이 unstaged 상태이면 커밋 불가
2. ⚠️ **경고**: 리포트 파일(\_REPORT.md)이 untracked 상태이면 경고
3. ✅ **안내**: 새로운 migration 파일 감지 시 적용 권장 메시지

**예시 시나리오**:

**시나리오 1: Migration 파일 unstaged**
```bash
$ git commit -m "Add new feature"

🔍 Pre-commit 검증 시작...
❌ ERROR: Migration 파일이 unstaged 상태입니다!
다음 파일들을 stage 해주세요:
  - supabase/migrations/025_create_homework_submissions_bucket.sql

💡 해결 방법:
  git add supabase/migrations/
```

**시나리오 2: 리포트 파일 untracked**
```bash
$ git commit -m "Implement audio upload"

🔍 Pre-commit 검증 시작...
⚠️  WARNING: 리포트 파일이 Git에 추가되지 않았습니다!
다음 파일들을 보존하려면 추가하세요:
  - AUDIO_SUBMISSION_E2E_TEST_REPORT.md

💡 리포트를 보존하려면:
  git add *_REPORT.md

계속하시겠습니까? (y/N)
```

**시나리오 3: 정상 커밋**
```bash
$ git add .
$ git commit -m "Add migration 025"

🔍 Pre-commit 검증 시작...

📝 새로운 migration 파일 감지:
  ✅ supabase/migrations/025_create_homework_submissions_bucket.sql

💡 권장사항: 커밋 후 즉시 적용하세요:
  ./scripts/apply-migrations.sh

✅ Pre-commit 검증 통과
```

---

## 📖 사용 워크플로우

### 새로운 Migration 생성 시

**Step 1: Migration 파일 생성**
```bash
# 파일 생성
vi supabase/migrations/029_new_feature.sql
```

**Step 2: Git에 즉시 추가**
```bash
# Pre-commit hook이 검증함
git add supabase/migrations/029_new_feature.sql
git commit -m "feat(db): Add new feature migration"
```

**Step 3: Local에 적용**
```bash
# 자동 적용 스크립트 실행
./scripts/apply-migrations.sh
```

**Step 4: Cloud에도 적용 (선택)**
```bash
# Local + Cloud 동시 동기화
./scripts/sync-to-cloud.sh

# 또는 Supabase Studio에서 수동 실행
# https://supabase.com/dashboard → SQL Editor
```

---

### 매일 개발 시작 시

**Step 1: 최신 코드 Pull**
```bash
git pull origin main
```

**Step 2: Migration 동기화**
```bash
# Local Docker에 최신 migration 적용
./scripts/apply-migrations.sh
```

**Step 3: 개발 서버 시작**
```bash
npm run dev
```

---

### 배포 전 체크리스트

- [ ] ✅ 모든 migration 파일이 Git에 커밋됨
- [ ] ✅ Local Docker에 migration 적용됨 (`./scripts/apply-migrations.sh`)
- [ ] ✅ Cloud Supabase에 migration 적용됨 (`./scripts/sync-to-cloud.sh`)
- [ ] ✅ E2E 테스트 통과 (`npm run test:e2e`)
- [ ] ✅ Production 환경 변수 확인 (NEXT_PUBLIC_SUPABASE_URL)

---

## 🐛 트러블슈팅

### Q1: "Supabase Docker 컨테이너가 실행 중이 아닙니다"
**해결**:
```bash
npx supabase start
```

### Q2: "Migration 적용 실패 (이미 적용되었거나 에러 발생)"
**원인**: 이미 적용된 migration이거나 SQL 문법 오류

**해결**:
```bash
# 특정 migration만 재실행
cat supabase/migrations/025_*.sql | docker exec -i supabase_db_nvoim-planer-pro psql -U postgres -d postgres
```

### Q3: "Cloud Supabase URL을 찾을 수 없습니다"
**해결**:
```bash
# .env.local 파일 생성
echo "NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co" >> .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key" >> .env.local
```

### Q4: Pre-commit hook이 실행되지 않음
**해결**:
```bash
# Hook 실행 권한 확인
chmod +x .git/hooks/pre-commit

# Hook 동작 테스트
.git/hooks/pre-commit
```

---

## 💡 추가 팁

### Migration 파일 네이밍 규칙
```
[번호]_[설명].sql

예시:
025_create_homework_submissions_bucket.sql
026_fix_planner_storage_access.sql
027_fix_notifications_rls_policy.sql
```

### 권장 개발 습관
1. ✅ Migration 파일 생성 → 즉시 Git 커밋
2. ✅ 커밋 후 → 즉시 `./scripts/apply-migrations.sh` 실행
3. ✅ 매일 시작 시 → `git pull` 후 migration 동기화
4. ✅ 배포 전 → Cloud Supabase 동기화 확인

---

**마지막 업데이트**: 2026-02-13
**작성자**: Claude Code (Sonnet 4.5)
