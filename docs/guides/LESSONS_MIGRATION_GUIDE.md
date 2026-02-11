# 1:1 화상수업 시스템 마이그레이션 가이드

## 📋 변경 사항 요약

앤보임 플래너 프로의 수업 관리 시스템을 **교실 기반 수업**에서 **1:1 온라인 화상수업** 방식으로 전환했습니다.

### 주요 변경사항

1. **수업 관리 페이지 재설계** (`/dashboard/lessons`)
   - 학생 이름 → 수업 시간 → 담임선생님 이름 형식으로 표시
   - 교실/위치 개념 제거
   - 그룹 수업 개념 제거
   - 1:1 화상수업에 특화된 UI

2. **학생 프로필에 담임선생님 정보 추가** (`/dashboard/students/[id]`)
   - 원어민 담임선생님 이름 입력 필드
   - 담임선생님 연락처 (선택사항)
   - 담임선생님 관련 메모 (선택사항)

3. **데이터베이스 스키마 업데이트**
   - `student_profiles` 테이블: 담임선생님 정보 필드 추가
   - `lessons` 테이블: 1:1 수업 지원 필드 추가

---

## 🚀 마이그레이션 실행 방법

### 1. 데이터베이스 백업 (필수!)

```bash
# Supabase 대시보드에서 데이터베이스 백업 수행
# 또는 로컬 백업
pg_dump -h your-db-host -U postgres -d postgres > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. 마이그레이션 파일 실행

**Supabase Dashboard 사용:**

1. Supabase 대시보드 접속
2. SQL Editor 메뉴 선택
3. `supabase/migrations/009_one_to_one_lesson_system.sql` 파일 내용 복사
4. SQL Editor에 붙여넣기
5. 실행 (Run 버튼 클릭)

**또는 로컬에서 실행:**

```bash
# 프로젝트 루트에서
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/009_one_to_one_lesson_system.sql
```

### 3. 마이그레이션 확인

마이그레이션이 성공적으로 실행되면 다음과 같은 결과를 확인할 수 있습니다:

```
        step                       | count
------------------------------------|-------
 student_profiles 컬럼 추가         |   3
 lessons 컬럼 추가                  |   6
 RLS 정책 생성                      |   4
```

---

## 📊 새로운 데이터베이스 구조

### student_profiles 테이블

**새로 추가된 필드:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `native_teacher_name` | TEXT | 학생의 원어민 담임선생님 이름 |
| `teacher_contact` | TEXT | 담임선생님 연락처 (이메일, 전화번호 등) |
| `teacher_notes` | TEXT | 담임선생님 관련 메모 |

### lessons 테이블

**새로 추가된 필드:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `student_id` | UUID | 수업을 받는 학생 ID (1:1 수업) |
| `lesson_date` | DATE | 수업 날짜 |
| `start_time` | TIME | 수업 시작 시간 |
| `end_time` | TIME | 수업 종료 시간 |
| `lesson_status` | TEXT | 수업 상태: scheduled, completed, cancelled, no_show |
| `attendance_status` | TEXT | 출석 상태: present, absent, late |
| `lesson_notes` | TEXT | 수업 메모 (플래너용) |
| `homework_assigned` | BOOLEAN | 숙제 배정 여부 |

**RLS (Row Level Security) 정책:**

- 플래너는 자신의 학생 수업만 조회/생성/수정/삭제 가능
- 모든 lessons 작업은 `planner_id = auth.uid()` 조건으로 제한됨

---

## 🎨 UI 변경사항

### 수업 관리 페이지 (`/dashboard/lessons`)

**이전:**
```
강의실 A | 기초 회화 수업 | 09:00-10:00 | 개인 수업 | 1명
```

**변경 후:**
```
👤 김민수 (Level 4) → ⏰ 09:00-10:00 (60분) → 🎓 John Smith
```

**주요 특징:**
- 학생 이름이 가장 먼저 표시
- 수업 시간이 중앙에 명확하게 표시
- 담임선생님 이름이 우측에 표시
- 수업 상태 (예정됨, 완료됨, 취소됨, 노쇼)
- 출석 상태 (출석, 지각, 결석)
- 숙제 배정 여부 표시

### 학생 상세 페이지 (`/dashboard/students/[id]`)

**기본 정보 탭에 추가된 필드:**

```
┌─────────────────────────────────────┐
│ 레벨: Level 4                       │
├─────────────────────────────────────┤
│ 원어민 담임선생님: John Smith       │  ← 새로 추가
├─────────────────────────────────────┤
│ 메모: ...                           │
└─────────────────────────────────────┘
```

---

## 🔄 데이터 마이그레이션 고려사항

### 기존 데이터가 있는 경우

1. **기존 lessons 테이블 데이터**
   - `class_id` 기반 수업이 있다면 1:1 수업으로 변환 필요
   - 각 학생별로 별도의 lesson 레코드 생성

2. **student_profiles 테이블**
   - `native_teacher_name` 필드는 NULL 허용
   - 기존 학생들의 담임선생님 정보는 수동으로 입력 필요

### 데이터 변환 예시

기존 그룹 수업을 1:1 수업으로 변환:

```sql
-- 예시: class_id가 있는 기존 수업을 1:1 수업으로 변환
-- (실제 데이터 구조에 맞게 수정 필요)

