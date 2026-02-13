# 회귀 방지 가이드 (Regression Prevention Guide)

**작성일**: 2026-02-13
**담당**: Claude Code (Sonnet 4.5)
**목적**: 개발 완료된 기능이 다음날 또 안 되는 상황 방지

---

## 🚨 문제 분석

### 발생한 회귀 사례

**사례 1: 음성 파일 업로드 기능 (2026-02-13)**
- **증상**: `StorageApiError: mime type audio/webm is not supported`
- **원인**: Migration 025 파일이 생성되었지만 Git에 커밋되지 않음
- **결과**: 다음날 세션 시작 시 migration 파일이 사라져 bucket이 존재하지 않음

### 근본 원인

1. ❌ **Migration 파일을 만들었지만 Git에 커밋하지 않음**
2. ❌ **세션 종료 후 unstaged 파일이 사라짐**
3. ❌ **다음날 다시 시작하면 이전 상태로 회귀**

---

## ✅ 회귀 방지 체크리스트

### 1. 개발 완료 후 필수 단계

**매번 개발 완료 시 아래 체크리스트를 실행하세요:**

```bash
# Step 1: Git Status 확인
git status

# Step 2: 새로 생성한 파일 확인
git status | grep "new file"

# Step 3: 모든 변경사항 Stage
git add .

# Step 4: 커밋 메시지 작성
git commit -m "타입(범위): 변경 사항 요약

- 상세 내용 1
- 상세 내용 2

Related: REPORT_FILE.md

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Step 5: 커밋 확인
git log --oneline -1

# Step 6: (선택) Remote에 Push
git push origin main
```

### 2. Migration 파일 생성 시 필수 단계

**모든 migration 파일은 즉시 Git에 커밋해야 합니다:**

```bash
# Migration 파일 생성 직후
git add supabase/migrations/[번호]_[파일명].sql

# 즉시 커밋
git commit -m "feat(db): [migration 설명]

Migration: [번호]_[파일명].sql

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Supabase에 적용
npx supabase db reset  # 로컬 개발 환경
# 또는
docker exec supabase_db_nvoim-planer-pro psql -U postgres -d postgres -f supabase/migrations/[파일명].sql

# 적용 확인
docker exec supabase_db_nvoim-planer-pro psql -U postgres -d postgres -c "SELECT * FROM storage.buckets WHERE id = 'homework-submissions';"
```

### 3. 코드 변경 시 필수 단계

**모든 코드 변경은 즉시 Git에 커밋해야 합니다:**

```bash
# 변경된 파일 확인
git status

# Stage
git add apps/student/src/screens/HomeworkSubmissionScreen.tsx

# 커밋
git commit -m "fix(student): Fix audio upload with Platform-specific handling

- Web: Use fetch(blob URL) for audio/webm
- iOS: Use expo-file-system for audio/m4a
- Android: Use expo-file-system for audio/mp4

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 🔧 자동화 도구

### Pre-Commit Hook 설정

**`.git/hooks/pre-commit` 파일 생성:**

```bash
#!/bin/bash

# Migration 파일이 unstaged 상태인지 확인
UNSTAGED_MIGRATIONS=$(git diff --name-only | grep "supabase/migrations/.*\.sql")

if [ -n "$UNSTAGED_MIGRATIONS" ]; then
  echo "❌ ERROR: Migration 파일이 unstaged 상태입니다!"
  echo "$UNSTAGED_MIGRATIONS"
  echo ""
  echo "다음 명령어로 stage하세요:"
  echo "  git add $UNSTAGED_MIGRATIONS"
  exit 1
fi

# MD 리포트 파일이 Git에 없는지 확인
UNTRACKED_REPORTS=$(git ls-files --others --exclude-standard | grep ".*_REPORT\.md")

if [ -n "$UNTRACKED_REPORTS" ]; then
  echo "⚠️  WARNING: 리포트 파일이 Git에 추가되지 않았습니다!"
  echo "$UNTRACKED_REPORTS"
  echo ""
  echo "리포트를 보존하려면 다음 명령어를 실행하세요:"
  echo "  git add $UNTRACKED_REPORTS"
  echo ""
  read -p "계속하시겠습니까? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo "✅ Pre-commit 체크 통과"
