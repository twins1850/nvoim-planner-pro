# NVOIM English Planner Pro - Claude Code 개발 가이드

이 파일은 Claude Code가 NVOIM 영어회화 학습 플랫폼을 효율적으로 개발할 수 있도록 프로젝트 구조와 개발 환경을 정리한 문서입니다.

## 📋 목차
1. [사용하는 기술 정리](#1-사용하는-기술-정리)
2. [프로젝트 아키텍처](#2-프로젝트-아키텍처)
3. [프론트엔드 & 백엔드 정리](#3-프론트엔드--백엔드-정리)
4. [개발자 환경 설정](#4-개발자-환경-설정)
5. [자주 사용하는 Bash 명령어](#5-자주-사용하는-bash-명령어)
6. [핵심 파일 및 유틸리티 함수](#6-핵심-파일-및-유틸리티-함수)
7. [코드 스타일 가이드라인](#7-코드-스타일-가이드라인)
8. [저장소 에티켓](#8-저장소-에티켓)

---

## 1. 사용하는 기술 정리

### 🎯 Core Technologies
- **Database**: Supabase (PostgreSQL + Authentication + Real-time + Storage)
- **Backend**: Supabase 클라우드 서비스 (완전 관리형)
- **State Management**: React Context API + AsyncStorage
- **Authentication**: Supabase Auth
- **Deployment**: Render.com (Production)

### 📱 Student App (Mobile - React Native + Expo)
```
📦 apps/student/
├── 🛠 React Native + Expo SDK
├── 📘 TypeScript
├── 🧭 React Navigation 6
├── 💾 AsyncStorage (Local Storage)
├── 📱 Expo SecureStore (Sensitive Data)
├── 🎵 Expo AV (Audio Recording)
├── 🌐 Supabase JS Client
└── 📱 현재 로컬 개발 환경에서만 실행 가능
```

### 💻 Planner Web (Desktop - Next.js) - **🚀 PRODUCTION LIVE**
```
📦 apps/planner-web/
├── ⚛️ React 18
├── 🔄 Next.js 15 (App Router)
├── 📘 TypeScript
├── 🎨 Tailwind CSS
├── 🧩 Shadcn/ui Components
├── 🌐 Supabase JS Client
├── 🚀 Render 배포 (https://nvoim-planner-pro.onrender.com)
└── 💻 강사용 웹앱 (운영 중)
```

### 🔧 Development Tools
- **Package Manager**: npm
- **Code Quality**: ESLint + Prettier
- **Type Checking**: TypeScript Strict Mode
- **Version Control**: Git
- **Production Deployment**: Render.com

---

## 2. 프로젝트 아키텍처

### 🏗 Overall Architecture
```
NVOIM English Planner Pro - 앤보임 영어회화 관리 시스템
├── 💻 Planner Web App (Next.js) - 🚀 LIVE on Render
│   ├── 👩‍🏫 강사용 관리 인터페이스
│   ├── 📋 숙제 생성 및 관리
│   ├── ✅ 숙제 채점 및 피드백
│   ├── 📊 학생 관리 시스템
│   └── 📈 학습 진도 분석 대시보드
│
├── 📱 Student Mobile App (React Native + Expo) - 로컬 개발
│   ├── 🎓 학생용 학습 인터페이스
│   ├── 📝 숙제 확인 및 제출
│   ├── 🎤 음성 녹음 기능
│   ├── 📊 학습 진도 추적
│   └── 💬 강사와의 메시징
│
└── ☁️ Supabase Backend (클라우드 완전 관리형)
    ├── 🔐 사용자 인증 (Students, Teachers)
    ├── 📊 PostgreSQL Database (Row Level Security)
    ├── 📁 File Storage (Audio, Images, Study Materials)
    ├── 🔄 Real-time Subscriptions
    └── ⚡ Edge Functions (필요시 확장)
```

### 🌐 현재 운영 환경
```
라이브 서비스:
🌍 강사용 웹앱: https://nvoim-planner-pro.onrender.com
📱 학생 모바일앱: 로컬 개발 환경 (개발 중)
☁️ 백엔드: Supabase 클라우드 (ybcjkdcdruquqrdahtga.supabase.co)
```

### 🗃 Database Schema (Supabase)
```sql
-- 핵심 테이블 구조 (완전히 구현됨)
tables:
  - profiles (사용자 프로필 - 자동 생성)
  - students (학생 정보 및 강사 연결)
  - lessons (수업 기록)
  - homework (숙제 배정)
  - homework_submissions (숙제 제출)
  - messages (실시간 메시징 시스템)
  - study_materials (학습 자료)
  - feedback (피드백 시스템)
  - notifications (알림)

-- Storage Buckets (파일 저장소)
buckets:
  - general-files (공개 파일)
  - homework-files (개인 파일)
  - homework-submissions (숙제 제출)
  - study-materials (학습 자료)
  - avatars (프로필 이미지)
```

---

## 3. 프론트엔드 & 백엔드 정리

### 💻 Planner Web (Frontend - Next.js) - **🚀 운영 중**

**🌐 Production URL**: https://nvoim-planner-pro.onrender.com

**🎯 구현된 주요 기능**:
- ✅ 강사 인증 및 프로필 관리
- ✅ 학생 등록 및 관리 시스템
- ✅ 수업 일정 및 내용 기록
- ✅ 숙제 생성, 배정 및 관리
- ✅ 숙제 제출 확인 및 채점
- ✅ 실시간 메시징 시스템
- ✅ 학습 자료 업로드 및 관리
- ✅ 학생 진도 분석 대시보드
- ✅ 피드백 작성 및 관리

**📁 주요 디렉터리**:
```
apps/planner-web/src/
├── app/             # Next.js 15 App Router
│   ├── auth/        # 인증 관련 페이지
│   ├── dashboard/   # 대시보드
│   ├── students/    # 학생 관리
│   ├── homework/    # 숙제 관리
│   └── messages/    # 메시징
├── components/      # React 컴포넌트
│   ├── ui/         # Shadcn/ui 컴포넌트
│   ├── dashboard/  # 대시보드 컴포넌트
│   └── forms/      # 폼 컴포넌트
├── lib/            # Supabase 클라이언트 설정
└── utils/          # 유틸리티 함수
```

### 📱 Student App (Frontend - React Native) - **개발 중**

**📱 개발 환경**: 로컬에서만 실행 가능

**🎯 구현된 주요 기능**:
- ✅ 학생 인증 (로그인/회원가입)
- ✅ 숙제 목록 조회 및 상세보기
- ✅ 음성 녹음 및 숙제 제출
- ✅ 강사 피드백 확인
- ✅ 학습 진도 추적
- ✅ 실시간 알림
- ✅ 강사와의 메시징

**📁 주요 디렉터리**:
```
apps/student/src/
├── screens/          # 화면 컴포넌트
│   ├── auth/        # 인증 화면
│   ├── homework/    # 숙제 관련
│   ├── messages/    # 메시징
│   └── profile/     # 프로필
├── components/       # 재사용 컴포넌트
├── services/         # API 호출 로직 (supabaseApi.ts)
├── navigation/       # React Navigation 설정
├── hooks/           # 커스텀 훅
├── utils/           # 유틸리티 함수
└── lib/             # Supabase 클라이언트 설정
```

### ☁️ Backend (Supabase) - **완전 관리형 클라우드**

**🔧 Supabase 프로젝트 정보**:
- **Project ID**: ybcjkdcdruquqrdahtga
- **URL**: `https://ybcjkdcdruquqrdahtga.supabase.co`
- **Plan**: 무료 플랜 (향후 Pro 플랜 업그레이드 고려)
- **Authentication**: 이메일/패스워드 + Row Level Security (RLS)
- **Database**: PostgreSQL with 완전 관리형
- **Storage**: 다중 버킷 구성
- **Real-time**: WebSocket 기반 실시간 동기화

**📊 구현된 주요 기능**:
- ✅ 사용자 인증 및 프로필 자동 생성
- ✅ Row Level Security (RLS) 정책 적용
- ✅ 실시간 메시징 시스템
- ✅ 파일 업로드 및 스토리지 관리
- ✅ 데이터베이스 스키마 완전 구현
- ✅ API 자동 생성 (REST/GraphQL)

---

## 4. 개발자 환경 설정

### 🛠 Required Software
```bash
# Node.js (v18 이상)
node --version  # v18+

# npm (v9 이상)  
npm --version   # v9+

# Expo CLI (Student App 개발용)
npm install -g @expo/cli

# Git
git --version
```

### 💻 Planner Web 환경 설정
```bash
# 1. 의존성 설치
cd apps/planner-web
npm install

# 2. 환경 변수 설정 (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://ybcjkdcdruquqrdahtga.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Supabase Anon Key]
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 3. 개발 서버 시작
npm run dev
# → http://localhost:3000

# 4. 프로덕션 빌드 테스트
npm run build && npm start
```

### 📱 Student App 환경 설정
```bash
# 1. 의존성 설치
cd apps/student
npm install

# 2. 환경 변수 설정 (.env)
EXPO_PUBLIC_SUPABASE_URL=https://ybcjkdcdruquqrdahtga.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[Supabase Anon Key]
EXPO_PUBLIC_APP_NAME=NVOIM Student

# 3. 개발 서버 시작
npx expo start

# 4. 플랫폼별 실행
npx expo start --ios      # iOS 시뮬레이터
npx expo start --android  # Android 에뮬레이터
npx expo start --web      # 웹 브라우저
```

---

## 5. 자주 사용하는 Bash 명령어

### 💻 Planner Web Commands (Production Live)
```bash
# 개발 환경 시작
cd apps/planner-web && npm run dev

# 프로덕션 빌드 (Render 배포용)
npm run build                # Next.js 빌드
npm start                    # 프로덕션 서버 시작

# 코드 품질 검사
npm run lint                 # ESLint 실행
npm run type-check           # TypeScript 타입 체크

# Render 배포 확인
curl https://nvoim-planner-pro.onrender.com/health
```

### 📱 Student App Commands (Local Development)
```bash
# 개발 환경 시작
cd apps/student && npx expo start

# 플랫폼별 실행
npx expo start --ios          # iOS 시뮬레이터
npx expo start --android      # Android 에뮬레이터  
npx expo start --web          # 웹 브라우저

# 의존성 관리
npm install                   # 패키지 설치
npx expo install              # Expo 호환 패키지 설치
npm audit fix                 # 보안 취약점 수정

# 미래 배포 준비
npx expo build:ios           # iOS 빌드 (추후)
npx expo build:android       # Android 빌드 (추후)
```

### 🔧 Common Development Commands
```bash
# Git 워크플로우
git status                   # 상태 확인
git add .                    # 모든 변경사항 스테이징
git commit -m "메시지"        # 커밋
git push origin main         # 푸시 (자동 Render 배포 트리거)

# 전체 프로젝트 동시 실행 (개발용)
# Terminal 1: cd apps/planner-web && npm run dev
# Terminal 2: cd apps/student && npx expo start

# Supabase 관련
# Supabase 대시보드: https://supabase.com/dashboard/project/ybcjkdcdruquqrdahtga
```

---

## 6. 핵심 파일 및 유틸리티 함수

### 💻 Planner Web 핵심 파일

#### 🔗 Supabase 설정 (`apps/planner-web/src/lib/`)
```typescript
// supabase.ts - Supabase 클라이언트 설정
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

#### 🎨 주요 컴포넌트 (`apps/planner-web/src/components/`)
```typescript
// dashboard/ - 대시보드 컴포넌트들
// forms/ - 폼 관련 컴포넌트들  
// ui/ - Shadcn/ui 기본 컴포넌트들
```

### 📱 Student App 핵심 파일

#### 🔗 API 서비스 (`apps/student/src/services/supabaseApi.ts`)
```typescript
// 메인 API 서비스 - 완전히 구현됨
export const authAPI = {
  login: (email: string, password: string) => Promise,
  register: (userData: RegisterData) => Promise,
  logout: () => Promise
};

export const homeworkAPI = {
  getHomeworks: () => Promise,
  getHomeworkDetail: (id: string) => Promise,
  submitHomework: (id: string, data: SubmissionData) => Promise
};

export const feedbackAPI = {
  getFeedbacks: () => Promise,
  getFeedbackDetail: (id: string) => Promise
};

export const profileAPI = {
  getProfile: () => Promise,
  updateProfile: (data: ProfileData) => Promise
};

export const notificationAPI = {
  getNotifications: () => Promise,
  markAsRead: (id: string) => Promise
};

export const progressAPI = {
  getStudentProgress: () => Promise
};
```

#### 🧭 네비게이션 (`apps/student/src/navigation/`)
```typescript
// types.ts - 네비게이션 타입 정의
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  HomeworkDetail: { homeworkId: string };
  FeedbackDetail: { feedbackId: string };
  Settings: undefined;
  Notifications: undefined;
  ServerTest: undefined;
};
```

#### 🎨 주요 컴포넌트 (`apps/student/src/components/`)
```typescript
// HomeworkCard.tsx - 숙제 카드 컴포넌트
// AudioRecorder.tsx - 음성 녹음 컴포넌트  
// CustomButton.tsx - 커스텀 버튼
```

---

## 7. 코드 스타일 가이드라인

### 📘 TypeScript 스타일
```typescript
// ✅ 좋은 예시 - Supabase API 호출
interface HomeworkData {
  id: string;
  title: string;
  description: string;
  due_date: string;
  status: 'pending' | 'submitted' | 'graded';
}

const fetchHomework = async (id: string): Promise<HomeworkData | null> => {
  try {
    const { data, error } = await supabase
      .from('homework')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to fetch homework:', error);
    return null;
  }
};
```

### 🎨 React Native 컴포넌트 스타일
```typescript
// ✅ 좋은 예시 - 학생 앱 컴포넌트
const HomeworkCard: React.FC<HomeworkCardProps> = ({ 
  id, 
  title, 
  dueDate, 
  status,
  onPress 
}) => {
  const handlePress = useCallback(() => {
    onPress(id);
  }, [id, onPress]);

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.dueDate}>{formatDate(dueDate)}</Text>
      <View style={[styles.status, styles[status]]}>
        <Text style={styles.statusText}>{getStatusText(status)}</Text>
      </View>
    </TouchableOpacity>
  );
};
```

### 🌐 Next.js 컴포넌트 스타일 (현재 운영 중)
```typescript
// ✅ Server Component - 강사용 대시보드
export default async function DashboardPage() {
  const { data: homeworks } = await supabase
    .from('homework')
    .select('*')
    .order('created_at', { ascending: false });
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">숙제 관리</h1>
      <HomeworkList homeworks={homeworks || []} />
    </div>
  );
}

// ✅ Client Component - 실시간 메시징
'use client';

export default function MessagingComponent() {
  const [messages, setMessages] = useState<Message[]>([]);
  
  useEffect(() => {
    // Supabase 실시간 구독
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  return (
    <div className="messaging-container">
      {/* 메시징 UI */}
    </div>
  );
}
```

---

## 8. 저장소 에티켓

### 🔄 Git 워크플로우 (Render 자동 배포 연동)
```bash
# 1. 기능 개발 전 최신 코드 동기화
git pull origin main

# 2. 작업 후 의미있는 단위로 커밋
git add .
git commit -m "feat(planner): 학생 진도 분석 차트 추가

- Recharts를 사용한 진도 시각화
- 실시간 데이터 업데이트 기능
- 반응형 차트 디자인"

# 3. 푸시 (자동으로 Render에 배포됨)
git push origin main
# → 자동으로 Render에서 빌드 & 배포 시작

# 4. 배포 상태 확인
# Render 대시보드에서 배포 로그 확인
# https://nvoim-planner-pro.onrender.com에서 결과 확인
```

### 📝 커밋 메시지 규칙 (현재 프로젝트 기준)
```
타입(스코프): 제목

본문 (선택사항)
```

**타입 종류**:
- `feat`: 새로운 기능 추가
- `fix`: 버그 수정  
- `refactor`: 코드 리팩토링 (오프라인 모드 제거 등)
- `style`: UI 스타일 변경
- `docs`: 문서 변경
- `chore`: 빌드 설정, 의존성 업데이트

**스코프**:
- `planner`: 강사용 웹앱 관련
- `student`: 학생용 모바일앱 관련  
- `supabase`: 백엔드/데이터베이스 관련
- `deploy`: 배포 관련

**실제 사용 예시**:
```bash
# 최근 커밋 예시들
feat(student): 오프라인 모드 완전 제거
fix(planner): Render 배포 무한루프 문제 해결
refactor(student): API 호출에서 오프라인 폴백 로직 제거
docs: Claude Code 개발 가이드 추가
```

---

## 📞 현재 운영 상태 및 문제 해결

### 🚀 Production 상태 (Render)
- **Status**: ✅ 정상 운영 중
- **URL**: https://nvoim-planner-pro.onrender.com
- **Last Deploy**: 성공 (v2.7.1)
- **Build Time**: ~25초
- **Health Check**: `/health` 엔드포인트 사용

### 🐛 자주 발생하는 문제들
1. **Supabase 연결 오류**: 
   - 환경변수 확인: `.env` (학생앱), `.env.local` (웹앱)
   - API 키 유효성 확인

2. **Render 배포 실패**:
   - Root Directory: `apps/planner-web`
   - Build Command: `npm install && npx next build`
   - Start Command: `npm start`

3. **학생앱 Expo 오류**: 
   - `npx expo doctor`로 환경 진단
   - Metro bundler 재시작

4. **TypeScript 오류**: 
   - `npm run type-check`로 타입 검사
   - Supabase 타입 정의 확인

### 🔗 유용한 링크
- **Production 사이트**: https://nvoim-planner-pro.onrender.com
- **Supabase 대시보드**: https://supabase.com/dashboard/project/ybcjkdcdruquqrdahtga
- **Render 대시보드**: https://dashboard.render.com
- **GitHub 저장소**: https://github.com/twins1850/nvoim-planner-pro (추정)

---

## 🎯 현재 개발 상태 요약

### ✅ 완료된 기능 (20개 주요 작업)
1. ✅ Supabase 프로젝트 설정 및 데이터베이스 스키마
2. ✅ Next.js 강사용 웹앱 완전 구현 및 Render 배포
3. ✅ React Native 학생용 앱 핵심 기능 구현
4. ✅ Supabase 인증 시스템 완전 구현
5. ✅ 실시간 메시징 및 알림 시스템
6. ✅ 파일 업로드 및 스토리지 시스템
7. ✅ 오프라인 모드 완전 제거 (최근 완료)

### 🎯 다음 단계
1. **학생 모바일앱 배포** (Expo 빌드 및 앱스토어 등록)
2. **Supabase Pro 플랜 업그레이드** (사용량 증가 시)
3. **성능 최적화 및 모니터링 설정**

---

**🎯 이 문서는 실제 개발 현황을 반영하여 지속적으로 업데이트됩니다.**

## 📚 Development History & Documentation

### 📝 Development Status Reports
모든 개발 현황과 주요 작업 내용은 `development-status/` 폴더에 날짜별로 문서화됩니다.

**최신 개발 현황**:
- `development-status/2025-09-04_Preview배포설정_및_버그수정.md` - Preview 배포 시스템 구축 및 핵심 버그 수정

### 🎯 Preview 배포 시스템 (2025-09-04 추가)
**Render PR Previews**: 자동화된 브랜치별 테스트 환경
- **설정**: Automatic 모드로 모든 PR에 Preview 생성
- **워크플로우**: `feature 브랜치 → PR 생성 → 자동 Preview 배포 → 테스트 → main 머지`
- **장점**: 실제 서버 환경에서 테스트, 로컬 개발 혼란 방지

**Preview URL 예시**: `https://nvoim-planner-pro-pr-1.onrender.com`

### 🐛 주요 해결된 이슈들 (2025-09-04)
1. **Settings 페이지 모듈 인식 오류** - import 경로 수정으로 해결
2. **MaterialsContent.tsx MoreVertical import 오류** - lucide-react import 추가
3. **Next.js TypeScript 설정 오류** - .tsx 확장자 제거로 해결  
4. **forgot-password 페이지 404 오류** - 완전한 비밀번호 재설정 페이지 구현

### 🚀 현재 배포 환경
- **Production**: https://nvoim-planner-pro.onrender.com (정상 운영)
- **Preview**: 브랜치별 자동 생성 (PR 생성 시)
- **Development**: 로컬 환경 (필요시)

---

*마지막 업데이트: 2025년 9월 4일 - Preview 배포 시스템 구축 및 버그 수정 완료*