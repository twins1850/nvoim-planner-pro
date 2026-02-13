# Phase 9B Implementation Report
## 예약 숙제 발송 UI 구현

**날짜**: 2026-02-13  
**담당자**: Claude Code  
**상태**: ✅ 완료

---

## 구현 개요

Phase 9B에서는 플래너 웹 앱에 예약 숙제 발송 기능의 UI를 구현했습니다. 사용자는 숙제를 즉시 발송하거나 특정 시간에 예약하여 발송할 수 있으며, 발송 상태별로 숙제를 필터링할 수 있습니다.

---

## 구현된 기능

### 1. CreateHomeworkModal.tsx 수정

**파일 경로**: `/apps/planner-web/src/components/homework/CreateHomeworkModal.tsx`

#### 추가된 State
```typescript
const [sendMode, setSendMode] = useState<'now' | 'scheduled'>('now');
const [scheduledFor, setScheduledFor] = useState("");
```

#### 새로운 UI 컴포넌트

**발송 방식 선택 버튼** (제목과 설명 사이에 위치):
- "지금 발송" 버튼 (Send 아이콘)
- "예약 발송" 버튼 (Clock 아이콘)
- 선택된 버튼은 파란색 배경으로 강조 표시

**예약 시간 선택 필드** (sendMode === 'scheduled'일 때만 표시):
- datetime-local 입력 필드
- 파란색 배경의 강조 박스
- 최소 시간: 현재 시간 + 30분
- 도움말 텍스트: "예약 시간은 현재 시간으로부터 최소 30분 이후여야 합니다."

#### 유효성 검사 로직
```typescript
// 예약 발송 시 시간 검증
if (sendMode === 'scheduled') {
  if (!scheduledFor) {
    setError("예약 발송 시간을 선택해주세요.");
    return;
  }
  const scheduledTime = new Date(scheduledFor);
  const minTime = new Date(Date.now() + 30 * 60 * 1000);
  if (scheduledTime < minTime) {
    setError("예약 시간은 최소 현재 시간으로부터 30분 이후여야 합니다.");
    return;
  }
}
```

#### 데이터베이스 저장 로직
```typescript
const homeworkData = {
  planner_id: user.id,
  title,
  description,
  instructions: description,
  due_date: dueDate,
  resources: attachmentUrls.length > 0 ? { attachments: attachmentUrls } : null,
  delivery_status: sendMode === 'scheduled' ? 'scheduled' : 'published',
  scheduled_for: sendMode === 'scheduled' ? scheduledFor : null
};
```

#### 알림 발송 로직 수정
- 예약 발송 시에는 즉시 알림을 보내지 않음
- 'now' 모드일 때만 즉시 알림 전송

---

### 2. HomeworkContent.tsx 수정

**파일 경로**: `/apps/planner-web/src/app/homework/HomeworkContent.tsx`

#### 추가된 State
```typescript
const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<'all' | 'draft' | 'scheduled' | 'published'>('all');
```

#### 발송 상태 필터 UI

통계 카드와 달력 사이에 배치된 필터 탭:
- **전체** (인디고색) - 모든 발송 상태
- **임시저장** (회색) - 저장만 하고 발송하지 않은 숙제
- **예약됨** (파란색) - 예약 발송 대기 중인 숙제
- **발송됨** (초록색) - 이미 학생들에게 발송된 숙제

각 버튼은 선택 시 해당 색상으로 강조 표시되며, 반응형 디자인으로 작은 화면에서도 스크롤 가능합니다.

#### 필터링 로직 개선
```typescript
const filteredHomework = useMemo(() => {
  return homework.filter((hw) => {
    // 날짜 필터
    const matchesDate = hw.due_date && isSameDay(new Date(hw.due_date), selectedDate)
    if (!matchesDate) return false

    // 검색어 필터
    const matchesSearch = searchTerm === '' ||
      hw.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hw.description?.toLowerCase().includes(searchTerm.toLowerCase())
    if (!matchesSearch) return false

    // 제출 상태 필터
    if (statusFilter !== 'all') {
      const hasMatchingStatus = hw.homework_assignments?.some((a: any) => a.status === statusFilter)
      if (!hasMatchingStatus) return false
    }

    // 발송 상태 필터 (새로 추가)
    if (deliveryStatusFilter !== 'all') {
      const hwDeliveryStatus = hw.delivery_status || 'published'
      if (hwDeliveryStatus !== deliveryStatusFilter) return false
    }

    return true
  })
}, [homework, selectedDate, searchTerm, statusFilter, deliveryStatusFilter])
```

#### 숙제 카드 개선

**발송 상태 뱃지 추가**:
- 임시저장: 회색 뱃지
- 예약됨: 파란색 뱃지 + Clock 아이콘

