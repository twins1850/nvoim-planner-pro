# 마이그레이션 에러 해결 가이드

## ❌ 발생한 에러

```
Error: Failed to run sql query: ERROR: 42703: column "planner_id" does not exist
```

## 🔍 원인 분석

이 에러는 `lessons` 테이블이 다음 중 하나의 상태일 때 발생합니다:

1. **테이블이 아직 생성되지 않음**
   - 테이블 자체가 데이터베이스에 존재하지 않음

2. **테이블은 있지만 planner_id 컬럼이 없음**
   - 이전 마이그레이션에서 테이블이 생성되었지만 필수 컬럼이 누락됨

3. **테이블 구조가 예상과 다름**
   - 다른 스키마로 테이블이 생성되어 있음

## ✅ 해결 방법

### 1. 수정된 마이그레이션 파일 사용

**이전 파일**: `009_one_to_one_lesson_system.sql` (사용하지 마세요)

**새 파일**: `009_one_to_one_lesson_system_fixed.sql` ✅

### 2. 새 마이그레이션 실행

**Supabase Dashboard 사용:**

1. Supabase 대시보드 → SQL Editor 메뉴
2. **`supabase/migrations/009_one_to_one_lesson_system_fixed.sql`** 파일 열기
3. 파일 내용 전체 복사
4. SQL Editor에 붙여넣기
5. **Run** 버튼 클릭

### 3. 수정된 내용

새 마이그레이션은 다음과 같이 안전하게 처리합니다:

```sql
-- 1. lessons 테이블이 없으면 생성
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    -- ... 모든 필요한 컬럼 포함
);

-- 2. 각 컬럼이 없으면 추가 (DO 블록 사용)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lessons' AND column_name = 'student_id'
    ) THEN
        ALTER TABLE public.lessons ADD COLUMN student_id UUID ...;
    END IF;
    -- ... 다른 컬럼들도 동일하게 체크
END $$;

-- 3. RLS 정책 생성 (테이블과 컬럼이 확실히 존재한 후)
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Planners can view their lessons" ...
```

## 🎯 핵심 개선사항

### 이전 마이그레이션의 문제점
```sql
-- ❌ 테이블이 있다고 가정하고 컬럼만 추가
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS student_id ...
```
→ 테이블이 없으면 실패

### 수정된 마이그레이션
```sql
-- ✅ 테이블부터 생성하고 컬럼 체크
CREATE TABLE IF NOT EXISTS public.lessons (...);
-- ✅ 각 컬럼 존재 여부 확인 후 추가
DO $$ ... IF NOT EXISTS ... END $$;
```
→ 어떤 상태에서든 안전하게 실행

## 📊 실행 후 확인

마이그레이션 성공 시 다음과 같은 결과가 표시됩니다:

```
        step                       | count
------------------------------------|-------
 student_profiles 컬럼 추가         |   3
 lessons 테이블 존재                |   1
 lessons 컬럼 추가                  |   7
 RLS 정책 생성                      |   4
```

**각 항목 설명:**
- `student_profiles 컬럼 추가: 3` → native_teacher_name, teacher_contact, teacher_notes 추가됨
- `lessons 테이블 존재: 1` → lessons 테이블이 생성되었음
- `lessons 컬럼 추가: 7` → 7개의 새 컬럼 추가됨 (student_id, lesson_date, start_time, end_time, lesson_status, attendance_status, planner_id)
- `RLS 정책 생성: 4` → 4개의 RLS 정책 생성됨 (SELECT, INSERT, UPDATE, DELETE)

## 🔧 여전히 에러가 발생하는 경우

### 에러: "relation already exists"
```
해결: 이미 테이블이 있지만 구조가 다를 수 있습니다.
     CREATE TABLE IF NOT EXISTS 구문이므로 안전합니다.
     기존 테이블 구조를 유지하고 컬럼만 추가됩니다.
```

### 에러: "constraint already exists"
```
해결: IF NOT EXISTS 구문을 사용하므로 무시해도 안전합니다.
```

### 에러: "foreign key constraint does not exist"
```
해결: student_profiles 테이블이 먼저 있어야 합니다.
     다음 순서로 확인:
     1. student_profiles 테이블 존재 확인
     2. auth.users 테이블 존재 확인 (Supabase 기본)
```

## 💡 권장 사항

### 마이그레이션 전 체크리스트

1. ✅ **백업 완료 확인**
   ```sql
   -- Supabase 대시보드 → Database → Backups
   ```

2. ✅ **필수 테이블 존재 확인**
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('student_profiles', 'lessons', 'profiles');
   ```

3. ✅ **auth.users 접근 가능 확인**
   ```sql
   SELECT COUNT(*) FROM auth.users LIMIT 1;
   ```

### 마이그레이션 후 체크리스트

1. ✅ **테이블 구조 확인**
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'lessons'
   ORDER BY ordinal_position;
   ```

2. ✅ **RLS 정책 확인**
   ```sql
   SELECT policyname, cmd
   FROM pg_policies
   WHERE tablename = 'lessons';
   ```

3. ✅ **인덱스 확인**
   ```sql
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE tablename = 'lessons';
   ```

## 🆘 추가 도움이 필요한 경우

다음 정보를 확인하고 공유해주세요:

```sql
-- 1. 현재 lessons 테이블 구조
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'lessons'
ORDER BY ordinal_position;

-- 2. 현재 student_profiles 테이블 구조
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'student_profiles'
ORDER BY ordinal_position;

-- 3. 현재 RLS 정책 목록
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('lessons', 'student_profiles');
```

---

**작성일**: 2026-02-10
**버전**: 1.1.0 (Fixed)
**작성자**: Claude Code Assistant
