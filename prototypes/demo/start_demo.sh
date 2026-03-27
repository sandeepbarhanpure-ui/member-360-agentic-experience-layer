#!/bin/bash
# Member 360 — Demo Launcher
# Usage: ./start_demo.sh

PORT=8888
DIR="$(cd "$(dirname "$0")" && pwd)"
URL="http://localhost:$PORT/index.html"

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   Member 360 — Demo Launcher  🏥    ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# Kill anything already on the port
if lsof -ti :$PORT >/dev/null 2>&1; then
  echo "  ⚠️  Port $PORT in use — clearing it..."
  lsof -ti :$PORT | xargs kill -9 2>/dev/null
  sleep 0.5
fi

echo "  📂 Serving: $DIR"
echo "  🌐 URL:     $URL"
echo "  ✅ Works fully offline (vendor assets bundled)"
echo ""
echo "  Press Ctrl+C to stop the server."
echo ""

# Start server in background
cd "$DIR"
python3 -m http.server $PORT &
SERVER_PID=$!

# Give it a moment to boot
sleep 0.8

# Open browser (macOS)
open "$URL"

# Wait so Ctrl+C kills the server cleanly
wait $SERVER_PID
