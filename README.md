# 🎓 NVOIM English Planner Pro

> **앤보임 영어회화 관리 시스템 - Supabase 기반 클라우드 솔루션**

[![Deployment Status](https://img.shields.io/badge/Deployment-Live-brightgreen)](https://nvoim-planner-pro.onrender.com)
[![Backend](https://img.shields.io/badge/Backend-Supabase-00C896)](https://supabase.com)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js-black)](https://nextjs.org)
[![Mobile](https://img.shields.io/badge/Mobile-React%20Native-61DAFB)](https://reactnative.dev)

## 🌐 **라이브 서비스**

- **🌍 플래너 웹앱 (강사용)**: https://nvoim-planner-pro.onrender.com
- **📱 학생 모바일앱**: 로컬 개발 환경에서 실행 가능

## 🏗️ **시스템 아키텍처**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   강사용 웹앱    │    │   학생 모바일앱  │    │   Supabase      │
│   (Next.js)     │◄──►│ (React Native)  │◄──►│   클라우드      │
│   Render 배포   │    │   로컬 개발     │    │   백엔드        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **핵심 기술 스택**
- **🖥️ 플래너 웹앱**: Next.js 15 + TypeScript + Tailwind CSS
- **📱 학생 모바일앱**: React Native + Expo + TypeScript  
- **☁️ 백엔드**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **🚀 배포**: Render (웹앱) + Supabase (백엔드)
- 📚 개인화된 숙제 자동 생성 및 스케줄링
- 📊 학습 진도 추적 및 분석 리포트

## 프로젝트 구조

```
english-conversation-management/
├── apps/                          # React Native 모바일 앱들
│   ├── planner/                   # 플래너용 앱
│   │   ├── src/
│   │   │   └── App.tsx           # 플래너 앱 메인
│   │   └── package.json
│   └── student/                   # 학생용 앱
│       ├── src/
│       │   └── App.tsx           # 학생 앱 메인
│       └── package.json
├── backend/                       # Node.js + Express 백엔드
│   ├── src/
│   │   ├── config/               # 설정 파일들
│   │   │   ├── database.ts       # MongoDB 연결
│   │   │   ├── redis.ts          # Redis 캐시 설정
│   │   │   └── aws.ts            # AWS S3 설정
│   │   ├── models/               # 데이터베이스 모델
│   │   │   ├── User.ts           # 사용자 모델
│   │   │   └── Lesson.ts         # 수업 모델
│   │   ├── middleware/           # Express 미들웨어
│   │   │   ├── errorHandler.ts   # 에러 처리
│   │   │   └── notFoundHandler.ts
│   │   └── server.ts             # 서버 메인 파일
│   ├── .env.example              # 환경 변수 예시
│   ├── package.json
│   └── tsconfig.json
├── shared/                        # 공통 타입 정의
│   └── types.ts                  # TypeScript 타입들
├── infrastructure/                # 인프라 설정
│   ├── aws/                      # AWS 인프라 설정
│   │   ├── ec2-autoscaling.tf    # EC2 및 오토스케일링
│   │   ├── s3-cloudfront.tf      # S3 및 CloudFront CDN
│   │   └── cloudwatch-monitoring.tf # 모니터링 및 알림
│   ├── mongodb/                  # MongoDB Atlas 설정
│   │   └── atlas-cluster.tf      # 프로덕션 클러스터 및 백업
│   ├── redis/                    # Redis 설정
│   │   └── elasticache.tf        # ElastiCache 고가용성 클러스터
│   └── ci-cd/                    # CI/CD 파이프라인
│       └── github-actions.yml    # GitHub Actions 워크플로우
├── .kiro/specs/                  # 프로젝트 스펙 문서
│   └── english-conversation-management/
│       ├── requirements.md       # 요구사항 문서
│       ├── design.md            # 설계 문서
│       └── tasks.md             # 구현 작업 목록
├── package.json                  # 루트 패키지 설정
└── README.md                     # 이 파일
```

## 기술 스택

### 프론트엔드 (모바일)
- **React Native 0.80.1** - 크로스 플랫폼 모바일 앱
- **TypeScript** - 타입 안전성
- **React Navigation** - 앱 내 네비게이션
- **Axios** - HTTP 클라이언트

### 백엔드
- **Node.js + Express.js** - 웹 서버
- **TypeScript** - 타입 안전성
- **MongoDB + Mongoose** - 데이터베이스
- **Redis** - 캐싱 및 세션 관리
- **AWS S3** - 파일 저장소
- **Bull Queue** - 비동기 작업 처리

### AI 서비스
- **Azure Speech Service** - 음성 인식 및 발음 평가
- **OpenAI GPT-4o** - 텍스트 분석 및 피드백 생성
- **FFmpeg** - 동영상/음성 변환

### 인프라
- **AWS EC2** - 오토스케일링 그룹으로 서버 호스팅
- **AWS Application Load Balancer** - 트래픽 분산
- **AWS S3 + CloudFront** - 파일 저장 및 CDN 배포
- **MongoDB Atlas** - 고가용성 클라우드 데이터베이스
- **AWS ElastiCache for Redis** - 고가용성 캐시 클러스터
- **AWS CloudWatch** - 모니터링 및 알림
- **GitHub Actions** - CI/CD 파이프라인
- **Firebase** - 푸시 알림

## 설치 및 실행

### 1. 저장소 클론 및 의존성 설치

```bash
git clone <repository-url>
cd english-conversation-management
npm run install:all
```

### 2. 환경 변수 설정

```bash
# 백엔드 환경 변수 설정
cp backend/.env.example backend/.env
# .env 파일을 열어서 실제 값들로 수정
```

### 3. 개발 서버 실행

```bash
# 모든 서비스 동시 실행
npm run dev

# 또는 개별 실행
npm run backend:dev    # 백엔드만
npm run planner:start  # 플래너 앱만
npm run student:start  # 학생 앱만
```

### 4. 모바일 앱 실행

```bash
# iOS 시뮬레이터
npm run planner:ios
npm run student:ios

# Android 에뮬레이터
npm run planner:android
npm run student:android
```

## API 엔드포인트

### 헬스 체크
- `GET /health` - 서버 상태 확인

### 인증
- `POST /api/auth/login` - 로그인
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/refresh` - 토큰 갱신

### 파일 관리
- `POST /api/files/upload` - 파일 업로드
- `GET /api/files/:id` - 파일 다운로드
- `DELETE /api/files/:id` - 파일 삭제

### 수업 관리
- `GET /api/lessons` - 수업 목록 조회
- `POST /api/lessons` - 수업 생성
- `GET /api/lessons/:id` - 수업 상세 조회
- `PUT /api/lessons/:id/analyze` - 수업 분석 시작

### 숙제 관리
- `GET /api/homework` - 숙제 목록 조회
- `POST /api/homework` - 숙제 생성
- `POST /api/homework/:id/submit` - 숙제 제출
- `GET /api/homework/:id/submissions` - 제출 목록 조회

## 개발 가이드

### 코드 스타일
- TypeScript 사용 필수
- ESLint + Prettier 설정 준수
- 함수형 컴포넌트 및 Hooks 사용

### 커밋 메시지 규칙
```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 추가/수정
chore: 빌드 설정 등 기타 작업
```

### 브랜치 전략
- `main`: 프로덕션 브랜치
- `develop`: 개발 브랜치
- `feature/*`: 기능 개발 브랜치
- `hotfix/*`: 긴급 수정 브랜치

## 배포

### 개발 환경 배포
```bash
npm run backend:build
npm run backend:start
```

### 모바일 앱 개발 배포
```bash
# iOS
cd apps/planner && npx react-native run-ios --configuration Release
cd apps/student && npx react-native run-ios --configuration Release

# Android
cd apps/planner && npx react-native run-android --variant=release
cd apps/student && npx react-native run-android --variant=release
```

### 프로덕션 환경 배포

프로덕션 환경은 Terraform을 사용하여 AWS 인프라에 자동 배포됩니다:

```bash
# 인프라 배포
cd infrastructure
terraform init
terraform apply

# CI/CD 파이프라인을 통한 애플리케이션 배포
git push origin main  # GitHub Actions가 자동으로 배포 진행
```

자세한 프로덕션 배포 가이드는 [infrastructure/README.md](infrastructure/README.md) 파일을 참조하세요.

## 프로덕션 인프라 구성

### 인프라 아키텍처

```
                                  ┌─────────────────┐
                                  │   CloudWatch    │
                                  │  (모니터링/알림)  │
                                  └────────┬────────┘
                                           │
                                           ▼
┌─────────────┐    ┌─────────────┐    ┌────────────┐    ┌─────────────────┐
│   사용자     │───▶│  CloudFront  │───▶│    ALB     │───▶│  EC2 Auto-scaling│
│ (모바일 앱)  │    │    (CDN)     │    │(로드밸런서) │    │      Group      │
└─────────────┘    └──────┬──────┘    └──────┬─────┘    └────────┬────────┘
                          │                  │                    │
                          ▼                  │                    ▼
                    ┌──────────┐             │             ┌─────────────┐
                    │    S3    │             │             │   Redis     │
                    │(파일저장소)│             │             │(ElastiCache)│
                    └──────────┘             │             └─────────────┘
                                             │
                                             ▼
                                      ┌─────────────┐
                                      │MongoDB Atlas│
                                      │(데이터베이스) │
                                      └─────────────┘
```

### 주요 인프라 구성 요소

1. **AWS EC2 오토스케일링**
   - 트래픽에 따라 자동으로 서버 확장/축소
   - 고가용성을 위한 다중 가용 영역 배포
   - 로드 밸런서를 통한 트래픽 분산

2. **AWS S3 + CloudFront CDN**
   - 오디오 파일 저장 및 전역 배포
   - 자동 파일 수명 주기 관리로 비용 최적화
   - HTTPS를 통한 안전한 콘텐츠 전송

3. **MongoDB Atlas**
   - 고가용성 데이터베이스 클러스터
   - 자동 백업 정책 (일간, 주간, 월간)
   - 데이터 암호화 및 네트워크 보안

4. **AWS ElastiCache for Redis**
   - 고가용성 Redis 클러스터
   - 자동 장애 조치 구성
   - 전송 및 저장 데이터 암호화

5. **AWS CloudWatch**
   - 시스템 모니터링 및 알림
   - 로그 집계 및 분석
   - 사용자 정의 대시보드

6. **CI/CD 파이프라인**
   - GitHub Actions를 통한 자동 배포
   - 테스트, 빌드, 배포 단계
   - 배포 후 상태 확인

## 라이선스

MIT License

## 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 연락처

프로젝트 관련 문의: [이메일 주소]

---

**앤보임 영어회화 자동화 관리 시스템** - AI 기반 효율적인 영어 학습 관리 솔루션