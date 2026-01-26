# 🚨 긴급 수정 필요: 학생 숙제 조회 문제 해결

## 문제 요약 (Problem Summary)

**증상**: 학생 앱에서 숙제 목록이 표시되지 않음
**원인**: `homework` 테이블에 학생용 SELECT RLS 정책 누락
**영향도**: 🔴 CRITICAL - 학생-플래너 핵심 워크플로우 완전 차단

## 근본 원인 분석 (Root Cause Analysis)

### 1. 조사 결과

✅ **homework_assignments 테이블**: RLS 정책 10개 존재 (정상)
✅ **homework_assignments 데이터**: 10개 레코드 존재 (정상)
✅ **student_profiles 테이블**: RLS 정책 존재 (정상)
❌ **homework 테이블**: 학생용 SELECT 정책 **누락** (문제!)

### 2. 기술적 설명

학생 앱 쿼리 (supabaseApi.ts:86-101):
```typescript
const { data, error } = await supabase
  .from('homework_assignments')
  .select(`
    *,
    homework (          // ← 이 JOIN이 실패!
      id,
      title,
      description,
      instructions,
      due_date,
      created_at,
      resources
    )
  `)
  .eq('student_id', user.id)
```

**문제**:
- `homework_assignments`는 조회 가능 (학생용 SELECT 정책 존재)
- `homework` 테이블 JOIN 시 RLS에 의해 차단됨 (정책 없음)
- 결과: `assignment.homework === null` → 학생 앱에서 숙제 데이터 표시 불가

### 3. 검증된 데이터

**Supabase 데이터베이스 실제 상태**:
```sql
-- homework_assignments 테이블: 10개 레코드 존재
-- student_id 값:
--   2f58a8ce-a1f2-432a-85fe-38c4f1350211 (4개 과제)
--   8f57a2d6-9894-4cdd-a046-67a8a7c5b9a8 (6개 과제)
-- 모든 과제 status: 'pending'
-- 날짜 범위: 2026-01-09 ~ 2026-01-10
```

## 즉시 적용 필요한 수정 사항

### Migration 파일 생성 완료 ✅

파일: `supabase/migrations/020_homework_select_policy.sql`

### 수동 실행 방법 (Manual Execution Required)

**Option 1: Supabase SQL Editor (권장)**

1. Supabase Dashboard 접속
2. SQL Editor 열기
3. 아래 SQL 복사 & 붙여넣기
4. `Run` 버튼 클릭 (또는 Cmd+Enter)

```sql
-- 정책: 학생이 자신에게 할당된 숙제 조회
CREATE POLICY "Students can view assigned homework"
  ON public.homework
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.homework_assignments ha
      WHERE ha.homework_id = homework.id
      AND ha.student_id = auth.uid()
    )
  );
```

**Option 2: Supabase CLI**

```bash
npx supabase db push --db-url "postgresql://postgres.ybcjkdcdruquqrdahtga:3EULsv31sB$@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres" --include-all
```

### 검증 방법 (Verification)

**1. 정책 생성 확인**:
```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'homework'
AND policyname = 'Students can view assigned homework';
```

**예상 결과**: 1개 행 반환

**2. 학생 앱 테스트**:
- 학생 앱 재시작
- 로그인
- 숙제 화면 확인
- Console 로그 확인: `assignment.homework` 값이 null이 아니어야 함

**3. SQL 직접 테스트** (학생으로 로그인 후):
```sql
SELECT
  ha.id,
  ha.student_id,
  h.title,
  h.description,
  h.due_date
FROM homework_assignments ha
LEFT JOIN homework h ON h.id = ha.homework_id
WHERE ha.student_id = auth.uid()
LIMIT 5;
```

**예상 결과**: homework 데이터가 정상적으로 JOIN되어 표시됨

## 영향 범위 (Impact)

### Before Fix (현재 상태)
- ❌ 학생이 숙제 목록 볼 수 없음
- ❌ 학생-플래너 워크플로우 완전 차단
- ❌ 숙제 제출 불가능

### After Fix (수정 후)
- ✅ 학생이 자신에게 할당된 숙제 조회 가능
- ✅ 학생-플래너 숙제 워크플로우 활성화
- ✅ 숙제 제출 플로우 정상 작동

## 보안 고려사항 (Security)

**RLS 정책 동작 방식**:
```sql
-- 학생 A (id: 2f58a8ce-a1f2-432a-85fe-38c4f1350211)
-- → homework_assignments에 4개 레코드 존재
-- → 해당 homework_id에 해당하는 homework만 조회 가능
-- → 다른 학생의 숙제는 조회 불가 (RLS 차단)

-- 학생 B (id: 8f57a2d6-9894-4cdd-a046-67a8a7c5b9a8)
-- → homework_assignments에 6개 레코드 존재
-- → 해당 homework_id에 해당하는 homework만 조회 가능
-- → 학생 A의 숙제는 조회 불가 (RLS 차단)
```

**보안 보장**:
- ✅ 학생은 자신에게 할당된 숙제만 볼 수 있음
- ✅ 다른 학생의 숙제는 완전히 차단됨
- ✅ 할당되지 않은 숙제는 조회 불가
- ✅ auth.uid() 기반 인증으로 위조 불가

## 다음 단계 (Next Steps)

1. ✅ Migration 파일 생성 완료 (`020_homework_select_policy.sql`)
2. ⏳ **즉시 실행 필요**: Supabase SQL Editor에서 정책 추가
3. ⏳ 학생 앱 테스트 및 검증
4. ⏳ DEVELOPMENT_STATUS.md 업데이트
5. ⏳ schema.sql 파일 동기화 (현재 outdated 상태)

## 타임라인 (Timeline)

- **발견 시각**: 2026-01-16 14:00 KST
- **Migration 생성**: 2026-01-16 14:10 KST
- **즉시 실행 필요**: 🚨 URGENT
- **예상 소요 시간**: 2-3분 (SQL 실행 + 검증)

## 기술 참고 (Technical References)

### 관련 파일
- `supabase/migrations/019_homework_assignments_rls.sql` - homework_assignments RLS (이미 적용됨)
- `supabase/migrations/020_homework_select_policy.sql` - homework RLS (적용 필요!)
- `apps/student/src/services/supabaseApi.ts:86-101` - 학생 앱 쿼리 로직
- `supabase/schema.sql:255-262` - RLS 활성화 상태 (outdated)

### 관련 테이블
- `homework` - 숙제 마스터 데이터 (title, description, due_date, resources)
- `homework_assignments` - 학생별 숙제 할당 (student_id, homework_id, status, assigned_at)
- `student_profiles` - 학생 프로필 (id = auth.uid())

---

**작성자**: Claude Code
**작성일**: 2026-01-16
**우선순위**: 🔴 CRITICAL
**카테고리**: Bug Fix, RLS Policy, Student Workflow
