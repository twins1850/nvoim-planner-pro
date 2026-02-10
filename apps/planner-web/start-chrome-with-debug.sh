#!/bin/bash

echo "Starting Chrome with remote debugging..."

# Start Chrome with remote debugging on port 9222
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --no-first-run \
  --no-default-browser-check \
  "https://supabase.com/dashboard/project/eanqmkyvdwmybwxkghev/sql/new" &

echo "Chrome started with remote debugging on port 9222"
echo "Waiting 5 seconds for Chrome to be ready..."
sleep 5

# Check if port is listening
if lsof -Pi :9222 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Port 9222 is listening"
    echo "Now run: node supabase-auto.js"
else
    echo "⚠️  Port 9222 not listening yet, give it a few more seconds"
fi
