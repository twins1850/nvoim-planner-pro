# 다음 Claude 세션용 - 즉시 실행 가이드

## 🔥 즉시 시작 명령어 (복사-붙여넣기)

```bash
# 1. 프로젝트 디렉토리 이동
cd /Users/twins/Downloads/nvoim-planer-pro

# 2. 모든 서비스 한 번에 시작
bash QUICK_START.sh

# 3. 상태 확인 (10초 후)
curl http://localhost:3000/health
```

## 📋 Claude에게 알려줄 정보

> **Claude에게 전달**: 영어 회화 관리 시스템의 모든 서비스가 성공적으로 실행되었습니다. 현재 상태:
> 
> - ✅ **백엔드**: http://localhost:3000 (Node.js Express)
> - ✅ **학생용 앱**: http://localhost:8081 (Expo React Native, 웹에서 완전 동작)  
> - ✅ **플래너용 앱**: http://localhost:8082 (React Native Metro 번들러)
> 
> **완료된 작업**: TypeScript 컴파일 오류 수정, React 의존성 호환성 해결, 웹 앱 테스트 완료, 오프라인 모드 구현
> 
> **다음 단계**: 모바일 앱 테스트, 백엔드-프론트엔드 API 연동, 실시간 기능 구현
> 
> 자세한 내용은 `SESSION_CONTINUE.md` 파일을 참고하세요.

## ⚡ 빠른 명령어

```bash
# 서비스 종료
bash STOP_SERVICES.sh

# 개별 서비스 재시작
cd backend && node test-server.js &
cd apps/student && npm start &  
cd apps/planner && npx react-native start --port 8082 &

# 의존성 재설치 (필요시)
cd apps/student && npm install
cd ../planner && npm install
cd ../../backend && npm install
```

## 🎯 우선 개발 항목

1. **모바일 테스트**: Expo Go로 실제 스마트폰 테스트
2. **API 연동**: MongoDB, Redis 연결 후 실제 데이터 처리  
3. **음성 기능**: 녹음/재생 기능 구현
4. **실시간 알림**: Socket.io 연결
5. **오프라인 동기화**: 온라인 복귀 시 데이터 동기화

---
**준비 완료**: 2025-08-21 13:05