**예약 발송 정보 표시**:
```tsx
{hw.delivery_status === 'scheduled' && hw.scheduled_for && (
  <div className="flex items-center text-blue-600">
    <Clock className="h-4 w-4 mr-1" />
    발송 예정: {format(new Date(hw.scheduled_for), 'MM월 dd일 HH:mm', { locale: ko })}
  </div>
)}
```

---

## UI/UX 특징

### 색상 시스템
- **파란색**: 예약 발송 관련 (버튼, 뱃지, 정보)
- **회색**: 임시저장
- **초록색**: 발송 완료
- **인디고**: 기본 액션 버튼

### 사용자 피드백
- 버튼 호버 효과
- 선택된 상태의 명확한 시각적 표시
- 도움말 텍스트 제공
- 유효성 검사 오류 메시지

### 반응형 디자인
- 모바일 화면에서 버튼이 수직으로 쌓임
- 필터 탭이 작은 화면에서 스크롤 가능
- whitespace-nowrap으로 텍스트 줄바꿈 방지

---

## 데이터 모델

### homework 테이블 사용 필드
- `delivery_status`: 'draft' | 'scheduled' | 'published'
- `scheduled_for`: timestamp (예약 발송 시간)

### 기본값 처리
```typescript
const hwDeliveryStatus = hw.delivery_status || 'published'
```

기존 숙제는 `delivery_status`가 없을 수 있으므로 기본값으로 'published'를 사용합니다.

---

## 사용자 시나리오

### 시나리오 1: 즉시 발송
1. "숙제 생성" 버튼 클릭
2. 숙제 정보 입력 (제목, 설명, 마감일)
3. "지금 발송" 선택 (기본값)
4. 학생 선택
5. "숙제 생성 및 배정" 버튼 클릭
6. ✅ 즉시 발송되고 학생들에게 알림 전송

### 시나리오 2: 예약 발송
1. "숙제 생성" 버튼 클릭
2. 숙제 정보 입력
3. "예약 발송" 선택
4. 예약 시간 선택 (최소 현재 + 30분)
5. 학생 선택
6. "숙제 생성 및 배정" 버튼 클릭
7. ✅ 예약됨 상태로 저장 (알림 미발송)

### 시나리오 3: 예약된 숙제 확인
1. 숙제 관리 페이지 진입
2. 발송 상태 필터에서 "예약됨" 선택
3. ✅ 예약된 숙제 목록 표시
4. 각 숙제 카드에 "발송 예정: [날짜/시간]" 정보 표시

---

## 검증 완료 사항

### 코드 품질
- ✅ TypeScript 타입 안전성 확보
- ✅ 기존 코드 스타일 일관성 유지
- ✅ Tailwind CSS 클래스 사용
- ✅ lucide-react 아이콘 사용
- ✅ 유효성 검사 구현

### 기능 검증
- ✅ State 관리 정상 동작
- ✅ 조건부 렌더링 정상 동작
- ✅ 필터링 로직 정상 동작
- ✅ 유효성 검사 정상 동작

---

## 후속 작업 권장 사항

### 1. 백엔드 스케줄러 구현
예약된 숙제를 실제로 발송하는 백엔드 스케줄러가 필요합니다:
- Supabase Edge Functions 또는 Cron Job 사용
- `scheduled_for` 시간 도달 시 자동 발송
- `delivery_status`를 'scheduled'에서 'published'로 업데이트
- 학생들에게 알림 전송

### 2. 예약 취소/수정 기능
예약된 숙제를 취소하거나 수정할 수 있는 기능 추가:
- 예약 숙제 상세 페이지에서 "예약 취소" 버튼
- 예약 시간 수정 기능
- 임시저장으로 전환 기능

### 3. 대시보드 위젯
예약된 숙제를 한눈에 볼 수 있는 대시보드 위젯:
- 다가오는 예약 발송 목록
- 타임라인 시각화
- 퀵 액션 버튼

### 4. 알림 시스템 개선
예약 발송 관련 알림:
- 발송 5분 전 플래너에게 알림
- 발송 완료 시 확인 알림
- 발송 실패 시 오류 알림

---

## 기술 스택

- **프레임워크**: Next.js 15.5.10
- **UI**: React 19, Tailwind CSS
- **아이콘**: lucide-react
- **날짜 처리**: date-fns
- **데이터베이스**: Supabase (PostgreSQL)
- **타입 시스템**: TypeScript

---

## 결론

Phase 9B 구현이 성공적으로 완료되었습니다. 플래너는 이제 숙제를 즉시 발송하거나 특정 시간에 예약하여 발송할 수 있으며, 발송 상태별로 숙제를 필터링하여 관리할 수 있습니다. UI는 직관적이고 사용하기 쉬우며, 모든 유효성 검사와 오류 처리가 적절히 구현되었습니다.

다음 단계로는 백엔드 스케줄러 구현을 통해 예약된 숙제가 실제로 지정된 시간에 자동 발송되도록 하는 것을 권장합니다.
