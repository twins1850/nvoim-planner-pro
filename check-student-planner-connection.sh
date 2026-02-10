#!/bin/bash

echo "🔍 Checking planner-student connection for '관리자 테스트용 학생'..."
echo ""

# Get student with planner_id
curl -s "https://ybcjkdcdruquqrdahtga.supabase.co/rest/v1/student_profiles?id=eq.ea03a8c4-1390-47df-83e2-79ac1712c6a3&select=id,full_name,email,planner_id" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3OTM4MzUsImV4cCI6MjA3MjM2OTgzNX0.L3JFxQNewOY-WWOyF_JJpyL-r8LW5rKAg52fiLcku8w" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8" \
  | python3 -m json.tool

echo ""
echo "✅ Done"
