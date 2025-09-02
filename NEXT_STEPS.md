# 🚀 다음 단계 실행 가이드

## 1️⃣ Supabase 프로젝트 생성 (지금 실행)

### 단계별 진행:

1. **새 프로젝트 생성**
   - https://supabase.com/dashboard 에서 "New Project" 클릭
   - 프로젝트 정보 입력:
     ```
     Name: nvoim-planner-pro
     Database Password: [안전한 비밀번호 생성]
     Region: Northeast Asia (ap-northeast-1) 선택
     ```

2. **프로젝트 생성 대기**
   - 약 2-3분 소요
   - 생성이 완료되면 대시보드가 열립니다

## 2️⃣ 데이터베이스 스키마 적용

### SQL 실행:

1. **SQL Editor 열기**
   - 왼쪽 메뉴에서 "SQL Editor" 클릭
   - "New query" 버튼 클릭

2. **스키마 적용**
   - 아래 파일 내용을 복사해서 붙여넣기:
   ```
   /supabase/schema.sql 전체 내용
   ```
   - "RUN" 버튼 클릭하여 실행

3. **확인**
   - "Table Editor"에서 생성된 테이블들 확인
   - 15개 테이블이 생성되었는지 확인

## 3️⃣ API 키 설정

### 환경 변수 복사:

1. **API 설정 페이지**
   - Settings > API 메뉴 클릭

2. **키 복사**
   - Project URL 복사
   - anon public key 복사

3. **환경 변수 설정**
   
   **플래너 웹앱** - 파일 생성: `apps/planner-web/.env.local`
   ```env
   NEXT_PUBLIC_SUPABASE_URL=여기에_Project_URL_붙여넣기
   NEXT_PUBLIC_SUPABASE_ANON_KEY=여기에_anon_key_붙여넣기
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

   **학생 모바일앱** - 파일 생성: `apps/student-mobile/.env`
   ```env
   EXPO_PUBLIC_SUPABASE_URL=여기에_Project_URL_붙여넣기
   EXPO_PUBLIC_SUPABASE_ANON_KEY=여기에_anon_key_붙여넣기
   EXPO_PUBLIC_APP_NAME=NVOIM Student
   ```

## 4️⃣ Storage 버킷 생성

### 파일 저장소 설정:

1. **Storage 메뉴**
   - 왼쪽 메뉴에서 "Storage" 클릭

2. **버킷 생성** (3개 생성)
   ```
   1) homework-submissions
      - Public: false
      - File size limit: 50MB
   
   2) study-materials
      - Public: false  
      - File size limit: 100MB
   
   3) avatars
      - Public: true
      - File size limit: 5MB
   ```

## 5️⃣ 앱 실행 테스트

### 실행 명령어:

```bash
# 1. 루트 디렉토리에서
cd /Users/twins/Downloads/nvoim-planer-pro

# 2. 플래너 웹앱 실행
cd apps/planner-web
npm run dev
# http://localhost:3000 접속

# 3. 새 터미널에서 학생 모바일앱 실행  
cd apps/student-mobile
npx expo start
# QR 코드 스캔 또는 시뮬레이터 사용
```

## 6️⃣ 첫 계정 생성

### 테스트 계정:

1. **플래너 계정 생성**
   - http://localhost:3000/auth/signup 접속
   - 정보 입력:
     ```
     이름: 김영어 (또는 원하는 이름)
     이메일: teacher@nvoim.com
     비밀번호: nvoim123!
     ```

2. **이메일 확인**
   - 가입 시 사용한 이메일에서 확인 메일 클릭
   - 계정 활성화

3. **로그인 테스트**
   - http://localhost:3000/auth/login 에서 로그인
   - 대시보드 접속 확인

## ✅ 현재 완성된 기능들

### 플래너 웹앱 (Next.js)
- ✅ 회원가입/로그인
- ✅ 대시보드 (통계, 오늘의 일정)
- ✅ 학생 관리 페이지
- ✅ 숙제 관리 페이지
- ✅ 반응형 레이아웃
- ✅ 보안 미들웨어

### 학생 모바일앱 (React Native)
- ✅ 회원가입/로그인
- ✅ 홈 화면 (오늘의 숙제, 최근 피드백)
- ✅ 숙제 목록 및 상세보기
- ✅ 피드백 확인
- ✅ 프로필 관리
- ✅ 네비게이션 시스템

## 🔄 다음에 추가할 기능

### 우선순위 높음:
1. **실시간 알림** - 새 숙제, 피드백 알림
2. **파일 업로드** - 숙제 제출, 자료 업로드
3. **채팅 시스템** - 선생님-학생 소통

### 우선순위 보통:
1. **숙제 생성 폼** - 플래너 앱에서 숙제 생성
2. **진도 분석** - 학습 진도 차트
3. **출석 체크** - 수업 출석 관리

---

**🎯 현재 상황**: 핵심 기능이 모두 구현되어 Supabase 연결만 하면 바로 사용 가능합니다!