# Production Dockerfile for Express API
FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/

RUN npm ci

COPY apps/api apps/api

RUN npm run build -w @pdf-saas/api

# --- Runner ---
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/

RUN npm ci --omit=dev

COPY --from=builder /app/apps/api/dist apps/api/dist

EXPOSE 5000

CMD ["npm", "run", "start", "-w", "@pdf-saas/api"]
