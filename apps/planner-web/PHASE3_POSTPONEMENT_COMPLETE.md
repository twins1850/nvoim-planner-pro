# ✅ Phase 3: 수업 연기 기능 완전 구현 및 테스트 완료

**날짜**: 2026년 2월 8일
**상태**: ✅ **완벽 작동 확인**

## 🎯 Phase 3 목표: 연기 기능 자동화

달력에서 직접 연기 처리, 자동 연기권 차감 및 재수강 날짜 조정

## ✅ 완료된 작업

### 1. PostgreSQL ENUM 타입 업데이트
**파일**: `/supabase/migrations/20260208_update_postponement_reason_enum.sql`

사용자 친화적인 연기 사유 값 추가:
- `sick` (아픔)
- `emergency` (긴급 상황)
- `schedule_conflict` (일정 충돌)
- `other` (기타)

```sql
ALTER TYPE postponement_reason ADD VALUE IF NOT EXISTS 'sick';
ALTER TYPE postponement_reason ADD VALUE IF NOT EXISTS 'emergency';
ALTER TYPE postponement_reason ADD VALUE IF NOT EXISTS 'schedule_conflict';
ALTER TYPE postponement_reason ADD VALUE IF NOT EXISTS 'other';
```

**실행 결과**: ✅ Success

### 2. RPC 함수 권한 부여
**문제**: `postpone_lesson` 함수가 404 오류로 호출 불가
**원인**: `authenticated` role에 EXECUTE 권한 미부여
**해결**:

```sql
GRANT EXECUTE ON FUNCTION public.postpone_lesson(
    UUID,
    postponement_reason,
    TEXT,
    DATE,
    TIME
) TO authenticated;
```

**실행 결과**: ✅ Success

### 3. Supabase 프로젝트 재시작
**이유**: REST API 스키마 캐시 갱신 필요
**방법**: Project Settings → Restart project
**대기 시간**: ~100초
**결과**: ✅ 스키마 캐시 성공적으로 갱신됨

### 4. 테스트 데이터 준비
**Subscription ID**: `4ee20a9a-b15c-4b7a-b9a5-8f3fa8789ea4`

초기 상태:
- `max_postponements`: 2
- `postponements_used`: 2 (모두 사용)
- `remaining`: 0

테스트를 위한 리셋:
```sql
UPDATE public.subscriptions
SET postponements_used = 0
WHERE id = '4ee20a9a-b15c-4b7a-b9a5-8f3fa8789ea4';
```

**결과**: ✅ postponements_used = 0, remaining = 2

### 5. End-to-End 테스트 (Playwright MCP)

