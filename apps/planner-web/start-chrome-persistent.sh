#!/bin/bash

CHROME_PROFILE_DIR="$HOME/.chrome-playwright-profile"

echo "Starting Chrome with persistent profile..."
echo "Profile directory: $CHROME_PROFILE_DIR"

# Create directory if it doesn't exist
mkdir -p "$CHROME_PROFILE_DIR"

# Start Chrome with remote debugging
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir="$CHROME_PROFILE_DIR" \
  --no-first-run \
  --no-default-browser-check \
  "https://supabase.com/dashboard/project/eanqmkyvdwmybwxkghev/sql/new" &

echo ""
echo "✅ Chrome started!"
echo "   This Chrome will remember your logins."
echo "   Remote debugging port: 9222"
echo ""
echo "Waiting 8 seconds for Chrome to be ready..."
sleep 8

if lsof -Pi :9222 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ Port 9222 is ready!"
    echo ""
    echo "Now you can run: node supabase-auto.js"
else
    echo "⚠️  Port not ready yet, wait a bit more"
fi
