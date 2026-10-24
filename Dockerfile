# qaZAR Container Engine
FROM node:20-bookworm-slim

# Install system dependencies for Playwright headless Chromium
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install npm dependencies and Playwright Chromium binaries with system deps
RUN npm ci --omit=dev && \
    npx playwright install --with-deps chromium && \
    rm -rf /var/lib/apt/lists/*

# Copy application code
COPY server/ ./server/
COPY web/ ./web/

# Build static web UI for integrated hosting or preview
RUN npx vite build web

# Create data directory and grant permissions to node user
RUN mkdir -p /app/data && chown -R node:node /app

USER node

ENV PORT=8787 \
    DATA_DIR=/app/data \
    NODE_ENV=production

EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8787/healthz || exit 1

CMD ["node", "server/index.js"]
