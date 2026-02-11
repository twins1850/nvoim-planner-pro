# RLS Policy 문제 해결 가이드

## 📅 발생 일자
2026-02-09

## 🚨 문제 증상

### 사용자가 경험한 문제
- 학생 앱 메시지 화면에서 **"연결된 선생님이 없습니다"** 에러 표시
- 실제로는 데이터베이스에 `student_profiles` 데이터가 존재함
- 플래너 앱에서는 정상 작동

### 기술적 증상
```javascript
// 콘솔 로그
Student data query result: {studentData: Array(0), studentError: null}
No connected student found for user: ea03a8c4-1390-47df-83e2-79ac1712c6a3
```

```http
// 네트워크 요청
GET /rest/v1/student_profiles?select=planner_id&id=eq.ea03a8c4-1390-47df-83e2-79ac1712c6a3
=> [200] (빈 배열 반환)
```

---

## 🔍 근본 원인 분석

### 1. RLS 정책 구조
```sql
-- student_profiles 테이블의 SELECT 정책
CREATE POLICY "student_can_view_own_profile"
  ON public.student_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
```

**핵심**: 이 정책은 **`id` 컬럼을 비교**하여 접근 권한을 검증합니다.

### 2. 문제가 된 코드

**파일**: `apps/student/src/navigation/RootNavigator.tsx`

```typescript
// ❌ 문제 코드 (69번째 줄)
const { data: profile, error } = await supabase
  .from('student_profiles')
  .select('planner_id')  // ⚠️ id가 없음!
  .eq('id', user.id)
  .single();

// ❌ 문제 코드 (122번째 줄)
supabase
  .from('student_profiles')
  .select('planner_id')  // ⚠️ id가 없음!
  .eq('id', session.user.id)
  .single()
```

### 3. PostgreSQL RLS 동작 원리

**중요한 사실**: RLS 정책의 `USING` 절에서 참조하는 컬럼은 **반드시 SELECT 결과에 포함되어야** 정책이 제대로 평가됩니다.

```
쿼리: SELECT planner_id WHERE id = 'user-id'
정책: USING (auth.uid() = id)

문제: SELECT 결과에 'id'가 없음
결과: PostgreSQL이 정책을 평가할 수 없어 빈 결과 반환 (권한 거부)
```

**왜 이런 일이 발생하나?**

PostgreSQL RLS는 보안을 위해 **명시적으로 선택되지 않은 컬럼은 정책 평가에 사용할 수 없도록** 설계되었습니다. 이는 의도하지 않은 데이터 노출을 방지하기 위한 안전장치입니다.

### 4. 혼동을 일으킨 요소들

#### A. SQL Editor에서는 작동함
```sql
-- SQL Editor (postgres 역할)에서 실행
SELECT id, planner_id FROM student_profiles WHERE id = 'user-id';
-- ✅ 정상 작동 (RLS 우회)
```

SQL Editor는 기본적으로 `postgres` superuser 권할로 실행되어 RLS를 우회하므로, RLS 정책 문제를 발견하기 어려웠습니다.

#### B. Role Impersonation으로 테스트했을 때도 작동
```sql
-- authenticated 역할 + 사용자 impersonation
SELECT id, planner_id FROM student_profiles WHERE id = 'user-id';
-- ✅ 정상 작동 (id를 SELECT에 포함함)
```

테스트 쿼리에서는 `id`를 포함했기 때문에 정상 작동했습니다.

#### C. MessagesScreen.tsx는 정상 코드
```typescript
// ✅ MessagesScreen.tsx (113번째 줄) - 정상 코드
.select(`
  id,
  planner_id
`)
```

메시지 화면의 코드는 올바르게 작성되어 있었으나, **앱 로드 시점(RootNavigator)에서 먼저 실패**하여 메시지 화면까지 도달하지 못했습니다.

#### D. 브라우저 캐시 문제로 오인
Expo가 미리 빌드된 정적 번들(`web-build/`)을 서빙하고 있어서, 브라우저 하드 리프레시로는 해결되지 않았습니다. 실제로는 코드 수정 후 **번들 재빌드**가 필요했습니다.

---

## ✅ 해결 방법

### 코드 수정

**파일**: `apps/student/src/navigation/RootNavigator.tsx`

```typescript
// ✅ 수정된 코드 (69번째 줄)
const { data: profile, error } = await supabase
  .from('student_profiles')
  .select('id, planner_id')  // ✨ id 추가!
  .eq('id', user.id)
  .single();

// ✅ 수정된 코드 (122번째 줄)
supabase
  .from('student_profiles')
  .select('id, planner_id')  // ✨ id 추가!
  .eq('id', session.user.id)
  .single()
```

### 빌드 및 배포

```bash
# 1. 웹 번들 재빌드
cd apps/student
npx expo export --platform web --output-dir web-build

# 2. 서버 재시작
npm start

# 3. 브라우저에서 앱 리로드
```

### 검증

**네트워크 요청 확인**:
```http
# ❌ 수정 전
GET /rest/v1/student_profiles?select=planner_id&id=eq.xxx

# ✅ 수정 후
GET /rest/v1/student_profiles?select=id%2Cplanner_id&id=eq.xxx
```

**콘솔 로그 확인**:
```javascript
// ✅ 수정 후
Student data query result: {studentData: Object, studentError: null}
✅ 대화방: d0626060-69cf-4376-a3ac-b13991aad5e9
```

