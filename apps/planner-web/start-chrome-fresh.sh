#!/bin/bash

# 새로운 프로필 디렉토리 (완전히 깨끗한 상태)
CHROME_PROFILE_DIR="$HOME/.chrome-playwright-profile-fresh-$(date +%s)"

echo "Starting Chrome with FRESH profile..."
echo "Profile directory: $CHROME_PROFILE_DIR"
echo ""

# Chrome 시작
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir="$CHROME_PROFILE_DIR" \
  --no-first-run \
  --no-default-browser-check \
  "https://nvoim-planner-pro.vercel.app/" &

echo "✅ Chrome started with FRESH profile!"
echo "   This is a completely new device fingerprint."
echo "   Remote debugging port: 9222"
echo ""
echo "Waiting 8 seconds for Chrome to be ready..."
sleep 8

# Check if port is ready
if nc -z 127.0.0.1 9222 2>/dev/null; then
  echo "✅ Port 9222 is ready!"
  echo ""
  echo "Now you can run: node test-signup-fresh.js"
else
  echo "⚠️  Port 9222 not ready yet, wait a bit longer..."
fi
