# 📋 앤보임 영어회화 관리 시스템 개발 계획서

## 📌 프로젝트 개요

### 프로젝트명
앤보임 영어회화 자동화 관리 시스템 (NVOIM English Conversation Management System)

### 목표
플래너(강사)와 학생 간의 영어 회화 학습 관리를 자동화하여 업무 효율성을 극대화하고 학습 품질을 향상시키는 통합 모바일 플랫폼 구축

### 현재 상태
- **백엔드**: 70% 구현 완료 (핵심 API 구현됨)
- **플래너 앱**: 40% 구현 (기본 구조만 구현)
- **학생 앱**: 20% 구현 (템플릿 수준)
- **인프라**: 설계 완료, 구현 대기

### 주요 이슈
1. 학생 앱 중복 구현 (2개 존재)
2. React Native 버전 불일치
3. 보안 취약점 존재
4. 화면 구현 미완성

---

## 🎯 개발 목표 및 범위

### 1단계: 안정화 (1주차)
- 중복 코드 정리 및 통합
- 보안 취약점 해결
- 버전 통일 및 의존성 정리

### 2단계: 기능 완성 (2-3주차)
- 학생 앱 화면 구현
- 플래너 앱 기능 완성
- 오프라인 모드 최적화

### 3단계: 품질 향상 (4-5주차)
- 테스트 코드 작성
- 성능 최적화
- UI/UX 개선

### 4단계: 배포 준비 (6주차)
- CI/CD 파이프라인 구축
- 프로덕션 환경 설정
- 앱 스토어 배포 준비

---

## 🛠️ 기술 스택 표준화

### 통일된 버전 관리
```json
{
  "react-native": "0.79.3",
  "react": "18.3.1",
  "typescript": "5.3.3",
  "node": ">=18.0.0",
  "expo-sdk": "~51.0.0"
}
```

### 백엔드 기술 스택
- **런타임**: Node.js 18 LTS
- **프레임워크**: Express.js 4.18.x
- **데이터베이스**: MongoDB 6.x + Mongoose 7.x
- **캐싱**: Redis 7.x
- **메시지 큐**: Bull Queue
- **클라우드**: AWS SDK v3

### 모바일 앱 기술 스택
- **프레임워크**: React Native 0.79.3
- **상태관리**: Redux Toolkit / Zustand
- **네비게이션**: React Navigation v6
- **UI 라이브러리**: React Native Elements
- **폼 관리**: React Hook Form
- **API 통신**: Axios + React Query

---

## 📅 개발 일정

## Phase 1: 즉시 해결 (Day 1-2)

### Day 1: 프로젝트 정리 및 보안 강화

#### 오전 (09:00-12:00)
**작업 1: 중복 앱 통합**
```bash
# 1. 백업 생성
cp -r apps/student apps/student_backup
cp -r apps/StudentApp apps/StudentApp_backup

# 2. 중복 제거
rm -rf apps/student/android  # 중복된 android 폴더
rm -rf apps/student  # 구버전 앱 제거

# 3. StudentApp을 student로 이름 변경
mv apps/StudentApp apps/student

# 4. package.json 경로 수정
```

**작업 2: 디렉토리 구조 정리**
```
apps/
├── planner/     # 플래너(강사)용 앱
└── student/     # 학생용 앱 (통합됨)
```

#### 오후 (13:00-18:00)
**작업 3: 보안 취약점 수정**
```bash
# 1. 보안 감사 실행
cd backend && npm audit fix
cd ../apps/planner && npm audit fix
cd ../student && npm audit fix

# 2. 환경 변수 보안 강화
# backend/.env.example 수정
```

**작업 4: Git 정리**
```bash
# 1. .gitignore 업데이트
# 2. 민감한 정보 제거
# 3. 커밋
git add .
git commit -m "fix: 프로젝트 구조 정리 및 보안 강화"
```

### Day 2: 의존성 정리 및 버전 통일

#### 오전 (09:00-12:00)
**작업 1: package.json 통일**
```json
// 루트 package.json
{
  "scripts": {
    "install:all": "npm install && npm run install:backend && npm run install:apps",
    "install:backend": "cd backend && npm install",
    "install:apps": "cd apps/planner && npm install && cd ../student && npm install",
    "dev": "concurrently \"npm run backend:dev\" \"npm run planner:dev\" \"npm run student:dev\"",
    "test": "npm run test:backend && npm run test:apps",
    "build": "npm run build:backend && npm run build:apps"
  }
}
```

#### 오후 (13:00-18:00)
**작업 2: TypeScript 설정 통일**
```json
// shared/tsconfig.base.json (공통 설정)
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true
  }
}
```

---

## Phase 2: 단기 개선 (Week 1)

### Day 3-4: React Native 버전 통일

#### 작업 계획
1. **버전 다운그레이드 (플래너 앱)**
   ```bash
   cd apps/planner
   npx react-native upgrade 0.79.3
   ```

2. **버전 업그레이드 (학생 앱)**
   ```bash
   cd apps/student
   npx react-native upgrade 0.79.3
   ```

3. **의존성 호환성 검증**
   - React Navigation 호환성 확인
   - Expo 모듈 호환성 확인
   - Native 모듈 재빌드

### Day 5-7: 학생 앱 핵심 화면 구현

#### 구현 화면 목록
1. **인증 플로우**
   - 로그인 화면
   - 회원가입 화면
   - 비밀번호 찾기

2. **메인 기능**
   - 홈 대시보드
   - 숙제 목록
   - 숙제 상세/제출
   - 피드백 확인

3. **부가 기능**
   - 프로필 관리
   - 알림 설정
   - 오프라인 모드

#### 화면별 구현 상세