exit 0
```

**Hook 활성화:**

```bash
chmod +x .git/hooks/pre-commit
```

### 일일 백업 스크립트

**`scripts/daily-backup.sh` 파일 생성:**

```bash
#!/bin/bash

# 날짜 기반 백업 디렉토리
BACKUP_DIR="./backups/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

# Migration 파일 백업
cp -r supabase/migrations "$BACKUP_DIR/"

# 주요 코드 파일 백업
cp -r apps/student/src "$BACKUP_DIR/student-src"
cp -r apps/planner-web/src "$BACKUP_DIR/planner-src"

# 리포트 파일 백업
cp *_REPORT.md "$BACKUP_DIR/" 2>/dev/null || true

# Git 상태 저장
git status > "$BACKUP_DIR/git-status.txt"
git log --oneline -10 > "$BACKUP_DIR/git-log.txt"

echo "✅ 백업 완료: $BACKUP_DIR"
```

---

## 📋 일일 체크리스트

### 개발 시작 시

```bash
# 1. Git 상태 확인
git status

# 2. 최신 커밋 확인
git log --oneline -5

# 3. Supabase 상태 확인
npx supabase status

# 4. 주요 bucket 확인
docker exec supabase_db_nvoim-planer-pro psql -U postgres -d postgres -c "SELECT id, name FROM storage.buckets;"

# 5. 개발 서버 시작
npm run dev  # 또는 해당 명령어
```

### 개발 종료 시

```bash
# 1. 모든 변경사항 확인
git status

# 2. Unstaged 파일이 있는지 확인
git diff --name-only

# 3. 중요한 파일이 있다면 즉시 커밋
git add .
git commit -m "wip: [작업 내용]"

# 4. (선택) 백업 스크립트 실행
bash scripts/daily-backup.sh

# 5. Git log 확인
git log --oneline -3
```

---

## 🔄 복구 프로세스

### Migration 파일이 사라진 경우

**방법 1: Git 히스토리에서 복구**

```bash
# Git 히스토리에서 migration 파일 찾기
git log --all --full-history -- "supabase/migrations/025_*.sql"

# 파일 복구
git checkout <commit-hash> -- supabase/migrations/025_create_homework_submissions_bucket.sql

# Stage 및 커밋
git add supabase/migrations/025_create_homework_submissions_bucket.sql
git commit -m "chore: Restore missing migration 025"
```

**방법 2: MD 리포트에서 SQL 복사**

```bash
# 리포트 파일에서 SQL 찾기
grep -A 50 "INSERT INTO storage.buckets" HOMEWORK_AUDIO_FIX_REPORT.md

# 수동으로 migration 파일 재생성
# (내용을 복사하여 새 파일에 붙여넣기)

# Git에 커밋
git add supabase/migrations/025_create_homework_submissions_bucket.sql
git commit -m "chore: Recreate missing migration 025 from report"
```

**방법 3: Docker에서 현재 상태 Export**

```bash
# 현재 bucket 설정을 SQL로 Export
docker exec supabase_db_nvoim-planer-pro pg_dump -U postgres -d postgres \
  -t storage.buckets --data-only --inserts \
  -f /tmp/buckets-backup.sql

# 파일 복사
docker cp supabase_db_nvoim-planer-pro:/tmp/buckets-backup.sql ./backups/

# Migration 파일로 정리
cat ./backups/buckets-backup.sql | grep "homework-submissions" > supabase/migrations/025_create_homework_submissions_bucket.sql
```

### 코드 변경이 사라진 경우

```bash
# Git reflog로 모든 변경 이력 확인
git reflog

# 특정 시점으로 복구
git checkout <reflog-hash> -- apps/student/src/screens/HomeworkSubmissionScreen.tsx

# 커밋
git add apps/student/src/screens/HomeworkSubmissionScreen.tsx
git commit -m "chore: Restore audio upload code from reflog"
```

---

## 📊 회귀 감지 시스템

### 자동 테스트

**`tests/regression/audio-upload.spec.ts` 생성:**

```typescript
import { test, expect } from '@playwright/test';

