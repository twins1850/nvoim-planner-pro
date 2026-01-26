#!/bin/bash

# Phase 8 AI Video Analysis System Deployment Script
# NVOIM Planner Pro - 수업 영상 AI 분석 시스템 배포

set -e  # Exit on error

echo "🚀 Phase 8 AI Video Analysis System - Deployment Script"
echo "========================================================"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Error: Supabase CLI is not installed${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI detected${NC}"
echo ""

# Step 1: Database Migrations
echo "📊 Step 1: Running Database Migrations"
echo "----------------------------------------"

echo "Running Phase 8 schema migration..."
supabase db push --db-url "$SUPABASE_DB_URL" \
  --file supabase/migrations/20260114_phase8_ai_video_analysis_schema.sql

echo "Running Phase 8 storage bucket migration..."
supabase db push --db-url "$SUPABASE_DB_URL" \
  --file supabase/migrations/20260114_phase8_storage_bucket_setup.sql

echo -e "${GREEN}✅ Database migrations completed${NC}"
echo ""

# Step 2: Deploy Edge Function
echo "⚡ Step 2: Deploying Edge Function"
echo "-----------------------------------"

echo "Deploying analyze-lesson-video function..."
supabase functions deploy analyze-lesson-video \
  --project-ref "$SUPABASE_PROJECT_REF"

echo -e "${GREEN}✅ Edge Function deployed${NC}"
echo ""

# Step 3: Verify Storage Bucket
echo "📦 Step 3: Verifying Storage Bucket"
echo "------------------------------------"

echo "Checking if 'lesson-videos' bucket exists..."
# Note: This is informational only, actual bucket creation is done via migration

echo -e "${YELLOW}⚠️  Please verify the bucket settings:${NC}"
echo "   1. Go to Supabase Dashboard → Storage"
echo "   2. Find 'lesson-videos' bucket"
echo "   3. Verify RLS policies are active"
echo ""

# Step 4: Environment Variables Check
echo "🔐 Step 4: Environment Variables Check"
echo "---------------------------------------"

echo "Required environment variables:"
echo "   - SUPABASE_URL (set in Edge Function)"
echo "   - SUPABASE_SERVICE_ROLE_KEY (set in Edge Function)"
echo ""

echo -e "${YELLOW}⚠️  Ensure these are configured in Supabase Dashboard:${NC}"
echo "   Supabase Dashboard → Edge Functions → analyze-lesson-video → Settings"
echo ""

# Step 5: Integration Test Instructions
echo "🧪 Step 5: Integration Testing"
echo "-------------------------------"

echo -e "${YELLOW}Manual testing steps:${NC}"
echo "   1. Navigate to: https://your-app.vercel.app/lessons/analyze"
echo "   2. Upload a test video (< 25MB, preferably 5-10 minutes)"
echo "   3. Wait for processing (estimated 1-3 minutes for 10-minute video)"
echo "   4. Verify analysis results appear on /lessons/[id] page"
echo "   5. Test 'Add to Homework' button"
echo ""

# Summary
echo "📋 Deployment Summary"
echo "====================="
echo -e "${GREEN}✅ Database migrations executed${NC}"
echo -e "${GREEN}✅ Edge Function deployed${NC}"
echo -e "${YELLOW}⚠️  Storage bucket verification needed (manual)${NC}"
echo -e "${YELLOW}⚠️  Environment variables verification needed (manual)${NC}"
echo -e "${YELLOW}⚠️  Integration testing needed (manual)${NC}"
echo ""

echo "🎉 Deployment script completed!"
echo ""
echo "Next steps:"
echo "1. Register OpenAI API key in app settings (/settings/api-keys)"
echo "2. Upload test video and verify end-to-end flow"
echo "3. Check Supabase Edge Function logs for any errors"
echo ""
echo "Cost reminder: ~\$0.25-0.30 per 25-minute video"
echo ""
