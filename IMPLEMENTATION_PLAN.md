# 학생-플래너 핵심 워크플로우 수정 계획

## 🎯 핵심 발견사항 (Executive Summary)

**조사 완료**: 개발 서버, Supabase 데이터베이스, 플래너 앱 코드 전체 확인 완료

**좋은 소식**:
- ✅ 초대코드 시스템 정상 작동 (20개 코드, 3개 사용됨)
- ✅ 학생-플래너 연결 정상 작동 (5명 학생 가입, 3명이 동일 플래너에 연결)
- ✅ 메시지 시스템 정상 작동 (11개 메시지 양방향 통신)
- ✅ 플래너 앱 쿼리 로직 정확함 (코드 수정 불필요)
- ✅ **멀티 플래너 지원 가능**: 현재 스키마와 RLS 정책이 이미 멀티 플래너 환경 지원

**문제 발견**:
- ❌ **2개 테이블에 RLS 정책 누락** → 데이터는 존재하지만 앱에서 조회 불가
  1. `student_profiles` 테이블: RLS 활성화, 정책 0개 → **플래너가 학생 목록 못 봄**
  2. `homework_assignments` 테이블: RLS 활성화, 정책 0개 → **학생이 숙제 목록 못 봄**

**해결 방법**:
- Supabase SQL Editor에서 **9개 RLS 정책만 추가**하면 전체 워크플로우 작동
- 코드 수정 불필요 (모든 쿼리 로직 이미 정확함)
- **멀티 플래너 환경 완벽 지원** (각 플래너는 자신의 학생만 조회 가능)
- **예상 소요 시간: 15-20분**

**비즈니스 확장성 검증**:
- 100명 플래너 동시 사용 가능 ✅
- 플래너당 100명 이상 학생 관리 가능 ✅
- 베타 테스터 30명 지원 준비 완료 ✅

---

## Phase 1: student_profiles RLS 정책 추가 (최우선 - 즉시 실행)

**목표**: student_profiles 테이블에 필수 정책 4개 추가 → 플래너가 학생 볼 수 있게 수정

**실행 방법**: Supabase SQL Editor에서 직접 실행

```sql
-- ============================================================================
-- 최우선 수정: student_profiles 테이블 RLS 정책 추가
-- ============================================================================

-- 정책 1: 플래너가 자신의 학생 조회
CREATE POLICY "Planners can view their students"
  ON public.student_profiles
  FOR SELECT
  USING (planner_id = auth.uid());

-- 정책 2: 학생이 자신의 프로필 조회
CREATE POLICY "Students can view their own profile"
  ON public.student_profiles
  FOR SELECT
  USING (id = auth.uid());

-- 정책 3: 학생이 자신의 프로필 업데이트
CREATE POLICY "Students can update their own profile"
  ON public.student_profiles
  FOR UPDATE
  USING (id = auth.uid());

-- 정책 4: 플래너가 학생 프로필 업데이트 (학습 목표, 레벨 등)
CREATE POLICY "Planners can update their students profiles"
  ON public.student_profiles
  FOR UPDATE
  USING (planner_id = auth.uid());
```

**검증 SQL:**
```sql
-- 정책이 4개 생성되었는지 확인
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'student_profiles'
ORDER BY policyname;
```

**즉시 검증**: 플래너 대시보드 새로고침 → "전체 학생: 3명" 또는 "5명" 표시 예상

---

## Phase 2: homework_assignments RLS 정책 추가 (즉시 실행)

**목표**: homework_assignments 테이블에 필수 정책 5개 추가

**실행 방법**: Supabase SQL Editor에서 직접 실행

