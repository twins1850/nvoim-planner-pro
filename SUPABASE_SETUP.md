# 수파베이스 프로젝트 생성 및 설정 가이드

## 1️⃣ Supabase 프로젝트 생성

### 단계별 가이드:

1. **Supabase 대시보드 접속**
   - https://supabase.com 방문
   - GitHub 계정으로 로그인

2. **새 프로젝트 생성**
   - "New Project" 버튼 클릭
   - Organization 선택 (개인 계정 또는 팀)
   - 프로젝트 정보 입력:
     ```
     Project Name: nvoim-planner-pro
     Database Password: [강력한 비밀번호 생성]
     Region: Northeast Asia (ap-northeast-1)
     Pricing Plan: Free tier (시작용)
     ```

3. **프로젝트 생성 대기**
   - 약 2-3분 소요
   - 생성 완료 후 대시보드 접속

## 2️⃣ 데이터베이스 스키마 적용

### SQL 스키마 실행:

1. **SQL Editor 접속**
   - 왼쪽 메뉴에서 "SQL Editor" 클릭
   - "New query" 선택

2. **스키마 파일 적용**
   - `/supabase/schema.sql` 파일 내용 전체 복사
   - SQL Editor에 붙여넣기
   - "Run" 버튼 클릭하여 실행

3. **확인사항**
   - Table Editor에서 생성된 테이블들 확인
   - Authentication > Policies에서 RLS 정책 확인

## 3️⃣ API 키 설정

### 환경 변수 복사:

1. **API 설정 페이지 접속**
   - Settings > API 클릭

2. **키 정보 복사**
   ```
   Project URL: https://[your-project-id].supabase.co
   anon public key: eyJ... (긴 문자열)
   ```

3. **환경 변수 파일 설정**
   
   **플래너 웹앱** (`apps/planner-web/.env.local`):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

   **학생 모바일앱** (`apps/student-mobile/.env`):
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   EXPO_PUBLIC_APP_NAME=NVOIM Student
   ```

## 4️⃣ Storage 버킷 생성

### 파일 저장소 설정:

1. **Storage 메뉴 접속**
   - 왼쪽 메뉴에서 "Storage" 클릭

2. **버킷 생성**
   ```
   bucket 1: homework-submissions
   - Public: false (비공개)
   - File size limit: 50MB
   - Allowed file types: audio/*, video/*, image/*, application/pdf

   bucket 2: study-materials  
   - Public: false (비공개)
   - File size limit: 100MB
   - Allowed file types: */*

   bucket 3: avatars
   - Public: true (공개)
   - File size limit: 5MB
   - Allowed file types: image/*
   ```

## 5️⃣ 인증 설정

### Email Auth 설정:

1. **Authentication 설정**
   - Authentication > Settings 클릭
   - "Enable email confirmations" 활성화
   - Site URL 설정: http://localhost:3000

2. **이메일 템플릿 (선택사항)**
   - Auth Templates에서 한국어 템플릿 설정

## 6️⃣ 테스트 및 확인

### 연결 테스트:

1. **플래너 웹앱 실행**
   ```bash
   cd apps/planner-web
   npm run dev
   ```
   - http://localhost:3000 접속
   - 회원가입 테스트

2. **학생 모바일앱 실행**
   ```bash
   cd apps/student-mobile
   npx expo start
   ```
   - QR 코드 또는 시뮬레이터로 테스트

3. **데이터베이스 확인**
   - Table Editor에서 profiles 테이블에 데이터 생성 확인

## 🚨 주의사항

### 보안 설정:
- API 키는 절대 공개 저장소에 커밋하지 마세요
- `.env*` 파일들이 `.gitignore`에 포함되어 있는지 확인
- 프로덕션에서는 RLS 정책을 반드시 확인

### 비용 관리:
- Free tier 제한사항 확인 (500MB DB, 1GB 대역폭/월)
- 사용량 모니터링 설정

## 🔗 유용한 링크

- [Supabase 대시보드](https://supabase.com/dashboard)
- [Supabase 문서](https://supabase.com/docs)
- [Next.js Supabase 가이드](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [React Native Supabase 가이드](https://supabase.com/docs/guides/getting-started/quickstarts/react-native)

---

**다음 단계**: 수파베이스 프로젝트 생성 후 앱 실행하여 테스트 계정 생성