---

## 🛡️ 재발 방지 가이드

### 1. RLS 정책 작성 시 원칙

**황금률**: RLS 정책의 `USING` 또는 `WITH CHECK` 절에서 참조하는 모든 컬럼은 **SELECT 쿼리에 반드시 포함**해야 합니다.

```sql
-- 정책
USING (auth.uid() = id)

-- 올바른 쿼리
SELECT id, other_columns FROM table WHERE ...  ✅

-- 잘못된 쿼리
SELECT other_columns FROM table WHERE ...  ❌
```

### 2. 코드 작성 시 체크리스트

Supabase 쿼리 작성 시:

- [ ] RLS 정책이 어떤 컬럼을 참조하는지 확인
- [ ] SELECT 절에 해당 컬럼들을 모두 포함
- [ ] 특히 `id`, `user_id`, `created_by` 등 권한 관련 컬럼 주의

### 3. 테스트 방법

#### A. SQL Editor에서 올바르게 테스트
```sql
-- ❌ 잘못된 테스트 (기본 postgres 역할 사용)
SELECT planner_id FROM student_profiles WHERE id = 'xxx';

-- ✅ 올바른 테스트 (authenticated 역할 + impersonation)
SET ROLE authenticated;
SET request.jwt.claims.sub = 'user-id-here';
SELECT planner_id FROM student_profiles WHERE id = 'user-id-here';
```

#### B. 네트워크 요청 모니터링
개발자 도구에서 실제 HTTP 요청의 `select=` 파라미터를 확인:
```http
GET /rest/v1/student_profiles?select=id,planner_id,other_fields
```

#### C. 콘솔 로그 확인
빈 배열이 반환되는지 확인:
```javascript
console.log('Query result:', { data, error });
// data: [] (빈 배열) => RLS 문제 의심
// data: [{}] (데이터 있음) => 정상
```

### 4. 일반적인 RLS 패턴

```typescript
// 패턴 1: 자신의 데이터 조회 (USING: auth.uid() = id)
.select('id, name, email')  // id 필수!

// 패턴 2: 소유자 확인 (USING: user_id = auth.uid())
.select('id, user_id, content')  // user_id 필수!

// 패턴 3: 관계 확인 (USING: planner_id = auth.uid())
.select('id, planner_id, student_name')  // planner_id 필수!

// 패턴 4: 복합 조건
// USING: (auth.uid() = user_id) OR (auth.uid() = shared_with_id)
.select('id, user_id, shared_with_id, data')  // 둘 다 필수!
```

### 5. 일반적인 실수 사례

#### 실수 1: 필요한 컬럼만 선택하려다 권한 컬럼 누락
```typescript
// ❌ 잘못된 예
.select('name, email')  // id 누락!

// ✅ 올바른 예
.select('id, name, email')
```

#### 실수 2: JOIN 시 관계 테이블의 권한 컬럼 누락
```typescript
// ❌ 잘못된 예
.select(`
  name,
  posts (title, content)  // posts.user_id 누락!
`)

// ✅ 올바른 예
.select(`
  id,
  name,
  posts (id, user_id, title, content)
`)
```

#### 실수 3: 캐시된 번들 문제
Expo web-build를 사용하는 경우:
- 코드 수정 후 반드시 `npx expo export` 재실행
- `npm start`로 서버 재시작
- 브라우저 하드 리프레시만으로는 부족

---

## 📊 성능 및 보안 고려사항

### Q: id를 SELECT에 포함하면 보안 문제가 있나요?
**A**: 아니요. RLS 정책이 이미 해당 행에 대한 접근을 허용한 상태이므로, `id`를 반환하는 것은 안전합니다. 오히려 정책이 제대로 작동하려면 **필수**입니다.

### Q: 불필요한 컬럼을 SELECT하면 성능 문제가 있나요?
**A**: `id`와 같은 작은 컬럼 하나 추가하는 것은 성능에 미미한 영향만 줍니다. RLS 정책 동작을 보장하는 것이 훨씬 중요합니다.

### Q: 프론트엔드에서 id를 사용하지 않는데도 포함해야 하나요?
**A**: 네. RLS 정책이 `id`를 참조한다면, 프론트엔드에서 사용 여부와 관계없이 **SELECT에 포함**해야 합니다.

---

## 🔗 관련 문서

- [Supabase RLS 공식 문서](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS 공식 문서](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- 프로젝트 RLS 정책: `supabase/migrations/20260209_ensure_rls_enabled_and_policies.sql`

---

## 📝 변경 이력

| 날짜 | 변경 내용 | 작성자 |
|------|----------|--------|
| 2026-02-09 | 초기 문서 작성 - RLS + SELECT 컬럼 누락 문제 | Claude Code |

---

## ✅ 체크리스트 (코드 리뷰 시 사용)

새로운 Supabase 쿼리 작성 시 확인:

- [ ] 해당 테이블의 RLS 정책 확인
- [ ] 정책에서 참조하는 컬럼 파악
- [ ] SELECT 절에 해당 컬럼들 포함
- [ ] SQL Editor에서 authenticated 역할로 테스트
- [ ] 네트워크 요청에서 쿼리 파라미터 확인
- [ ] 빈 배열 대신 실제 데이터 반환 확인
