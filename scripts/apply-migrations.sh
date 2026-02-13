#!/bin/bash
# 자동 Migration 적용 스크립트
# 모든 migration 파일을 순서대로 Local Docker Supabase에 적용

set -e  # 에러 발생 시 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 프로젝트 루트 디렉토리로 이동
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}🚀 Migration 자동 적용 스크립트${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Docker 컨테이너 확인
if ! docker ps | grep -q "supabase_db_nvoim-planer-pro"; then
    echo -e "${RED}❌ Supabase Docker 컨테이너가 실행 중이 아닙니다.${NC}"
    echo -e "${YELLOW}   다음 명령어로 Supabase를 시작하세요:${NC}"
    echo -e "${YELLOW}   npx supabase start${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Supabase Docker 컨테이너 실행 중${NC}"
echo ""

# Migration 파일 개수 확인
MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l | tr -d ' ')

if [ "$MIGRATION_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  적용할 migration 파일이 없습니다.${NC}"
    exit 0
fi

echo -e "${BLUE}📋 총 ${MIGRATION_COUNT}개의 migration 파일 발견${NC}"
echo ""

# 각 migration 파일 적용
SUCCESS_COUNT=0
FAIL_COUNT=0

for migration_file in supabase/migrations/*.sql; do
    filename=$(basename "$migration_file")
    echo -e "${YELLOW}📄 적용 중: ${filename}${NC}"

    # Migration 적용 (pipe 방식)
    if cat "$migration_file" | docker exec -i supabase_db_nvoim-planer-pro psql -U postgres -d postgres > /dev/null 2>&1; then
        echo -e "${GREEN}   ✅ 성공${NC}"
        ((SUCCESS_COUNT++))
    else
        echo -e "${RED}   ❌ 실패 (이미 적용되었거나 에러 발생)${NC}"
        ((FAIL_COUNT++))
    fi
    echo ""
done

# 결과 요약
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}📊 적용 결과${NC}"
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}✅ 성공: ${SUCCESS_COUNT}개${NC}"
if [ "$FAIL_COUNT" -gt 0 ]; then
    echo -e "${RED}❌ 실패/스킵: ${FAIL_COUNT}개${NC}"
fi
echo ""

# 현재 bucket 설정 확인
echo -e "${BLUE}🔍 homework-submissions bucket 상태 확인:${NC}"
docker exec supabase_db_nvoim-planer-pro psql -U postgres -d postgres -c "SELECT id, name, allowed_mime_types FROM storage.buckets WHERE id = 'homework-submissions';" 2>/dev/null || echo -e "${YELLOW}   ⚠️  bucket 조회 실패${NC}"

echo ""
echo -e "${GREEN}🎉 Migration 적용 완료!${NC}"
