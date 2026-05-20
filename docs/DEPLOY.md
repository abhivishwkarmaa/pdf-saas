# Deployment Guide

## Environment variables

Copy `.env.example` to `apps/web/.env` and configure:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis for BullMQ |
| `S3_*` | S3-compatible storage (R2, AWS, MinIO) |
| `FILE_TTL_HOURS` | Auto-delete files after N hours (default 2) |
| `RATE_LIMIT_PER_HOUR` | Free tier limit per IP (default 20) |

Worker uses the same variables (point `DATABASE_URL` and `S3_*` to production services).

## Web (Vercel)

1. Connect repo; set root directory to `apps/web` or use monorepo build:
   - Build: `cd ../.. && npm install && npm run build -w @pdf-saas/shared && npm run build -w @pdf-saas/web`
2. Add all env vars from `.env.example`.
3. Run `prisma db push` or migrations against production Postgres.

**Note:** Sync tools work on Vercel if `qpdf`/`gs` are unavailable (pdf-lib fallback). Heavy async tools require the worker.

## Worker (Docker)

```bash
docker build -f Dockerfile.worker -t pdf-saas-worker .
docker run --env-file apps/web/.env pdf-saas-worker
```

The worker image should include: ghostscript, poppler-utils, qpdf, tesseract-ocr, libreoffice-writer.

For production, deploy to Fly.io, Railway, or ECS with the same env as the web app.

## Health check

`GET /api/health` — returns `{ status: "ok" }` when database is reachable.

## Stripe (v2)

Not included in v1. See `.planning/REQUIREMENTS.md` PAY-* requirements for future billing work.
