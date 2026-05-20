# PDF SaaS

## What This Is

A web SaaS providing iLovePDF-style PDF and document tools: merge, split, convert, compress, OCR, and more. Users pick a tool, upload files, process, and download results. Free at launch with rate limits; no payments in v1.

## Core Value

Reliable PDF utilities with a consistent UX (pick tool → upload → process → download), including heavy conversions via background workers without blocking the browser.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Full tool catalog (~30 tools) enabled end-to-end
- [ ] Sync path for light PDF ops; async queue for heavy conversions
- [ ] Ephemeral file storage with auto-delete (2h TTL)
- [ ] Free tier rate limits by IP

### Out of Scope

- Stripe / subscriptions — v2 milestone
- Mobile/desktop apps, cloud drive pickers
- AI summarizer, translate, PDF forms builder
- Team SSO, legally binding e-signatures

## Context

- Greenfield Next.js TypeScript monorepo
- Worker runs in Docker with LibreOffice, poppler, ghostscript, qpdf, tesseract
- Web on Vercel-compatible Next.js; worker on Docker host

## Constraints

- **Tech**: Next.js 15 App Router, Prisma, BullMQ, S3-compatible storage
- **Performance**: Heavy tools never on serverless edge; worker only
- **Security**: Presigned URLs, MIME validation, file TTL

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Monorepo (web + worker + shared) | Shared tool registry and types | — Pending |
| Free-only v1 | User choice | — Pending |
| MinIO local / S3 prod | Standard ephemeral object storage | — Pending |

---
*Last updated: 2026-05-19 after project init*