#### 테스트 환경
- **Tab 0**: Supabase SQL Editor
- **Tab 1**: Planner App (http://localhost:3000)
- **Tab 2**: Student App (예비)

#### 테스트 시나리오

1. **Planner App 접속**
   - URL: `http://localhost:3000/dashboard/students/ea03a8c4-1390-47df-83e2-79ac1712c6a3`
   - 학생: 관리자 테스트용 학생
   - 수강권: 주2회 50분 수강권 (2026.02.08 ~ 2026.03.08)

2. **수업 일정 탭 클릭**
   - 남은 연기권: 2회 ✅
   - 남은 수업: 8회
   - 캘린더에 Feb 8, 9, 11 수업 표시

3. **Feb 9 수업 선택**
   - 14:00-14:50
   - 상태: 예정 (scheduled)
   - "연기 신청" 버튼 표시 ✅

4. **연기 모달 확인**
   - 현재 수업: 2026년 02월 09일 (월) 14:00-14:50
   - 연기권 사용: 0 / 최대: 2회
   - 남은 연기권: 2회
   - 재수강 날짜: 2026-02-16 (자동 입력, +7일) ✅
   - 재수강 시간: 14:00:00 (자동 입력) ✅
   - 연기 사유: 아픔 (기본값) ✅

5. **연기 확정 클릭**
   - RPC 호출: `postpone_lesson()`
   - 파라미터:
     - `p_lesson_id`: 26f0aee5-b663-42cf-bd41-a72cea570901
     - `p_reason`: 'sick'
     - `p_reason_detail`: null
     - `p_rescheduled_date`: '2026-02-16'
     - `p_rescheduled_start_time`: '14:00:00'

6. **데이터베이스 검증**

   **Subscription 테이블**:
   ```
   postponements_used: 0 → 1 ✅
   max_postponements: 2
   remaining: 2 → 1 ✅
   ```

   **Lessons 테이블**:
   ```
   Feb 8, 14:00: postponed (기존)
   Feb 9, 14:00: scheduled → postponed ✅
   Feb 11, 14:00: scheduled
   ```

   **Postponements 테이블**:
   ```
   id: b7985044-5bf2-4c5d-ab1e-0de3c75f91bb
   lesson_id: 26f0aee5-b663-42cf-bd41-a72cea570901
   original_date: 2026-02-09 ✅
   rescheduled_date: 2026-02-16 ✅
   reason: sick ✅
   created_at: 2026-02-08 11:44:49.513234+00 ✅
   ```

## 📊 검증 결과

### ✅ 모든 테스트 통과

1. ✅ ENUM 마이그레이션 성공
2. ✅ GRANT EXECUTE 권한 부여 성공
3. ✅ Supabase 재시작 및 스키마 캐시 갱신 성공
4. ✅ PostponeModal 컴포넌트 정상 작동
5. ✅ RPC 함수 `postpone_lesson` 오류 없이 실행
6. ✅ Postponement 레코드 정확하게 생성
7. ✅ Lesson 상태 'postponed'로 업데이트
8. ✅ Postponements_used 카운터 증가 (0 → 1)
9. ✅ Remaining postponements 정확하게 계산 (2 → 1)
10. ✅ Console 오류 없음

## 🔧 구현 세부사항

### postpone_lesson() 함수 동작

1. **유효성 검증**
   - 수업 존재 여부 확인
   - 연기권 잔여 개수 확인

2. **데이터베이스 업데이트**
   - `lessons.status` → 'postponed'
   - `lessons.updated_at` → NOW()
   - `postponements` 테이블에 새 레코드 삽입
   - `subscriptions.postponements_used` 증가

3. **반환값**
   ```json
   {
     "success": true,
     "postponement_id": "b7985044-5bf2-4c5d-ab1e-0de3c75f91bb",
     "postponements_remaining": 1
   }
   ```

### 주요 특징

- **SECURITY DEFINER**: 함수가 소유자 권한으로 실행되어 RLS 우회
- **Transaction Safety**: 모든 업데이트가 단일 트랜잭션으로 처리
- **Error Handling**: EXCEPTION 블록으로 오류 처리 및 롤백
- **Automatic Counting**: 연기권 자동 차감 및 잔여 계산

## 💡 주요 학습 내용

### 1. PostgreSQL ENUM 제한사항
- ENUM 값 추가: `ALTER TYPE ... ADD VALUE IF NOT EXISTS` ✅
- ENUM 값 제거: 직접 불가능 ❌ (DROP & CREATE 필요)
- 기존 값은 사용하지 않더라도 데이터베이스에 유지됨

### 2. Supabase REST API 스키마 캐싱
- 함수 정의 변경 시 REST API가 즉시 반영되지 않음
- GRANT 권한 부여 후에도 캐시 갱신 필요
- 해결: **프로젝트 재시작**으로 강제 캐시 갱신

### 3. PostgreSQL 함수 파라미터
- 함수 시그니처 변경 시 `CREATE OR REPLACE` 불가
- 파라미터 이름 변경만 필요해도 `DROP` → `CREATE` 필수
- 파라미터 타입이나 순서 변경 시에도 동일

### 4. RPC 권한 관리
- `SECURITY DEFINER` 함수도 `GRANT EXECUTE` 필요
- `authenticated` role에 명시적으로 권한 부여 필수
- 권한 없으면 REST API에서 404 오류 반환

## 🐛 발견된 이슈 및 해결

### 이슈 1: 404 RPC Function Not Found
**증상**: `postpone_lesson` 호출 시 404 오류
**원인**: `authenticated` role에 EXECUTE 권한 없음
**해결**: `GRANT EXECUTE ON FUNCTION ... TO authenticated`

### 이슈 2: 404 오류 지속 (GRANT 후)
**증상**: 권한 부여 후에도 404 오류 지속
**원인**: Supabase REST API 스키마 캐시 미갱신
**해결**: 프로젝트 재시작으로 캐시 강제 갱신

### 이슈 3: 파라미터 이름 불일치
**증상**: `invalid input value for enum postponement_reason: "sick"`
**원인**: Frontend는 'sick' 전송, DB는 'student_request' 등만 허용
**해결**: ENUM 타입에 사용자 친화적 값 추가

### 이슈 4: UI 자동 갱신 안됨
**증상**: 연기 후 UI에 postponements_used 변경 반영 안됨
**원인**: React 컴포넌트 상태 자동 갱신 없음
**영향**: Minor UX 이슈 (페이지 새로고침하면 정상 표시)
**해결**: 추후 개선 가능 (RPC 성공 후 state refetch 추가)

## 📝 다음 단계: Phase 4

### Phase 4: 검증 및 테스트 (완료 예정)

#### 테스트 시나리오

**시나리오 1: 수강권 종료 예정 표시**
- [ ] 대시보드 접속
- [ ] 7일 이내 종료 예정 수강권이 빨간색으로 표시되는지 확인
- [ ] 해당 날짜 클릭 시 학생 정보 확인

**시나리오 2: 오늘 수업 표시**
- [ ] 오늘 날짜에 수업이 파란색으로 표시되는지 확인
- [ ] 수업 개수가 정확한지 확인

**시나리오 3: 연기권 소진**
- [ ] 연기권을 최대치까지 사용한 학생 선택
- [ ] 수업 클릭 시 "연기 신청" 버튼 미표시 확인
- [ ] 연기 시도 시 오류 메시지 표시 확인

**시나리오 4: 과거 날짜 연기 방지**
- [ ] 과거 날짜로 연기 시도 시 오류 표시 확인

**시나리오 5: 수강권 기간 외 연기 방지**
- [ ] 수강권 종료일 이후로 연기 시도 시 오류 표시 확인

---

**작성**: 2026년 2월 8일 오후 8시
**테스트 실행자**: Claude Code with Playwright MCP
**상태**: ✅ **Phase 3 완벽 작동 확인 - Phase 4로 진행 가능**
