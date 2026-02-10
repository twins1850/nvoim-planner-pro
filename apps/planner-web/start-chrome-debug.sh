#!/bin/bash

# Close existing Chrome instances
echo "Closing existing Chrome instances..."
pkill -9 "Google Chrome"
sleep 2

# Start Chrome with remote debugging enabled
echo "Starting Chrome with remote debugging on port 9222..."
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/Library/Application Support/Google/Chrome" \
  > /dev/null 2>&1 &

echo "✅ Chrome started with debugging enabled"
echo "   You can now run the Playwright script"
