# 앤보임 플래너 프로 - 설정 가이드

## 📋 사전 요구사항

- Node.js 18.0.0 이상
- npm 또는 yarn
- Supabase 계정
- Git

## 🚀 빠른 시작 가이드

### 1. Supabase 프로젝트 설정

#### 1.1 Supabase 프로젝트 생성
1. [Supabase](https://supabase.com)에 로그인
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - Name: `nvoim-planner-pro`
   - Database Password: 강력한 비밀번호 설정
   - Region: 가장 가까운 지역 선택 (예: Northeast Asia)

#### 1.2 데이터베이스 스키마 적용
1. Supabase 대시보드에서 SQL Editor 열기
2. `/supabase/schema.sql` 파일 내용 복사
3. SQL Editor에 붙여넣기 후 실행

#### 1.3 환경 변수 설정
1. Supabase 대시보드 > Settings > API
2. `URL`과 `anon public` 키 복사

### 2. 플래너 웹앱 설정

```bash
# 1. 프로젝트 디렉토리로 이동
cd apps/planner-web

# 2. 환경 변수 파일 생성
cp .env.local.example .env.local

# 3. .env.local 파일 편집
# NEXT_PUBLIC_SUPABASE_URL=여기에_supabase_url_입력
# NEXT_PUBLIC_SUPABASE_ANON_KEY=여기에_anon_key_입력

# 4. 의존성 설치 (이미 설치됨)
npm install

# 5. 개발 서버 실행
npm run dev
```

웹 브라우저에서 http://localhost:3000 접속

### 3. 학생 모바일 앱 설정

```bash
# 1. 프로젝트 디렉토리로 이동
cd apps/student-mobile

# 2. 환경 변수 파일 생성
cp .env.example .env

# 3. .env 파일 편집
# EXPO_PUBLIC_SUPABASE_URL=여기에_supabase_url_입력
# EXPO_PUBLIC_SUPABASE_ANON_KEY=여기에_anon_key_입력

# 4. 의존성 설치 (이미 설치됨)
npm install

# 5. Expo 개발 서버 실행
npx expo start
```

### 4. 테스트 계정 생성

#### 플래너 계정
1. http://localhost:3000/auth/signup 접속
2. 플래너 정보 입력:
   - 이름: 테스트 플래너
   - 이메일: planner@test.com
   - 비밀번호: test1234

#### 학생 계정
학생 계정은 플래너가 대시보드에서 직접 생성하거나, 
별도의 학생 회원가입 페이지를 통해 생성할 수 있습니다.

## 📱 모바일 앱 실행 방법

### iOS 시뮬레이터 (Mac only)
```bash
cd apps/student-mobile
npx expo run:ios
```

### Android 에뮬레이터
```bash
cd apps/student-mobile
npx expo run:android
```

### 실제 디바이스
1. Expo Go 앱 설치 (App Store/Google Play)
2. `npx expo start` 실행
3. QR 코드 스캔

## 🔧 추가 설정

### Supabase Storage 설정
1. Supabase 대시보드 > Storage
2. 새 버킷 생성:
   - `homework-submissions` (숙제 제출물)
   - `study-materials` (학습 자료)
   - `avatars` (프로필 사진)

### Row Level Security (RLS) 확인
1. Supabase 대시보드 > Authentication > Policies
2. 각 테이블의 RLS 정책이 활성화되어 있는지 확인

### Edge Functions (선택사항)
필요한 경우 서버리스 함수 추가:
```bash
supabase functions new function-name
supabase functions deploy function-name
```

## 📝 개발 팁

### 1. 타입 자동 생성
Supabase CLI를 사용하여 TypeScript 타입 자동 생성:
```bash
npx supabase gen types typescript --project-id your-project-id > supabase/database.types.ts
```

### 2. 실시간 기능 테스트
```javascript
// 실시간 구독 예제
const subscription = supabase
  .channel('homework-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'homework' },
    (payload) => console.log('Change received!', payload)
  )
  .subscribe()
```

### 3. 파일 업로드 예제
```javascript
// 파일 업로드
const { data, error } = await supabase.storage
  .from('homework-submissions')
  .upload('path/to/file', file)
```

## 🐛 문제 해결

### 1. CORS 에러
- Supabase 대시보드 > Settings > API
- CORS 설정에 localhost:3000 추가

### 2. 인증 오류
- 환경 변수가 올바르게 설정되었는지 확인
- Supabase 대시보드에서 Auth 설정 확인

### 3. 데이터베이스 연결 오류
- Supabase 프로젝트가 활성화되어 있는지 확인
- 네트워크 연결 확인

## 📚 추가 리소스

- [Supabase 문서](https://supabase.com/docs)
- [Next.js 문서](https://nextjs.org/docs)
- [React Native/Expo 문서](https://docs.expo.dev)
- [프로젝트 구조 문서](./PROJECT_STRUCTURE.md)

## 🤝 지원

문제가 발생하거나 도움이 필요한 경우:
- GitHub Issues 생성
- 이메일: support@nvoim.com

---

Happy Coding! 🚀