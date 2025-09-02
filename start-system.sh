#!/bin/bash

# 영어 대화 관리 시스템 시작 스크립트

echo "영어 대화 관리 시스템 시작 중..."

# 백엔드 서버 시작
echo "백엔드 서버 시작 중..."
cd backend && node server.js &
BACKEND_PID=$!

# 백엔드가 시작될 때까지 잠시 대기
echo "백엔드 서버가 시작될 때까지 10초 대기 중..."
sleep 10

# 백엔드만 실행하고 프론트엔드는 나중에 실행
echo "백엔드만 실행합니다. 프론트엔드는 별도로 실행해야 합니다."

# 모든 프로세스가 종료될 때까지 대기
echo "모든 앱이 실행 중입니다. Ctrl+C를 눌러 종료하세요."
wait $BACKEND_PID $STUDENT_APP_PID $PLANNER_APP_PID

# 종료 시그널 처리
trap "kill $BACKEND_PID $STUDENT_APP_PID $PLANNER_APP_PID; exit" SIGINT SIGTERM

# 종료 메시지
echo "영어 대화 관리 시스템이 종료되었습니다."