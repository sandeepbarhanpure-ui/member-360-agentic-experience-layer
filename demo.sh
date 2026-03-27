#!/bin/bash
# ============================================================
# Member 360 -- Demo Launcher
# Run from anywhere inside the repo:
#   ./demo.sh
#
# Opens the demo hub in your browser at http://127.0.0.1:8888
# Fully offline -- no backend, no internet required.
# Press Ctrl+C to stop.
# ============================================================

PORT=8888
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEMO_DIR="$SCRIPT_DIR/prototypes/demo"
URL="http://127.0.0.1:$PORT/index.html"

echo ""
echo "  +------------------------------------------+"
echo "  |   Member 360 -- Demo Launcher            |"
echo "  +------------------------------------------+"
echo "  |  [chat]  Agentic Chat UI (7 flows)       |"
echo "  |  [dash]  Advocacy Dashboard              |"
echo "  |  [arch]  Architecture Diagram            |"
echo "  +------------------------------------------+"
echo ""

# Guard: demo dir must exist
if [ ! -d "$DEMO_DIR" ]; then
  echo "  ERROR: Demo folder not found at: $DEMO_DIR"
  exit 1
fi

# Guard: python3 required
if ! command -v python3 &>/dev/null; then
  echo "  ERROR: python3 not found. Install via: brew install python3"
  exit 1
fi

# Clear port if occupied
if lsof -ti :$PORT >/dev/null 2>&1; then
  echo "  WARNING: Port $PORT in use -- clearing it..."
  lsof -ti :$PORT | xargs kill -9 2>/dev/null
  sleep 0.5
fi

echo "  Serving : $DEMO_DIR"
echo "  URL     : $URL"
echo "  Mode    : Offline (vendor JS bundled)"
echo ""
echo "  Press Ctrl+C to stop."
echo ""

# Start server with explicit IPv4 -- avoids macOS IPv6 flakiness
cd "$DEMO_DIR"
python3 -m http.server $PORT --bind 127.0.0.1 &
SERVER_PID=$!

# Wait until server is actually ready (up to 2s)
for i in 1 2 3 4 5 6; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$PORT/index.html 2>/dev/null)
  if [ "$STATUS" = "200" ]; then
    break
  fi
  sleep 0.3
done

# Open in browser (macOS)
open "$URL"

# Trap Ctrl+C for clean shutdown
trap "echo ''; echo '  Server stopped.'; kill $SERVER_PID 2>/dev/null; exit 0" INT
wait $SERVER_PID