# 🚀 빠른 해결 가이드

## ❌ 현재 에러

```
ERROR: 23502: column "planner_id" of relation "lessons" contains null values
```

**의미**: `lessons` 테이블에 이미 데이터가 있는데, 새로운 `planner_id` 컬럼을 NOT NULL로 추가하려고 해서 에러 발생

---

## ✅ 해결 방법 (2가지 옵션)

### 🎯 옵션 1: 기존 데이터 자동 처리 (권장)

**새 마이그레이션 사용**: `009_one_to_one_lesson_system_v2.sql`

이 방법은:
- ✅ 기존 `lessons` 데이터를 첫 번째 사용자에게 자동 할당
- ✅ 사용자가 없으면 기존 데이터 자동 삭제
- ✅ 안전하게 컬럼 추가

**실행 방법:**
1. Supabase 대시보드 → SQL Editor
2. `/supabase/migrations/009_one_to_one_lesson_system_v2.sql` 파일 열기
3. 전체 내용 복사 → 붙여넣기
4. **Run** 버튼 클릭

---

### 🔧 옵션 2: 기존 데이터 수동 삭제 후 실행

**기존 데이터가 테스트 데이터인 경우:**

#### Step 1: 기존 lessons 데이터 삭제

```sql
-- lessons 테이블의 모든 데이터 삭제
TRUNCATE TABLE public.lessons CASCADE;
```

#### Step 2: 마이그레이션 실행

그 다음 `009_one_to_one_lesson_system_fixed.sql` 다시 실행

---

## 🎯 권장 방법

### ⭐ 옵션 1을 사용하세요!

**이유:**
- ✅ 자동으로 기존 데이터 처리
- ✅ 안전하고 간편함
- ✅ 데이터 손실 최소화

**작동 방식:**
```sql
-- 1. planner_id 컬럼을 nullable로 추가
ALTER TABLE lessons ADD COLUMN planner_id UUID;

-- 2. 기존 행들을 첫 번째 사용자에게 할당
UPDATE lessons SET planner_id = (SELECT id FROM auth.users LIMIT 1)
WHERE planner_id IS NULL;

-- 3. 이제 NOT NULL 제약 추가
ALTER TABLE lessons ALTER COLUMN planner_id SET NOT NULL;
```

---

## 📊 실행 후 확인

성공하면 다음과 같은 결과가 나옵니다:

```
        step                       | count
------------------------------------|-------
 student_profiles 컬럼 추가         |   3
 lessons 테이블 존재                |   1
 lessons 컬럼 존재                  |   7
 RLS 정책 생성                      |   4
 lessons 레코드 수                  |   X    ← 기존 데이터 수
```

---

## 🆘 여전히 에러가 나는 경우

다음 SQL을 실행해서 현재 상태를 확인하고 알려주세요:

```sql
-- 1. lessons 테이블 현재 컬럼 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'lessons'
ORDER BY ordinal_position;

-- 2. lessons 테이블 데이터 개수
SELECT COUNT(*) FROM public.lessons;

-- 3. 사용자 수 확인
SELECT COUNT(*) FROM auth.users;
```

---

**작성일**: 2026-02-10
**버전**: 2.0 (기존 데이터 처리)
