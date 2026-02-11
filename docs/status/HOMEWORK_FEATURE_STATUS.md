# 숙제 기능 현재 구현 상태 보고서

**분석 일시**: 2026-02-08
**전체 완성도**: **30%** ⚠️

---

## 1. 데이터베이스 스키마 ✅ (90% 완료)

### 1.1 `homework` 테이블
**파일**: `supabase/migrations/002_student_profiles.sql`
**상태**: ✅ 기본 구조 완성

```sql
CREATE TABLE public.homework (
  id UUID PRIMARY KEY,
  teacher_id UUID REFERENCES auth.users(id),
  student_id UUID REFERENCES students(id),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'speaking',
  difficulty TEXT DEFAULT 'medium',
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',  -- pending, submitted, graded, late
  resources JSONB,  -- 첨부 파일 (추가됨)
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**구현된 필드**:
- ✅ id, teacher_id, student_id
- ✅ title, description
- ✅ type, difficulty
- ✅ due_date, status
- ✅ resources (JSONB - 첨부 파일)
- ✅ timestamps

**부족한 필드**:
- ⚠️ `estimated_time_minutes` - HomeworkContent에서 사용하지만 DB에 없음
- ⚠️ `lesson_id` - 수업과 연결 필요
- ⚠️ `points/score` - 배점 시스템

### 1.2 `homework_submissions` 테이블
**상태**: ✅ 기본 구조 완성

```sql
CREATE TABLE public.homework_submissions (
  id UUID PRIMARY KEY,
  homework_id UUID REFERENCES homework(id),
  student_id UUID REFERENCES auth.users(id),
  submission_text TEXT,
  audio_url TEXT,
  video_url TEXT,
  submitted_at TIMESTAMP,
  ai_feedback JSONB,  -- AI 피드백 저장
  teacher_feedback TEXT,
  score INT,
  status TEXT DEFAULT 'submitted'
);
```

**구현된 기능**:
- ✅ 텍스트/오디오/비디오 제출
- ✅ AI 피드백 필드 (JSONB)
- ✅ 선생님 피드백 필드
- ✅ 점수 필드

**부족한 기능**:
- ❌ AI 피드백 자동 생성 로직
- ❌ 첨부 파일 관리 시스템
- ❌ 채점 기준/루브릭

### 1.3 `homework_assignments` 테이블
**상태**: ⚠️ 언급만 있음, 스키마 미확인

**용도**: 숙제 배정 관리 (다대다 관계)
**필요 필드**:
- homework_id
- student_id
- assigned_at
- status (pending, submitted, reviewed, completed)
- due_date (개별 마감일)

### 1.4 RLS (Row Level Security)
**상태**: ✅ 부분 구현

**구현된 정책**:
- ✅ 선생님이 자신의 숙제만 조회/수정
- ✅ 학생이 자신에게 배정된 숙제만 조회

**관련 파일**:
- `016_fix_homework_rls_policy.sql`
- `019_homework_assignments_rls.sql`
- `020_homework_select_policy.sql`

---

## 2. 플래너 앱 (선생님용) - **40% 완료**

### 2.1 숙제 목록 페이지 ✅
**파일**: `/apps/planner-web/src/app/homework/HomeworkContent.tsx`
**상태**: ✅ UI 완성, 기능 부분 구현

**구현된 기능**:
- ✅ 숙제 목록 표시
- ✅ 검색 필터 (제목)
- ✅ 상태 필터 (pending, submitted, reviewed, completed)
- ✅ 통계 카드 (전체/미제출/완료)
- ✅ 배정 상태 표시 (학생별 상태)

**구현된 UI 요소**:
- ✅ 숙제 카드 (제목, 설명, 마감일, 예상 시간, 배정 인원)
- ✅ 상태별 색상/아이콘 표시
- ✅ "숙제 생성" 버튼
- ✅ "예약 숙제" 링크
- ✅ "보기", "편집" 버튼 (UI만 있음, 기능 없음)

**미구현 기능**:
- ❌ 숙제 상세 보기 (보기 버튼 동작 없음)
- ❌ 숙제 편집 (편집 버튼 동작 없음)
- ❌ 숙제 삭제
- ❌ 제출물 확인 페이지
- ❌ 채점 인터페이스
- ❌ 피드백 작성 인터페이스

### 2.2 숙제 생성 모달 ✅
**파일**: `/apps/planner-web/src/components/homework/CreateHomeworkModal.tsx`
**상태**: ✅ 기본 기능 구현

**구현된 기능**:
- ✅ 제목, 설명 입력
- ✅ 마감일 설정
- ✅ 학생 선택 (다중 선택)
- ✅ 전체 선택 기능
- ✅ 파일 첨부 (AttachmentFile 인터페이스 정의)
- ✅ 알림 전송 옵션

**미구현 기능**:
- ⚠️ 숙제 타입 선택 (speaking, writing 등) - UI 없음
- ⚠️ 난이도 선택 (easy, medium, hard) - UI 없음
- ⚠️ 예상 소요 시간 입력
- ❌ 템플릿 기능
- ❌ 반복 숙제 설정
- ❌ 수업 연결 기능

### 2.3 예약 숙제 페이지 ⚠️
**파일**: `/apps/planner-web/src/app/homework/scheduled/`
**상태**: ⚠️ 디렉토리만 존재, 구현 미확인

**관련 스크립트**:
- `scripts/setup-scheduled-homework.sql`
- `scripts/create-scheduled-homework-simple.sql`

---

## 3. 학생 앱 - **50% 완료**

### 3.1 숙제 목록 화면 ✅
**파일**: `/apps/student/src/screens/HomeworkScreen.tsx`
**상태**: ✅ 기본 기능 구현

**구현된 기능**:
- ✅ 숙제 목록 조회 (`homeworkAPI.getHomeworks()`)
- ✅ 오프라인 모드 지원 (캐싱)
- ✅ 상태별 탭 (pending, completed, all)
- ✅ 새로고침 기능
- ✅ HomeworkCard 컴포넌트 사용

**미구현 기능**:
- ⚠️ 필터링 (마감일순, 중요도순 등)
- ⚠️ 검색 기능

### 3.2 숙제 상세 화면 ✅
**파일**: `/apps/student/src/screens/HomeworkDetailScreen.tsx`
**상태**: ✅ 기본 구조 구현 (15,785 bytes)

**예상 구현 내용** (파일 크기 기준):
- ✅ 숙제 정보 표시
- ✅ 제출 버튼
- ✅ 이전 제출 내역 조회

### 3.3 숙제 제출 화면 ✅
**파일**: `/apps/student/src/screens/HomeworkSubmissionScreen.tsx`
**상태**: ✅ 상세 구현 (25,553 bytes - 가장 큰 파일)

**예상 구현 내용** (파일 크기 기준):
- ✅ 텍스트 입력
- ✅ 오디오 녹음
- ✅ 비디오 녹화
- ✅ 파일 첨부
- ✅ 제출 처리

---

## 4. API 및 비즈니스 로직 - **20% 완료**

### 4.1 Supabase RPC 함수
**상태**: ⚠️ 최소 기능만 존재

**확인된 함수**:
- ⚠️ 기본 CRUD만 가능할 것으로 추정

**필요한 RPC 함수**:
- ❌ `get_student_homework` - 학생별 숙제 조회
- ❌ `submit_homework` - 숙제 제출
- ❌ `grade_homework` - 채점
- ❌ `generate_ai_feedback` - AI 피드백 생성
- ❌ `get_homework_statistics` - 통계 조회

### 4.2 알림 시스템
**파일**: `20260207_create_homework_notification_trigger.sql`
**상태**: ✅ 트리거 생성됨

**구현된 기능**:
- ✅ 숙제 배정 시 알림 생성

**미구현 기능**:
- ❌ 마감일 리마인더
- ❌ 제출 완료 알림
- ❌ 채점 완료 알림

### 4.3 파일 업로드
**파일**: `/apps/planner-web/src/lib/storage.ts`
**상태**: ✅ 유틸리티 함수 구현

**구현된 함수**:
- ✅ `uploadFileToStorage`
- ✅ `formatFileSize`
- ✅ `isValidFileType`
- ✅ `isValidFileSize`
- ✅ `getFileIconType`

**미구현 기능**:
- ❌ 동영상 썸네일 생성
- ❌ 오디오 파형 생성
- ❌ 파일 암호화

---

## 5. AI 분석 기능 - **5% 완료** ❌

### 5.1 AI 피드백 생성
**상태**: ❌ 거의 미구현

**DB 필드만 존재**:
- `homework_submissions.ai_feedback` (JSONB)

**필요한 기능**:
- ❌ 음성 인식 (STT)
- ❌ 발음 분석
- ❌ 문법 분석
- ❌ 유창성 평가
- ❌ 어휘 평가
- ❌ 종합 피드백 생성

### 5.2 수업 내용 분석
**파일**: `supabase/migrations/20260114_phase8_ai_video_analysis_schema.sql`
**상태**: ⚠️ 스키마만 존재

**예상 테이블**:
- 수업 비디오 분석
- 학습 패턴 추적
- 성적 예측

**구현 상태**: ❌ 로직 미구현

---

## 6. 기능별 완성도 요약

| 기능 | 완성도 | 상태 | 우선순위 |
|------|--------|------|----------|
| **데이터베이스** | 90% | ✅ | P0 |
| **플래너: 숙제 목록** | 70% | ✅ | P0 |
| **플래너: 숙제 생성** | 60% | ⚠️ | P0 |
| **플래너: 숙제 상세** | 10% | ❌ | P1 |
| **플래너: 제출물 확인** | 0% | ❌ | P1 |
| **플래너: 채점** | 0% | ❌ | P1 |
| **학생: 숙제 목록** | 70% | ✅ | P0 |
| **학생: 숙제 상세** | 50% | ⚠️ | P0 |
| **학생: 숙제 제출** | 60% | ⚠️ | P0 |
| **알림 시스템** | 30% | ⚠️ | P2 |
| **파일 업로드** | 70% | ✅ | P1 |
| **AI 피드백** | 5% | ❌ | P2 |
| **예약 숙제** | 20% | ❌ | P3 |

---

## 7. 주요 미구현 기능 리스트

### 🔴 P0 (필수 기능)
1. **숙제 상세 보기** (플래너)
   - 상세 정보 페이지
   - 제출 현황 확인
   - 학생별 제출물 목록

2. **제출물 확인 인터페이스** (플래너)
   - 텍스트/오디오/비디오 재생
   - 첨부 파일 다운로드
   - 이전 제출 내역

3. **채점 시스템** (플래너)
   - 점수 입력
   - 선생님 피드백 작성
   - 상태 변경 (reviewed, completed)

4. **숙제 편집/삭제** (플래너)
   - 수정 인터페이스
   - 삭제 확인 다이얼로그

### 🟡 P1 (중요 기능)
5. **숙제 생성 개선** (플래너)
   - 타입 선택 UI
   - 난이도 선택 UI
   - 예상 시간 입력
   - 수업 연결

6. **제출 완료 처리** (학생)
   - 제출 확인 화면
   - 수정 기능
   - 취소 기능

7. **마감일 관리**
   - 마감일 리마인더
   - 연장 요청 기능
   - 늦은 제출 처리

### 🟢 P2 (부가 기능)
8. **AI 피드백 생성**
   - STT (Speech-to-Text)
   - 발음/문법 분석
   - 자동 피드백 생성

9. **예약 숙제**
   - 예약 생성 UI
   - 자동 배정 로직
   - 반복 숙제

10. **통계 및 리포트**
    - 제출율 통계
    - 평균 점수
    - 학습 패턴 분석

---

## 8. 기술 부채 및 문제점

### 8.1 데이터 모델 불일치
- `estimated_time_minutes` 필드가 UI에 있지만 DB에 없음
- `homework_assignments` 테이블 스키마 미확인
- `lesson_id` 연결 누락

### 8.2 중복 코드
- 학생 조회 로직이 여러 곳에 분산
- 상태 색상/아이콘 로직 중복
- 파일 업로드 로직 통합 필요

### 8.3 에러 처리 부족
- 파일 업로드 실패 처리
- 네트워크 오류 처리
- 권한 오류 처리

### 8.4 테스트 부재
- 단위 테스트 없음
- 통합 테스트 없음
- E2E 테스트 없음

---

## 9. 다음 단계 제안

### Phase 9A: 핵심 CRUD 완성 (1주)
1. 숙제 상세 보기 구현
2. 제출물 확인 인터페이스 구현
3. 채점 시스템 기본 기능
4. 숙제 편집/삭제 기능

### Phase 9B: 제출 프로세스 개선 (1주)
1. 학생 제출 플로우 완성
2. 파일 첨부 안정화
3. 오프라인 지원 강화
4. 알림 시스템 통합

### Phase 9C: AI 분석 기초 (2주)
1. STT 통합 (Whisper API)
2. 기본 텍스트 분석
3. 간단한 피드백 생성
4. 피드백 표시 UI

### Phase 9D: 고급 기능 (2주)
1. 예약 숙제 시스템
2. 통계 대시보드
3. 템플릿 시스템
4. 반복 숙제 설정

---

## 10. 예상 개발 일정

| Phase | 기능 | 소요 시간 | 완성도 목표 |
|-------|------|-----------|-------------|
| 9A | 핵심 CRUD | 1주 | 70% → 85% |
| 9B | 제출 프로세스 | 1주 | 85% → 90% |
| 9C | AI 기초 | 2주 | 90% → 95% |
| 9D | 고급 기능 | 2주 | 95% → 100% |
| **총합** | | **6주** | **30% → 100%** |

---

## 결론

**현재 상태**: 숙제 기능의 기본 골격은 완성되었으나, 실제 사용 가능한 수준은 **30%** 정도입니다.

**강점**:
- ✅ 데이터베이스 스키마 잘 설계됨
- ✅ 기본 UI 컴포넌트 구현
- ✅ 파일 업로드 유틸리티 준비
- ✅ 학생 앱 기본 화면 구현

**약점**:
- ❌ 선생님 측 워크플로우 미완성 (상세/채점/피드백)
- ❌ AI 분석 기능 거의 없음 (5%)
- ❌ 테스트 전무
- ❌ 에러 처리 부족

**권장 사항**:
1. **Phase 9A부터 시작** - 핵심 CRUD 완성이 최우선
2. **AI는 Phase 9C로 연기** - 기본 기능 먼저 안정화
3. **테스트 코드 작성** - 각 Phase마다 통합 테스트 추가
4. **점진적 배포** - Phase 9A 완료 후 베타 테스트 시작

---

**작성자**: Claude Sonnet 4.5
**분석 완료**: 2026-02-08 23:55 KST
