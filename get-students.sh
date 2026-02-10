#!/bin/bash

# Get student profiles
echo "🔍 Fetching all student profiles..."
echo ""

curl -s "https://ybcjkdcdruquqrdahtga.supabase.co/rest/v1/student_profiles?select=id,full_name,email,phone" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3OTM4MzUsImV4cCI6MjA3MjM2OTgzNX0.L3JFxQNewOY-WWOyF_JJpyL-r8LW5rKAg52fiLcku8w" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8" \
  | python3 -m json.tool

echo ""
echo "✅ Done"
