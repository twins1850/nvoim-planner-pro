# 앤보임 플래너 프로 - 프로젝트 구조

## 📁 새로운 프로젝트 구조 (Supabase 기반)

```
nvoim-planer-pro/
├── supabase/                    # Supabase 설정 및 스키마
│   ├── schema.sql              # 데이터베이스 스키마
│   ├── types.ts                # TypeScript 타입 정의
│   └── migrations/             # 데이터베이스 마이그레이션
│
├── apps/
│   ├── planner-web/            # Next.js 플래너 웹앱
│   │   ├── src/
│   │   │   ├── app/           # Next.js 13+ App Router
│   │   │   ├── components/    # React 컴포넌트
│   │   │   ├── lib/          # 유틸리티 및 헬퍼
│   │   │   ├── hooks/        # Custom React Hooks
│   │   │   └── styles/       # 스타일 파일
│   │   ├── public/           # 정적 파일
│   │   ├── package.json
│   │   └── next.config.js
│   │
│   └── student-mobile/         # React Native 학생 모바일앱
│       ├── src/
│       │   ├── screens/      # 화면 컴포넌트
│       │   ├── components/   # 재사용 컴포넌트
│       │   ├── navigation/   # 내비게이션 설정
│       │   ├── services/     # API 및 서비스
│       │   ├── hooks/        # Custom Hooks
│       │   └── utils/        # 유틸리티 함수
│       ├── android/          # Android 설정
│       ├── ios/             # iOS 설정
│       ├── package.json
│       └── app.json
│
├── shared/                     # 공유 코드 및 타입
│   ├── types/                # 공통 TypeScript 타입
│   ├── utils/                # 공통 유틸리티 함수
│   └── constants/            # 공통 상수
│
├── docs/                      # 문서
│   ├── API.md                # API 문서
│   ├── SETUP.md              # 설정 가이드
│   └── DEPLOYMENT.md         # 배포 가이드
│
└── package.json              # 루트 패키지 설정
```

## 🛠 기술 스택

### Backend (Supabase)
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **Storage**: Supabase Storage
- **Edge Functions**: Supabase Edge Functions (필요시)

### Frontend - 플래너 웹앱
- **Framework**: Next.js 14+
- **UI Library**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Form Handling**: React Hook Form + Zod
- **Data Fetching**: @supabase/supabase-js + TanStack Query

### Frontend - 학생 모바일앱
- **Framework**: React Native + Expo
- **UI Library**: React Native Elements / NativeBase
- **Navigation**: React Navigation 6
- **State Management**: Zustand
- **Data Fetching**: @supabase/supabase-js + TanStack Query

## 🚀 주요 기능

### 플래너 웹앱
1. **대시보드**
   - 학생 현황 한눈에 보기
   - 오늘의 일정
   - 미완료 숙제 현황

2. **학생 관리**
   - 학생 프로필 관리
   - 학습 진도 추적
   - 개별 피드백 이력

3. **수업 관리**
   - 수업 일정 관리
   - 수업 자료 업로드
   - 출석 체크

4. **숙제 관리**
   - 숙제 생성 및 배정
   - 제출물 검토
   - 피드백 제공

5. **커뮤니케이션**
   - 학생과 실시간 채팅
   - 공지사항 발송
   - 알림 관리

### 학생 모바일앱
1. **홈 화면**
   - 오늘의 숙제
   - 최근 피드백
   - 학습 진도

2. **숙제**
   - 숙제 목록 및 상세보기
   - 숙제 제출 (텍스트/음성/동영상)
   - 제출 이력

3. **수업**
   - 수업 일정 확인
   - 수업 자료 다운로드
   - 출석 체크

4. **피드백**
   - 선생님 피드백 확인
   - 성적 및 진도 확인

5. **커뮤니케이션**
   - 선생님과 채팅
   - 알림 확인

## 📝 데이터베이스 구조

### 주요 테이블
- `profiles`: 사용자 기본 정보
- `planner_profiles`: 플래너 추가 정보
- `student_profiles`: 학생 추가 정보
- `classes`: 수업/반 정보
- `lessons`: 개별 수업 정보
- `homework`: 숙제 정보
- `homework_assignments`: 숙제 배정
- `homework_submissions`: 숙제 제출
- `feedback`: 피드백
- `messages`: 메시지/채팅
- `notifications`: 알림

## 🔐 보안
- Row Level Security (RLS) 정책 적용
- JWT 기반 인증
- 역할 기반 접근 제어 (RBAC)
- 민감한 데이터 암호화

## 📱 오프라인 지원
- 학생 앱: 오프라인 모드 지원
- 로컬 데이터 캐싱
- 네트워크 복구 시 자동 동기화

## 🚦 개발 로드맵

### Phase 1: 기초 설정 (Week 1)
- [x] Supabase 프로젝트 설정
- [x] 데이터베이스 스키마 설계
- [ ] Next.js 플래너 웹앱 초기 설정
- [ ] React Native 학생 앱 초기 설정
- [ ] Supabase 클라이언트 설정

### Phase 2: 핵심 기능 구현 (Week 2-3)
- [ ] 인증 시스템 구현
- [ ] 플래너 대시보드
- [ ] 학생 관리 기능
- [ ] 숙제 관리 시스템
- [ ] 학생 앱 홈 화면
- [ ] 숙제 제출 기능

### Phase 3: 고급 기능 (Week 4)
- [ ] 실시간 채팅
- [ ] 푸시 알림
- [ ] 파일 업로드/다운로드
- [ ] 오프라인 모드

### Phase 4: 마무리 (Week 5)
- [ ] 테스트 및 버그 수정
- [ ] 성능 최적화
- [ ] 배포 준비
- [ ] 문서화

## 🌟 차별화 포인트
1. **Supabase 활용**: 서버리스 아키텍처로 운영 비용 절감
2. **실시간 기능**: 즉각적인 피드백과 커뮤니케이션
3. **모바일 우선**: 학생들의 편의성 극대화
4. **데이터 기반**: 학습 진도 분석 및 개인화된 피드백
5. **확장 가능**: 다양한 교육 분야로 확장 가능한 구조