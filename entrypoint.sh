#!/bin/bash
set -e

echo "==================================================="
echo " Starting Zoom Workplace All-in-One Container"
echo " Domain: ${FRONTEND_URL:-https://kunalmujoo.dpdns.org}"
echo "==================================================="

# Graceful cleanup on stop
cleanup() {
    echo "Stopping all services..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

# 1. Start Next.js Frontend Standalone Server (Port 3000)
echo "[1/3] Starting Next.js frontend on 127.0.0.1:3000..."
cd /app/frontend
if [ -f "server.js" ]; then
    PORT=3000 HOSTNAME=127.0.0.1 node server.js &
elif [ -f "frontend/server.js" ]; then
    cd frontend && PORT=3000 HOSTNAME=127.0.0.1 node server.js &
fi
FRONTEND_PID=$!

sleep 2

# 2. Start FastAPI Backend & Ingress Proxy (Port 8000)
echo "[2/3] Starting FastAPI backend on 0.0.0.0:8000..."
cd /app/backend
uvicorn main:app --host 0.0.0.0 --port 8000 --ws wsproto &
BACKEND_PID=$!

sleep 2

# 3. Start Cloudflare Tunnel
TUNNEL_TOKEN="${TUNNEL_TOKEN:-${CLOUDFLARE_TUNNEL_TOKEN}}"

if [ -n "$TUNNEL_TOKEN" ]; then
    echo "[3/3] Connecting Cloudflare Tunnel to Cloudflare Edge..."
    cloudflared tunnel --no-autoupdate --protocol http2 run --token "$TUNNEL_TOKEN" &
    TUNNEL_PID=$!
else
    echo "[3/3] No TUNNEL_TOKEN provided. Listening directly on port 8000."
fi

# Keep container running and monitor child processes
wait -n
