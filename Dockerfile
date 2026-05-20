# PDF SaaS — Next.js + LibreOffice, Ghostscript, Poppler, QPDF, Tesseract
FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

COPY scripts/docker-npm-native.sh /tmp/docker-npm-native.sh

# Install inside Linux container so native modules match the image arch (not macOS lockfile)
RUN npm ci --include=optional \
  && sh /tmp/docker-npm-native.sh

COPY packages/shared packages/shared
COPY apps/web apps/web

ENV PATH="/app/node_modules/.bin:${PATH}"

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

RUN npm ci --omit=dev

COPY --from=builder /app/packages/shared packages/shared
COPY --from=builder /app/apps/web/.next apps/web/.next
COPY --from=builder /app/apps/web/public apps/web/public
COPY apps/web/next.config.ts apps/web/

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "run", "start", "-w", "@pdf-saas/web"]
