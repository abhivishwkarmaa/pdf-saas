# PDF SaaS — Next.js + LibreOffice, Ghostscript, Poppler, QPDF, Tesseract
FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/storage/package.json packages/storage/

COPY scripts/docker-npm-native.sh /tmp/docker-npm-native.sh

# Install inside Linux container so native modules match the image arch (not macOS lockfile)
RUN sed -i 's/\r$//' /tmp/docker-npm-native.sh \
  && npm config set registry https://registry.npmjs.org/ \
  && npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm config set audit false \
  && npm config set fund false \
  && npm ci --include=optional \
  && bash /tmp/docker-npm-native.sh

COPY packages/shared packages/shared
COPY packages/storage packages/storage
COPY apps/web apps/web

ENV PATH="/app/node_modules/.bin:${PATH}"

# Stable Server Actions encryption key. Without this, Next.js generates a new
# random key on every build, which breaks any browser tab loaded from a previous
# deployment with "Failed to find Server Action".
ARG NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
ENV NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=${NEXT_SERVER_ACTIONS_ENCRYPTION_KEY}

RUN npm run build -w @pdf-saas/shared \
  && npm run build -w @pdf-saas/web

# ─── Production image with all PDF/office CLI tools ───────────────────────────
FROM node:22-bookworm-slim AS runner

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
  ca-certificates \
  ghostscript \
  poppler-utils \
  qpdf \
  tesseract-ocr \
  tesseract-ocr-eng \
  libreoffice-writer \
  libreoffice-calc \
  libreoffice-impress \
  fonts-dejavu-core \
  fonts-liberation \
  python3 \
  python3-pip \
  chromium \
  && pip3 install --default-timeout=1000 --retries 10 --no-cache-dir "PyMuPDF<1.24.0" pdf2docx --break-system-packages \
  && rm -rf /var/lib/apt/lists/* \
  && command -v soffice \
  && command -v gs \
  && command -v qpdf \
  && command -v pdftoppm \
  && command -v tesseract

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV PATH="/app/node_modules/.bin:${PATH}"

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/storage/package.json packages/storage/
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --omit=dev

COPY --from=builder /app/packages/shared packages/shared
COPY --from=builder /app/packages/storage packages/storage
COPY --from=builder /app/apps/web/.next apps/web/.next
COPY --from=builder /app/apps/web/public apps/web/public
COPY apps/web/next.config.ts apps/web/

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=> xit(1))"

CMD ["npm", "run", "start", "-w", "@pdf-saas/web"]
