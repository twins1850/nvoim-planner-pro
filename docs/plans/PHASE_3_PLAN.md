# Phase 3 Plan: UI 개발 및 AI 통합

## 📋 개요
**목표:** AI 피드백 시스템을 학생 앱과 플래너 웹앱 UI에 통합하여 완전한 AI 기반 영어 학습 플랫폼 완성

**기간:** 2026-01-02 ~ 2026-01-10 (예상 8일)

**전제조건:** 
- ✅ Phase 1 완료 (기본 인프라)
- ✅ Phase 2 완료 (AI 인프라)
- ✅ Edge Function 배포 완료: `https://ybcjkdcdruquqrdahtga.supabase.co/functions/v1/audio-processor`

## 🎯 Phase 3 목표

### 1. 학생 앱 AI 통합 (우선순위: 높음)
**목표:** 학생이 음성을 녹음하고 AI 피드백을 받을 수 있는 완전한 워크플로우 구현

#### 1.1 음성 녹음 → AI 분석 파이프라인
- [ ] 기존 AudioRecorder 컴포넌트 확장
- [ ] 녹음된 오디오 → Supabase Storage 업로드
- [ ] Storage URL → Edge Function 호출
- [ ] AI 응답 처리 및 저장

#### 1.2 AI 피드백 UI 구현
- [ ] 발음 점수 시각화 (0-100 점수)
- [ ] 교정 제안 목록 표시
- [ ] 더 나은 표현 제안
- [ ] 긍정적 피드백 및 개선사항 표시

#### 1.3 피드백 히스토리 기능
- [ ] 과거 피드백 조회
- [ ] 진도 추적 차트
- [ ] 개선 동향 분석

### 2. 플래너 웹앱 AI 대시보드 (우선순위: 중간)
**목표:** 강사가 학생들의 AI 피드백을 모니터링하고 분석할 수 있는 대시보드 구현

#### 2.1 AI 피드백 관리 시스템
- [ ] 전체 학생 AI 피드백 조회
- [ ] 학생별 상세 분석 페이지
- [ ] 피드백 필터링 및 검색

#### 2.2 데이터 시각화
- [ ] 학생별 발음 진도 차트
- [ ] 전체 학급 성과 대시보드
- [ ] 자주 틀리는 패턴 분석

#### 2.3 강사 도구
- [ ] AI 피드백에 추가 코멘트 기능
- [ ] 학습 계획 수정 제안
- [ ] 개별 학습 목표 설정

### 3. 데이터베이스 스키마 확장
**목표:** AI 피드백 데이터를 효율적으로 저장하고 조회할 수 있는 구조 구축

#### 3.1 새로운 테이블 추가
```sql
-- AI 피드백 결과 저장
CREATE TABLE ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_submission_id UUID REFERENCES homework_submissions(id),
  student_id UUID REFERENCES students(id),
  transcript TEXT,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  corrections JSONB,
  better_expressions JSONB,
  positive_feedback TEXT,
  areas_for_improvement TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI 분석 세션 관리
CREATE TABLE ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  session_date DATE DEFAULT CURRENT_DATE,
  total_submissions INTEGER DEFAULT 0,
  average_score DECIMAL(5,2),
  improvement_trend TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3.2 기존 테이블 확장
- [ ] homework_submissions 테이블에 ai_processed 플래그 추가
- [ ] audio_file_url 컬럼 추가
- [ ] processing_status 컬럼 추가 (pending/processing/completed/failed)

## 🛠 기술 구현 계획

### 학생 앱 (React Native + Expo)
```typescript
// AI 피드백 처리 서비스
export const aiService = {
  // 음성 파일 업로드 및 AI 분석 요청
  async processAudioSubmission(audioUri: string, homeworkId: string): Promise<AIFeedback> {
    // 1. Storage에 오디오 파일 업로드
    const fileUrl = await uploadAudioToStorage(audioUri);
    
    // 2. Edge Function 호출
    const response = await supabase.functions.invoke('audio-processor', {
      body: { 
        submissionId: homeworkId,
        fileUrl: fileUrl 
      }
    });
    
    // 3. 결과를 데이터베이스에 저장
    await saveAIFeedback(response.data);
    
    return response.data;
  }
};

// AI 피드백 표시 컴포넌트
const AIFeedbackScreen = ({ feedbackId }: { feedbackId: string }) => {
  const [feedback, setFeedback] = useState<AIFeedback | null>(null);
  
  return (
    <ScrollView>
      <ScoreCircle score={feedback?.score} />
      <CorrectionsList corrections={feedback?.corrections} />
      <BetterExpressions expressions={feedback?.better_expressions} />
      <FeedbackText positive={feedback?.positive_feedback} />
      <ImprovementAreas areas={feedback?.areas_for_improvement} />
    </ScrollView>
  );
};
```

### 플래너 웹앱 (Next.js)
```typescript
// AI 대시보드 페이지
// app/dashboard/ai-feedback/page.tsx
export default async function AIFeedbackDashboard() {
  const feedback = await getStudentAIFeedback();
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <StudentProgressChart data={feedback} />
      <ClassOverviewStats stats={calculateClassStats(feedback)} />
      <RecentFeedbackTable feedback={feedback} />
      <TrendAnalysisChart data={feedback} />
    </div>
  );
}

