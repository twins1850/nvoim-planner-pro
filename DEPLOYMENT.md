# Deployment Configuration

## Render 배포 설정

### 현재 설정 (2025-09-03)

**Build & Deploy 설정**:
- **Root Directory**: `apps/planner-web`
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Branch**: main

### 배포 히스토리

#### v2.2 (2025-09-03 09:35) - 무한 루프 해결
- **Root Directory를 `apps/planner-web`로 설정**
- **Build Command 단순화**: `npm run build` (무한 루프 방지)
- **Start Command 단순화**: `npm start` (무한 루프 방지)
- 이제 Render가 올바른 디렉토리에서 시작하여 간단한 Next.js 명령어만 실행

#### v2.1 (2025-09-02 18:25)
- Root Directory 설정 제거하여 monorepo 구조 문제 해결
- Build/Start 명령어에 디렉토리 이동 로직 추가
- Next.js "app directory not found" 오류 해결

#### v2.0 (2025-09-02 18:21)  
- 무한루프 문제 해결
- root package.json에 build/start 스크립트 추가
- Turbopack 설정 production에서 제거

### 환경 변수

필요한 환경 변수들:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### URL

- **Production**: https://nvoim-planner-pro.onrender.com
- **Repository**: https://github.com/twins1850/nvoim-planner-pro