INSERT INTO lessons (
  planner_id,
  student_id,
  title,
  description,
  lesson_date,
  start_time,
  end_time,
  lesson_status,
  created_at
)
SELECT
  l.planner_id,
  cs.student_id,
  l.title,
  l.description,
  DATE(l.scheduled_at),
  TIME(l.scheduled_at),
  TIME(l.scheduled_at + INTERVAL '1 hour'),
  CASE
    WHEN l.is_completed THEN 'completed'
    ELSE 'scheduled'
  END,
  l.created_at
FROM lessons l
INNER JOIN class_students cs ON l.class_id = cs.class_id
WHERE l.class_id IS NOT NULL;
```

---

## ✅ 테스트 체크리스트

### 마이그레이션 후 확인사항

- [ ] 데이터베이스 마이그레이션 성공 확인
- [ ] student_profiles에 새 필드 추가 확인
- [ ] lessons 테이블에 새 필드 추가 확인
- [ ] RLS 정책 생성 확인

### UI 테스트

- [ ] 학생 관리 페이지에서 담임선생님 필드 입력 가능
- [ ] 학생 정보 저장 및 조회 정상 작동
- [ ] 수업 관리 페이지 접속 확인
- [ ] 새로운 1:1 수업 레이아웃 정상 표시
- [ ] 학생 이름, 수업 시간, 담임선생님 이름 연동 확인
- [ ] 수업 필터링 (예정됨, 완료됨, 취소됨) 정상 작동
- [ ] 수업 상세 모달 정상 표시

### 데이터 연동 테스트

1. **담임선생님 정보 연동**
   ```
   1. 학생 관리 → 학생 선택 → 기본 정보
   2. "원어민 담임선생님" 필드에 이름 입력 (예: John Smith)
   3. 저장
   4. 수업 관리 페이지 이동
   5. 해당 학생의 수업에 담임선생님 이름 표시 확인
   ```

2. **수업 생성 테스트**
   ```
   1. 수업 관리 → "수업 추가" 버튼 클릭
   2. 학생 선택, 날짜/시간 입력
   3. 저장
   4. 목록에 새 수업 표시 확인
   ```

---

## 🐛 트러블슈팅

### 마이그레이션 실행 오류

**오류: "column already exists"**
```
해결: 이미 마이그레이션이 실행된 상태입니다.
     ALTER TABLE ... ADD COLUMN IF NOT EXISTS 구문이므로 안전합니다.
```

**오류: "relation does not exist"**
```
해결: 테이블 이름을 확인하세요.
     student_profiles, lessons 테이블이 존재하는지 확인 필요.
```

### UI 오류

**"student.native_teacher_name is undefined"**
```
해결:
1. 마이그레이션 실행 확인
2. 브라우저 캐시 삭제
3. 페이지 새로고침
```

**담임선생님 이름이 수업 관리에 표시되지 않음**
```
해결:
1. 학생 프로필에 담임선생님 이름이 입력되어 있는지 확인
2. lessons 테이블의 student_id가 올바르게 연결되어 있는지 확인
3. Supabase RLS 정책이 올바르게 설정되어 있는지 확인
```

---

## 📝 추가 개발 필요 사항

현재 마이그레이션에 포함되지 않은 기능들:

1. **수업 추가 모달 구현**
   - 학생 선택 드롭다운
   - 날짜/시간 선택
   - 수업 제목/설명 입력

2. **수업 수정 기능**
   - 수업 상태 변경 (예정됨 → 완료됨)
   - 출석 상태 기록
   - 수업 메모 추가

3. **수업 삭제 기능**
   - 확인 대화상자
   - 삭제 후 목록 갱신

4. **일정 관리 연동**
   - 캘린더 뷰에서 수업 표시
   - 드래그 앤 드롭으로 수업 시간 변경

---

## 📚 참고 자료

### 관련 파일

- **마이그레이션**: `supabase/migrations/009_one_to_one_lesson_system.sql`
- **수업 관리 UI**: `apps/planner-web/src/app/dashboard/lessons/LessonsContent.tsx`
- **학생 상세 UI**: `apps/planner-web/src/app/dashboard/students/[id]/StudentDetailContent.tsx`

### Supabase 문서

- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Functions](https://supabase.com/docs/guides/database/functions)
- [Foreign Keys](https://supabase.com/docs/guides/database/tables#foreign-keys)

---

## 🎉 마이그레이션 완료 후

모든 테스트가 성공적으로 완료되면:

1. ✅ 기존 교실 기반 시스템 관련 코드 제거 (선택사항)
2. ✅ 사용자 가이드 업데이트
3. ✅ 플래너들에게 새로운 시스템 안내
4. ✅ 담임선생님 정보 입력 독려

---

**작성일**: 2026-02-10
**버전**: 1.0.0
**작성자**: Claude Code Assistant
