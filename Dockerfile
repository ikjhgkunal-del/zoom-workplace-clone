# ==========================================
# Multi-Stage All-in-One Dockerfile
# Combines:
# 1. Next.js 16 (Standalone Frontend on :3000)
# 2. FastAPI Python (Backend & Reverse-Proxy on :8000)
# 3. Cloudflare Tunnel (cloudflared connected via TUNNEL_TOKEN)
# ==========================================

# Stage 1: Build Next.js Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: Final Production Runtime Container
FROM python:3.12-slim-bookworm AS runner

# Install Node.js 20, curl, ca-certificates, and procps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gnupg \
    procps \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install official cloudflared binary
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then \
      curl -L --output /usr/local/bin/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 ; \
    elif [ "$ARCH" = "aarch64" ]; then \
      curl -L --output /usr/local/bin/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 ; \
    else \
      curl -L --output /usr/local/bin/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 ; \
    fi && \
    chmod +x /usr/local/bin/cloudflared

WORKDIR /app

# Install Python backend dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy Backend Application
COPY backend/ ./backend/

# Copy Frontend Standalone & Assets from Stage 1
COPY --from=frontend-builder /app/frontend/.next/standalone ./frontend/
COPY --from=frontend-builder /app/frontend/.next/static ./frontend/.next/static
COPY --from=frontend-builder /app/frontend/public ./frontend/public

# Copy Entrypoint Script
COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

# Environment Defaults
ENV PORT=3000
ENV HOSTNAME=127.0.0.1
ENV NODE_ENV=production
ENV FRONTEND_URL=https://kunalmujoo.dpdns.org
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
