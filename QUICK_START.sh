#!/bin/bash
# 영어 회화 관리 시스템 - 빠른 시작 스크립트
# 사용법: bash QUICK_START.sh

echo "🚀 영어 회화 관리 시스템 시작 중..."

# 프로젝트 루트로 이동
cd "$(dirname "$0")"

echo "📁 현재 디렉토리: $(pwd)"

# 백그라운드에서 서비스 시작
echo "⚙️  백엔드 서버 시작 (포트 3000)..."
cd backend && node test-server.js &
BACKEND_PID=$!

echo "📱 학생용 앱 시작 (포트 8081)..."
cd ../apps/student && npm start &
STUDENT_PID=$!

echo "🎯 플래너용 앱 시작 (포트 8082)..."
cd ../planner && npx react-native start --port 8082 &
PLANNER_PID=$!

# PID 저장
cd ../../
echo $BACKEND_PID > .backend.pid
echo $STUDENT_PID > .student.pid  
echo $PLANNER_PID > .planner.pid

echo ""
echo "✅ 모든 서비스 시작 완료!"
echo ""
echo "📋 서비스 정보:"
echo "   🖥️  백엔드:     http://localhost:3000"
echo "   👨‍🎓 학생용 앱:  http://localhost:8081" 
echo "   👨‍🏫 플래너 앱:  http://localhost:8082"
echo "   📊 대시보드:    file://$(pwd)/status.html"
echo ""
echo "⏰ 서비스가 초기화되는 동안 10초 정도 기다려주세요..."
echo ""
echo "🔄 PID 정보:"
echo "   Backend PID: $BACKEND_PID"
echo "   Student PID: $STUDENT_PID" 
echo "   Planner PID: $PLANNER_PID"
echo ""
echo "⚠️  종료하려면: bash STOP_SERVICES.sh"