// 학생별 상세 분석 페이지
// app/dashboard/students/[id]/ai-analysis/page.tsx
export default async function StudentAIAnalysis({ params }: { params: { id: string } }) {
  const student = await getStudentById(params.id);
  const aiHistory = await getStudentAIHistory(params.id);
  
  return (
    <div>
      <StudentHeader student={student} />
      <ProgressTimeline history={aiHistory} />
      <DetailedAnalytics analytics={calculateDetailedAnalytics(aiHistory)} />
      <TeacherComments studentId={params.id} />
    </div>
  );
}
```

## 📊 성공 지표

### 기능적 성공 지표
- [ ] 학생이 음성을 녹음하고 AI 피드백을 받을 수 있음
- [ ] AI 피드백이 1분 이내에 생성됨
- [ ] 플래너에서 모든 학생의 AI 분석 결과를 조회할 수 있음
- [ ] 데이터 시각화가 정확하게 표시됨

### 기술적 성공 지표
- [ ] Edge Function 호출 성공률 95% 이상
- [ ] 오디오 파일 업로드 성공률 98% 이상
- [ ] 페이지 로딩 시간 3초 이내
- [ ] 모바일 앱 반응성 확보

### 사용자 경험 성공 지표
- [ ] 직관적인 UI/UX (사용자 테스트 통과)
- [ ] 오류 처리 및 로딩 상태 명확히 표시
- [ ] 접근성 기준 충족

## ⏱ 일정 계획

### Week 1 (2026-01-02 ~ 2026-01-05)
**Day 1-2: 학생 앱 AI 통합 기초**
- [ ] 오디오 업로드 → Edge Function 파이프라인 구현
- [ ] AI 피드백 데이터 모델 정의
- [ ] 기본 피드백 표시 UI 구현

**Day 3-4: 학생 앱 AI UI 완성**
- [ ] 점수 시각화 컴포넌트
- [ ] 상세 피드백 화면
- [ ] 히스토리 기능

### Week 2 (2026-01-06 ~ 2026-01-10)  
**Day 5-6: 플래너 웹앱 AI 대시보드**
- [ ] AI 피드백 관리 페이지
- [ ] 학생별 상세 분석 페이지
- [ ] 데이터 시각화 차트

**Day 7-8: 테스트 및 최적화**
- [ ] 전체 시스템 통합 테스트
- [ ] 성능 최적화
- [ ] 버그 수정 및 UI/UX 개선

## 🔧 필요한 도구 및 라이브러리

### 학생 앱 (React Native)
```bash
# 차트 및 시각화
npm install react-native-chart-kit react-native-svg

# 오디오 처리
npm install expo-av expo-file-system

# 애니메이션
npm install react-native-reanimated
```

### 플래너 웹앱 (Next.js)
```bash
# 차트 라이브러리
npm install recharts @tremor/react

# 데이터 테이블
npm install @tanstack/react-table

# 날짜 처리
npm install date-fns
```

## 🚨 리스크 및 대응 방안

### 기술적 리스크
1. **Edge Function 호출 실패**
   - 대응: 재시도 로직 및 오류 처리 강화
   - 백업: 클라이언트 측 기본 피드백 제공

2. **오디오 파일 크기 제한**
   - 대응: 클라이언트 측 압축 및 최적화
   - 백업: 파일 분할 업로드

3. **AI API 사용량 한계**
   - 대응: 사용량 모니터링 대시보드
   - 백업: 사용량 제한 및 알림

### 사용자 경험 리스크
1. **느린 AI 응답 시간**
   - 대응: 로딩 애니메이션 및 진행률 표시
   - 백업: 백그라운드 처리 및 알림

2. **복잡한 UI**
   - 대응: 사용자 테스트 및 피드백 반영
   - 백업: 단계별 온보딩 가이드

## 📚 참고 문서

- [Phase 2 Progress Report](./PHASE_2_PROGRESS.md)
- [Edge Function Deployment Guide](./EDGE_FUNCTION_DEPLOYMENT.md)
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [React Native Chart Kit](https://github.com/indiespirit/react-native-chart-kit)
- [Recharts Documentation](https://recharts.org/)

---

**다음 단계**: Phase 3 개발 시작 - 학생 앱 AI 통합부터 시작

*생성일: 2026-01-02*
*담당: Claude Code*