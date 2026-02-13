#!/bin/bash
# Local → Cloud Supabase 동기화 스크립트
# Migration 파일을 Local Docker와 Cloud Supabase 모두에 적용

set -e  # 에러 발생 시 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 프로젝트 루트 디렉토리로 이동
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}🔄 Local ↔ Cloud Supabase 동기화${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Supabase 프로젝트 URL 확인
SUPABASE_URL=""
SUPABASE_KEY=""

# .env 파일에서 읽기 시도
if [ -f ".env.local" ]; then
    source .env.local
    SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-$SUPABASE_URL}
    SUPABASE_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY:-$SUPABASE_KEY}
elif [ -f "apps/planner-web/.env.local" ]; then
    source apps/planner-web/.env.local
    SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-$SUPABASE_URL}
    SUPABASE_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY:-$SUPABASE_KEY}
fi

if [ -z "$SUPABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  Cloud Supabase URL을 찾을 수 없습니다.${NC}"
    echo -e "${YELLOW}   .env.local 파일에 NEXT_PUBLIC_SUPABASE_URL을 설정하세요.${NC}"
    echo ""
    echo -e "${CYAN}현재는 Local Docker Supabase에만 적용합니다.${NC}"
    CLOUD_SYNC=false
else
    echo -e "${GREEN}✅ Cloud Supabase URL 감지: ${SUPABASE_URL}${NC}"
    CLOUD_SYNC=true
fi

echo ""

# Step 1: Local Docker Supabase에 적용
echo -e "${BLUE}──────────────────────────────────────────────${NC}"
echo -e "${BLUE}📦 Step 1: Local Docker Supabase 동기화${NC}"
echo -e "${BLUE}──────────────────────────────────────────────${NC}"
echo ""

./scripts/apply-migrations.sh

echo ""

# Step 2: Cloud Supabase에 적용 (선택적)
if [ "$CLOUD_SYNC" = true ]; then
    echo -e "${BLUE}──────────────────────────────────────────────${NC}"
    echo -e "${BLUE}☁️  Step 2: Cloud Supabase 동기화${NC}"
    echo -e "${BLUE}──────────────────────────────────────────────${NC}"
    echo ""

    # Supabase CLI 설치 확인
    if ! command -v supabase &> /dev/null; then
        echo -e "${YELLOW}⚠️  Supabase CLI가 설치되지 않았습니다.${NC}"
        echo -e "${YELLOW}   다음 명령어로 설치하세요:${NC}"
        echo -e "${YELLOW}   npm install -g supabase${NC}"
        echo ""
        echo -e "${CYAN}💡 대안: Supabase Studio에서 수동으로 SQL 실행${NC}"
        echo -e "${CYAN}   1. https://supabase.com/dashboard 접속${NC}"
        echo -e "${CYAN}   2. SQL Editor 열기${NC}"
        echo -e "${CYAN}   3. 아래 파일 내용 복사 후 실행:${NC}"
        echo ""

        # 최근 migration 파일 표시
        RECENT_MIGRATIONS=$(ls -t supabase/migrations/*.sql | head -5)
        echo -e "${YELLOW}📋 최근 migration 파일 (최신 5개):${NC}"
        echo "$RECENT_MIGRATIONS" | nl
        echo ""

        # 특히 중요한 migration 강조
        echo -e "${RED}🚨 반드시 적용해야 할 Migration:${NC}"
        echo -e "${RED}   - 025_create_homework_submissions_bucket.sql${NC}"
        echo -e "${RED}   - 024_homework_submissions_storage_policies.sql${NC}"
        echo ""

        exit 0
    fi

    echo -e "${GREEN}✅ Supabase CLI 설치됨${NC}"
    echo ""

    # Supabase 프로젝트 링크 확인
    if [ ! -f ".supabase/config.toml" ]; then
        echo -e "${YELLOW}⚠️  Supabase 프로젝트가 링크되지 않았습니다.${NC}"
        echo -e "${YELLOW}   다음 명령어로 프로젝트를 링크하세요:${NC}"
        echo -e "${YELLOW}   npx supabase link --project-ref <YOUR_PROJECT_REF>${NC}"
        echo ""
        exit 0
    fi

    # Cloud에 migration 푸시
    echo -e "${CYAN}🚀 Cloud Supabase에 migration 푸시 중...${NC}"

    if npx supabase db push; then
        echo -e "${GREEN}✅ Cloud Supabase 동기화 성공!${NC}"
    else
        echo -e "${RED}❌ Cloud Supabase 동기화 실패${NC}"
        echo -e "${YELLOW}💡 수동 적용 방법:${NC}"
        echo -e "${YELLOW}   1. https://supabase.com/dashboard 접속${NC}"
        echo -e "${YELLOW}   2. SQL Editor에서 migration 파일 내용 실행${NC}"
        exit 1
    fi
else
    echo -e "${CYAN}ℹ️  Cloud Supabase 동기화 건너뜀 (URL 미설정)${NC}"
fi

echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}🎉 동기화 완료!${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# 동기화 상태 확인
echo -e "${CYAN}📊 동기화 상태 확인:${NC}"
echo -e "${CYAN}   Local Docker: ✅ 동기화됨${NC}"
if [ "$CLOUD_SYNC" = true ]; then
    echo -e "${CYAN}   Cloud Supabase: ✅ 동기화됨${NC}"
else
    echo -e "${CYAN}   Cloud Supabase: ⏳ 수동 동기화 필요${NC}"
fi
echo ""