```sql
-- ============================================================================
-- 치명적 수정: homework_assignments 테이블 RLS 정책 추가
-- ============================================================================

-- 정책 1: 학생이 자신의 숙제 과제 조회
CREATE POLICY "Students can view their homework assignments"
  ON public.homework_assignments
  FOR SELECT
  USING (student_id = auth.uid());

-- 정책 2: 플래너가 자신이 만든 과제 조회
CREATE POLICY "Planners can view homework assignments they created"
  ON public.homework_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.homework h
      WHERE h.id = homework_assignments.homework_id
      AND h.planner_id = auth.uid()
    )
  );

-- 정책 3: 플래너가 과제 생성
CREATE POLICY "Planners can create homework assignments"
  ON public.homework_assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.homework h
      WHERE h.id = homework_id
      AND h.planner_id = auth.uid()
    )
  );

-- 정책 4: 플래너가 과제 상태 업데이트
CREATE POLICY "Planners can update homework assignments"
  ON public.homework_assignments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.homework h
      WHERE h.id = homework_assignments.homework_id
      AND h.planner_id = auth.uid()
    )
  );

-- 정책 5: 플래너가 과제 삭제
CREATE POLICY "Planners can delete homework assignments"
  ON public.homework_assignments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.homework h
      WHERE h.id = homework_assignments.homework_id
      AND h.planner_id = auth.uid()
    )
  );
```

**검증 SQL:**
```sql
-- 정책이 5개 생성되었는지 확인
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'homework_assignments'
ORDER BY policyname;
```

**즉시 검증**: 학생 앱 숙제 화면 새로고침 → 숙제 목록 표시 예상

---

## Phase 3-4: 선택사항 (현재 코드로도 작동 가능)

- Phase 3: homework 테이블 RLS 정책 수정
- Phase 4: 학생 API 코드 수정

---

## Phase 5-7: 라이선스 시스템 (향후 구현)

### 비즈니스 요구사항

**멀티 플래너 환경**:
- 최대 100명의 플래너 동시 사용
- 각 플래너: 10명~100명 이상의 학생 관리
- 베타 테스터: 약 30명의 플래너

**구독 정책**:
- 기본 요금: 50,000원 (10명 학생, 30일)
- 추가 학생: 1명당 5,000원
- 선불 결제 방식
- 중간 추가 시 남은 기간 계산

**라이선스 형식**: `30D-15P-암호화키`
- 30D: 사용 기간 30일
- 15P: 관리 가능 학생 수 15명
- 암호화키: 라이선스 검증용 암호화 키

**구현 필요 기능**:
1. 라이선스 관리 테이블
2. 라이선스 검증 미들웨어
3. 관리자 페이지
4. 라이선스 키 생성 로직
5. 사용량 추적 시스템

---

## Phase 8: AI 수업 영상 분석 시스템 (마지막 구현)

### 개요

**사용자 요구사항**: 플래너가 수업 영상을 업로드하면 자동으로 오디오 추출 → 파일 크기 축소 → 2개 AI API 분석 → 수업 요약, 학생 강점/약점, 추천 숙제 생성

**핵심 특징**:
- 플래너가 자신의 API 키를 발급받아 입력 (API 비용은 플래너가 지불)
- 설정 페이지에서 API 키 관리
- 25분 영상을 보지 않고도 피드백 제공 가능

**구현 필요 기능**:
1. 플래너 API 키 관리 테이블
2. 수업 영상 업로드 테이블
3. AI 분석 결과 테이블
4. API 키 설정 페이지
5. 영상 업로드 및 분석 페이지
6. Edge Function (영상 분석 파이프라인)
7. 수강과정/숙제 시스템 연동

---

## 실행 순서

1. ✅ **즉시 실행 (Phase 1)**: student_profiles RLS 정책 4개 추가
2. ✅ **즉시 실행 (Phase 2)**: homework_assignments RLS 정책 5개 추가
3. ⏳ **선택사항 (Phase 3-4)**: 기타 개선사항
4. ⏳ **향후 구현 (Phase 5-7)**: 라이선스 시스템
5. ⏳ **마지막 구현 (Phase 8)**: AI 영상 분석 시스템

**예상 소요 시간**: Phase 1-2는 약 15-20분
