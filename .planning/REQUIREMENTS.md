# Requirements: PDF SaaS

**Defined:** 2026-05-19
**Core Value:** Reliable PDF utilities with consistent UX including heavy async conversions

## v1 Requirements

### Core

- [ ] **CORE-01**: User can browse all tools on home page by category
- [ ] **CORE-02**: User can open a dedicated page per tool with upload UI
- [ ] **CORE-03**: User can upload files via presigned URL to object storage
- [ ] **CORE-04**: Files auto-delete after TTL (2 hours)
- [ ] **CORE-05**: Rate limits enforced per IP (20 jobs/hour)

### UI

- [ ] **UI-01**: Drag-and-drop multi-file upload
- [ ] **UI-02**: Processing progress and error states
- [ ] **UI-03**: Download result when job completes

### Organize (sync)

- [ ] **ORG-01**: Merge PDF
- [ ] **ORG-02**: Split PDF
- [ ] **ORG-03**: Remove pages
- [ ] **ORG-04**: Extract pages
- [ ] **ORG-05**: Organize (reorder) pages

### Images (sync)

- [ ] **IMG-01**: PDF to JPG/PNG
- [ ] **IMG-02**: JPG/PNG to PDF

### Jobs (async)

- [ ] **JOB-01**: Enqueue heavy jobs to BullMQ
- [ ] **JOB-02**: Poll job status until complete
- [ ] **JOB-03**: Worker processes jobs and updates DB
- [ ] **JOB-04**: Presigned download URL on completion
- [ ] **JOB-05**: Failed jobs show user-friendly errors
- [ ] **JOB-06**: Expired files cleaned from storage and DB

### Optimize

- [ ] **OPT-01**: Compress PDF
- [ ] **OPT-02**: PDF to PDF/A
- [ ] **OPT-03**: Repair PDF (best-effort)

### Convert

- [ ] **CONV-01**: PDF to Word
- [ ] **CONV-02**: PDF to PowerPoint
- [ ] **CONV-03**: PDF to Excel
- [ ] **CONV-04**: Word to PDF
- [ ] **CONV-05**: PowerPoint to PDF
- [ ] **CONV-06**: Excel to PDF
- [ ] **CONV-07**: HTML to PDF
- [ ] **CONV-08**: Image to Word (OCR)

### Edit & Security

- [ ] **EDIT-01**: Rotate PDF
- [ ] **EDIT-02**: Crop PDF
- [ ] **EDIT-03**: Add page numbers
- [ ] **EDIT-04**: Watermark
- [ ] **EDIT-05**: Redact (basic)
- [ ] **EDIT-06**: Sign PDF (image overlay)
- [ ] **SEC-01**: Protect PDF (password)
- [ ] **SEC-02**: Unlock PDF

### Intelligence

- [ ] **INT-01**: OCR to searchable PDF
- [ ] **INT-02**: Compare PDF

### Polish

- [ ] **POL-01**: Per-tool SEO metadata
- [ ] **POL-02**: Optional guest job history (session)
- [ ] **POL-03**: Health check endpoint
- [ ] **POL-04**: Deploy documentation
- [ ] **POL-05**: All registry tools enabled

## v2 Requirements

### Payments

- **PAY-01**: Stripe subscriptions and usage tiers
- **PAY-02**: Premium limits and ad-free experience

### Auth

- **AUTH-01**: Email signup and job history
- **AUTH-02**: OAuth (Google)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Stripe v1 | User chose free-only launch |
| Mobile apps | Web-first |
| Cloud drive import | Complexity deferred |
| Legal e-sign | Image overlay only in v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-* | 1 | Pending |
| UI-* | 1 | Pending |
| ORG-*, IMG-*, EDIT-01 | 2 | Pending |
| JOB-* | 3 | Pending |
| OPT-* | 4 | Pending |
| CONV-* | 5 | Pending |
| EDIT-*, SEC-* | 6 | Pending |
| INT-* | 7 | Pending |
| POL-* | 8 | Pending |

---
*Requirements defined: 2026-05-19*
