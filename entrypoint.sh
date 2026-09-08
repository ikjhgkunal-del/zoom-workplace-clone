#!/bin/bash
set -e

echo "==================================================="
echo " Starting Zoom Workplace All-in-One Container"
echo " Domain: ${FRONTEND_URL:-https://kunalmujoo.dpdns.org}"
echo "==================================================="

# Function to handle shutdown
cleanup() {
    echo "Stopping container services..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

# 1. Start Next.js Frontend Standalone Server (Port 3000)
echo "[1/3] Locating and starting Next.js frontend..."
SERVER_JS=$(find /app/frontend -name "server.js" | head -n 1)
if [ -n "$SERVER_JS" ]; then
    SERVER_DIR=$(dirname "$SERVER_JS")
    echo "Found server.js at $SERVER_JS. Starting in $SERVER_DIR..."
    cd "$SERVER_DIR"
    PORT=3000 HOSTNAME=127.0.0.1 node server.js &
    FRONTEND_PID=$!
else
    echo "WARNING: server.js not found, listing /app/frontend:"
    ls -la /app/frontend || true
fi

sleep 2

# 2. Start FastAPI Backend (Port 8000)
echo "[2/3] Starting FastAPI backend on 0.0.0.0:8000..."
cd /app/backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

sleep 2

# 3. Start Cloudflare Tunnel
TUNNEL_TOKEN="${TUNNEL_TOKEN:-${CLOUDFLARE_TUNNEL_TOKEN}}"

if [ -n "$TUNNEL_TOKEN" ]; then
    echo "[3/3] Starting Cloudflare Tunnel with provided token..."
    exec cloudflared tunnel --no-autoupdate --protocol http2 run --token "$TUNNEL_TOKEN"
else
    echo "[3/3] No TUNNEL_TOKEN provided. Running on port 8000."
    wait $BACKEND_PID
fi
