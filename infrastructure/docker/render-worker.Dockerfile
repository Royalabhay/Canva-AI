FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates fonts-dejavu-core libvips42 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps
COPY tsconfig.json ./
RUN npm ci
ENV NODE_ENV=production RENDER_WORKER_CONCURRENCY=2
CMD ["npx", "tsx", "apps/worker/video/index.ts"]
