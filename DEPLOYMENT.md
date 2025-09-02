# Deployment Configuration

## Render 배포 설정

### 현재 설정 (2025-09-02)

**Build & Deploy 설정**:
- **Root Directory**: (비어있음)
- **Build Command**: `cd apps/planner-web && npm run build`
- **Start Command**: `cd apps/planner-web && npm start`
- **Branch**: main

### 배포 히스토리

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