#!/bin/bash

# 통합 테스트 실행 스크립트
# 사용법: ./run-integration-tests.sh

set -e  # 에러 시 종료

echo "🚀 통합 테스트 실행 준비 중..."
echo ""

# 1. 학생 앱 서버 확인
echo "📱 학생 앱 서버 상태 확인..."
if lsof -ti:10001 > /dev/null 2>&1; then
    PID=$(lsof -ti:10001)
    echo "✅ 학생 앱 서버 실행 중 (PID: $PID)"
else
    echo "❌ 학생 앱 서버가 실행되지 않았습니다!"
    echo ""
    echo "다음 명령으로 학생 앱 서버를 시작하세요:"
    echo "  cd apps/student"
    echo "  npx serve web-build -l 10001"
    echo ""
    echo "또는 새 터미널에서:"
    echo "  ./start-student-server.sh"
    exit 1
fi

# 2. .env.local 파일 확인
echo ""
echo "📋 환경 변수 확인..."
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local 파일이 없습니다!"
    echo "   apps/planner-web/.env.local 파일을 생성하세요."
    exit 1
fi

if ! grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.local; then
    echo "⚠️  경고: SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았을 수 있습니다."
fi

echo "✅ 환경 변수 파일 존재"

# 3. 테스트 실행
echo ""
echo "🧪 통합 테스트 실행 중..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm run test:integration tests/integration/06-invite-code-flow.spec.ts

# 4. 결과 요약
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 테스트 실행 완료!"
echo ""
echo "📊 결과:"
echo "  - 테스트 결과: 위 로그 참조"
echo "  - 스크린샷: test-results/ 디렉토리"
echo "  - 에러 컨텍스트: test-results/*/error-context.md"
echo ""
echo "🔍 더 자세한 정보:"
echo "  - README: tests/integration/README.md"
echo "  - 개발 현황: ../../DEVELOPMENT_STATUS.md (Phase 10)"
echo ""