test.describe('회귀 테스트: 오디오 업로드', () => {
  test('homework-submissions bucket이 존재해야 함', async ({ page }) => {
    // Supabase Storage 확인
    const response = await page.request.get('http://127.0.0.1:54321/storage/v1/bucket/homework-submissions');
    expect(response.ok()).toBeTruthy();
  });

  test('audio/webm mime type이 허용되어야 함', async ({ page }) => {
    // Bucket 설정 확인
    const response = await page.request.get('http://127.0.0.1:54321/storage/v1/bucket/homework-submissions');
    const data = await response.json();

    expect(data.allowed_mime_types).toContain('audio/webm');
    expect(data.allowed_mime_types).toContain('audio/mp4');
    expect(data.allowed_mime_types).toContain('audio/m4a');
  });

  test('학생 앱에서 오디오 녹음 및 제출이 가능해야 함', async ({ page }) => {
    // 학생 앱 테스트
    await page.goto('http://localhost:8081/homework/submission');
    await page.click('text=음성 녹음');
    await page.click('button:has-text("녹음 시작")');
    await page.waitForTimeout(2000);
    await page.click('button:has-text("녹음 중지")');
    await page.click('button:has-text("제출하기")');

    // 성공 메시지 확인
    await expect(page.locator('text=제출 완료')).toBeVisible();
  });
});
```

### 일일 회귀 테스트 자동 실행

**GitHub Actions: `.github/workflows/regression-test.yml`**

```yaml
name: Daily Regression Test

on:
  schedule:
    - cron: '0 9 * * *'  # 매일 오전 9시
  workflow_dispatch:  # 수동 실행

jobs:
  regression:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Start Supabase
        run: npx supabase start

      - name: Run regression tests
        run: npx playwright test tests/regression/

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: regression-test-results
          path: playwright-report/

      - name: Notify on failure
        if: failure()
        run: |
          echo "❌ 회귀 테스트 실패!"
          echo "다음을 확인하세요:"
          echo "1. Migration 파일이 존재하는지"
          echo "2. Supabase bucket이 생성되었는지"
          echo "3. 코드 변경사항이 커밋되었는지"
```

---

## 📝 체크리스트 요약

### ✅ 개발 완료 후 반드시 확인

- [ ] `git status`로 모든 변경사항 확인
- [ ] 새로 생성한 파일이 staged 되었는지 확인
- [ ] Migration 파일이 Git에 커밋되었는지 확인
- [ ] 주요 코드 변경이 Git에 커밋되었는지 확인
- [ ] `git log --oneline -3`으로 최근 커밋 확인
- [ ] (선택) `git push`로 remote에 백업

### ✅ Migration 파일 생성 후 반드시 확인

- [ ] Migration 파일이 `supabase/migrations/` 디렉토리에 존재
- [ ] `git add` 및 `git commit` 완료
- [ ] Supabase에 migration 적용 완료 (Docker exec 또는 Studio)
- [ ] 적용 결과 확인 (SELECT 쿼리로 검증)

### ✅ 세션 종료 전 반드시 확인

- [ ] `git status`에 unstaged 파일이 없음
- [ ] 중요한 변경사항이 모두 커밋됨
- [ ] (선택) 백업 스크립트 실행

---

## 🎯 결론

### 회귀 방지의 핵심 원칙

1. **즉시 커밋**: 모든 변경사항은 완료 즉시 Git에 커밋
2. **검증**: 커밋 후 `git log`로 확인
3. **자동화**: Pre-commit hook으로 실수 방지
4. **백업**: 일일 백업으로 복구 가능성 확보
5. **테스트**: 자동 회귀 테스트로 조기 감지

### 실천 방법

**매일 개발 시작 시:**
```bash
git status && git log --oneline -5 && npx supabase status
```

**매일 개발 종료 시:**
```bash
git status && git add . && git commit -m "wip: 오늘 작업 내용" && git log --oneline -3
```

**Migration 생성 시:**
```bash
# 파일 생성 → 즉시 git add → 즉시 git commit → Supabase 적용 → 검증
```

---

**최종 업데이트**: 2026-02-13
**작성자**: Claude Code (Sonnet 4.5)
**문서 버전**: 1.0
