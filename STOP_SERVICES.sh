#!/bin/bash
# 영어 회화 관리 시스템 - 서비스 종료 스크립트

echo "🛑 영어 회화 관리 시스템 종료 중..."

cd "$(dirname "$0")"

# PID 파일에서 프로세스 ID 읽기
if [ -f ".backend.pid" ]; then
    BACKEND_PID=$(cat .backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        echo "🖥️  백엔드 서버 종료 (PID: $BACKEND_PID)"
        kill $BACKEND_PID
    fi
    rm -f .backend.pid
fi

if [ -f ".student.pid" ]; then
    STUDENT_PID=$(cat .student.pid)
    if kill -0 $STUDENT_PID 2>/dev/null; then
        echo "👨‍🎓 학생용 앱 종료 (PID: $STUDENT_PID)"
        kill $STUDENT_PID
    fi
    rm -f .student.pid
fi

if [ -f ".planner.pid" ]; then
    PLANNER_PID=$(cat .planner.pid)
    if kill -0 $PLANNER_PID 2>/dev/null; then
        echo "👨‍🏫 플래너 앱 종료 (PID: $PLANNER_PID)"
        kill $PLANNER_PID
    fi
    rm -f .planner.pid
fi

# Metro bundler 프로세스도 강제 종료
echo "🔄 Metro bundler 프로세스 정리..."
pkill -f "metro"
pkill -f "expo start"
pkill -f "react-native start"

echo ""
echo "✅ 모든 서비스가 종료되었습니다."
echo "💡 다시 시작하려면: bash QUICK_START.sh"