**1. 로그인 화면 (LoginScreen.tsx)**
```typescript
// 주요 기능
- 이메일/비밀번호 입력
- 자동 로그인
- 소셜 로그인 (선택)
- 오프라인 모드 전환
```

**2. 홈 대시보드 (HomeScreen.tsx)**
```typescript
// 주요 위젯
- 오늘의 숙제
- 최근 피드백
- 학습 진도
- 공지사항
```

**3. 숙제 제출 (HomeworkSubmissionScreen.tsx)**
```typescript
// 주요 기능
- 음성 녹음
- 동영상 업로드
- 텍스트 입력
- 오프라인 저장
```

---

## Phase 3: 중기 개선 (Week 2-4)

### Week 2: AWS SDK v3 마이그레이션

#### 마이그레이션 계획
1. **패키지 교체**
   ```bash
   npm uninstall aws-sdk
   npm install @aws-sdk/client-s3 @aws-sdk/client-ses @aws-sdk/client-cloudwatch
   ```

2. **코드 리팩토링**
   ```typescript
   // 기존 (v2)
   import AWS from 'aws-sdk';
   const s3 = new AWS.S3();
   
   // 신규 (v3)
   import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
   const s3Client = new S3Client({ region: 'ap-northeast-2' });
   ```

3. **테스트 및 검증**

### Week 3: 테스트 환경 구축

#### 테스트 전략
1. **단위 테스트**
   - Jest + React Testing Library
   - 목표 커버리지: 80%

2. **통합 테스트**
   - Supertest (백엔드)
   - Detox (모바일)

3. **E2E 테스트**
   - 주요 사용자 시나리오
   - 크리티컬 패스 검증

### Week 4: 성능 최적화

#### 최적화 영역
1. **백엔드**
   - 데이터베이스 쿼리 최적화
   - Redis 캐싱 전략
   - API 응답 시간 개선

2. **모바일 앱**
   - 번들 크기 최적화
   - 이미지 최적화
   - 메모리 관리

---

## Phase 4: 배포 준비 (Week 5-6)

### Week 5: CI/CD 파이프라인 구축

#### GitHub Actions 워크플로우
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm run install:all
      - name: Run tests
        run: npm test
      - name: Build
        run: npm run build

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to AWS
        run: |
          echo "Deploying to AWS..."
```

### Week 6: 프로덕션 배포

#### 배포 체크리스트
- [ ] 환경 변수 설정
- [ ] SSL 인증서 구성
- [ ] 도메인 설정
- [ ] 모니터링 설정
- [ ] 백업 정책 수립
- [ ] 롤백 계획 수립

---

## 📊 성공 지표 (KPI)

### 기술적 지표
- **API 응답 시간**: < 200ms (95 percentile)
- **앱 크래시율**: < 1%
- **테스트 커버리지**: > 80%
- **빌드 시간**: < 10분

### 비즈니스 지표
- **사용자 만족도**: > 4.5/5
- **일일 활성 사용자**: > 80%
- **숙제 제출률**: > 90%
- **피드백 응답 시간**: < 24시간

---

## 🚨 리스크 관리

### 식별된 리스크
1. **React Native 버전 통일 실패**
   - 완화: 단계적 마이그레이션
   - 대안: Expo 완전 마이그레이션

2. **AWS 비용 초과**
   - 완화: 비용 알림 설정
   - 대안: 사용량 제한 구현

3. **개발 일정 지연**
   - 완화: 우선순위 재조정
   - 대안: MVP 범위 축소

---

## 📝 체크리스트

### 즉시 시작 가능한 작업
- [x] 개발 계획서 작성
- [ ] 중복 앱 통합
- [ ] 보안 취약점 수정
- [ ] package.json 정리

### 이번 주 완료 목표
- [ ] React Native 버전 통일
- [ ] TypeScript 설정 통일
- [ ] 학생 앱 로그인 화면 구현
- [ ] 학생 앱 홈 화면 구현

### 이번 달 완료 목표
- [ ] 학생 앱 전체 화면 구현
- [ ] 플래너 앱 기능 완성
- [ ] 테스트 코드 작성 (80% 커버리지)
- [ ] CI/CD 파이프라인 구축

---

## 👥 팀 구성 및 역할

### 개발팀
- **풀스택 개발자**: 전체 시스템 개발 및 통합
- **백엔드 개발자**: API 및 서버 로직
- **모바일 개발자**: React Native 앱 개발
- **DevOps**: 인프라 및 배포 관리

### 협업 도구
- **코드 저장소**: GitHub
- **프로젝트 관리**: Jira/Notion
- **커뮤니케이션**: Slack
- **문서화**: Confluence/Notion

---

## 📞 연락처 및 리소스

### 기술 문서
- [React Native 공식 문서](https://reactnative.dev)
- [AWS SDK v3 마이그레이션 가이드](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrating-to-v3.html)
- [MongoDB 최적화 가이드](https://docs.mongodb.com/manual/administration/optimization/)

### 지원 채널
- 기술 지원: tech-support@nvoim.com
- 프로젝트 관리: pm@nvoim.com
- 긴급 연락: +82-10-XXXX-XXXX

---

## 🎯 다음 단계

### 오늘 시작할 작업 (Day 1)
1. **09:00**: 프로젝트 백업
2. **10:00**: 중복 앱 통합 시작
3. **14:00**: 보안 취약점 수정
4. **16:00**: Git 정리 및 커밋
5. **17:00**: 일일 진행 상황 보고

### 내일 예정 작업 (Day 2)
1. package.json 통일
2. TypeScript 설정 표준화
3. 개발 환경 테스트
4. 문서 업데이트

---

*마지막 업데이트: 2024년 12월 20일*
*작성자: 앤보임 개발팀*