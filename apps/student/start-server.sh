#!/bin/bash

# 학생 앱 웹 서버 시작 스크립트
# 사용법: ./start-server.sh

set -e  # 에러 시 종료

echo "📱 학생 앱 웹 서버 시작 중..."
echo ""

# 1. 포트 충돌 확인
if lsof -ti:10001 > /dev/null 2>&1; then
    PID=$(lsof -ti:10001)
    echo "⚠️  포트 10001이 이미 사용 중입니다 (PID: $PID)"
    echo ""
    read -p "기존 프로세스를 종료하고 재시작하시겠습니까? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔄 기존 프로세스 종료 중..."
        kill $PID
        sleep 2
    else
        echo "❌ 취소되었습니다."
        exit 1
    fi
fi

# 2. web-build 디렉토리 확인
if [ ! -d "web-build" ]; then
    echo "❌ web-build 디렉토리가 없습니다!"
    echo ""
    echo "다음 명령으로 먼저 빌드하세요:"
    echo "  npm run build:web"
    echo ""
    exit 1
fi

# 3. 서버 시작
echo "✅ 학생 앱 웹 서버 시작..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 서버 주소: http://localhost:10001"
echo "📱 학생 앱: React Native Web"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🛑 서버 중지: Ctrl+C"
echo ""

# serve 실행
npx serve web-build -l 10001

# 서버가 종료되면 메시지 표시
echo ""
echo "👋 학생 앱 웹 서버가 종료되었습니다."
