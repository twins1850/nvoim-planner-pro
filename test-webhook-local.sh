#!/bin/bash

# PayAction Webhook 로컬 테스트 스크립트
# 실제 입금 없이 Webhook 호출 시뮬레이션

echo "🧪 PayAction Webhook 로컬 테스트"
echo "================================"
echo ""

# 테스트할 주문 번호 입력
read -p "주문번호 입력 (예: PLANNER202601211510): " ORDER_ID

# Webhook 요청 전송
curl -X POST http://localhost:3000/api/payaction-webhook \
  -H "Content-Type: application/json" \
  -H "X-Payaction-Webhook-Key: test_webhook_key_for_local_development" \
  -H "X-Payaction-Trace-Id: test-trace-123" \
  -H "X-Payaction-Mall-Id: test-mall-456" \
  -d "{
    \"orderId\": \"$ORDER_ID\",
    \"status\": \"매칭완료\",
    \"amount\": 150000,
    \"depositorName\": \"테스터$ORDER_ID\",
    \"depositTime\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
  }"

echo ""
echo "================================"
echo "✅ Webhook 요청 전송 완료"
echo "💡 브라우저에서 Pending 페이지 확인해보세요"
