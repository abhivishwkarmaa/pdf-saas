# Backend & Server Processing Plan — Lean Conversion Engine

> **Strategic Directive:** 100% Open Access Platform (No Admin / No Auth Gates)  
> **Key Focus:** Streamlined server processing pipeline, rock-solid security, fast micro-conversion handlers, and lightweight public feedback.

---

## 1. Decommissioning Admin & Auth Overhead

### 1.1 Decommissioned Components
In alignment with the iLovePDF model, all admin authentication components are decommissioned:

| Component | Path | Action |
|---|---|---|
| **Admin Controller** | `apps/api/src/controllers/adminController.ts` | Deprecate & remove. |
| **Auth Controller** | `apps/api/src/controllers/authController.ts` | Deprecate & remove. |
| **Admin Routes** | `apps/api/src/routes/adminRoutes.ts` | Deprecate & remove. |
| **Auth Routes** | `apps/api/src/routes/authRoutes.ts` | Deprecate & remove. |
| **Admin Auth Middleware** | `apps/api/src/middlewares/adminAuth.ts` | Deprecate & remove. |
| **User Model** | `apps/api/src/models/User.ts` | Deprecate & remove. |
| **Admin Seeding Logic** | `apps/api/src/index.ts:90-104` | Remove startup admin credentials logging. |

### 1.2 Benefits of Decommissioning
- **Zero Credential Liability**: No passwords, salts, or JWT tokens are stored or transmitted.
- **Simplified Deployment**: Container does not require admin credentials or session state configuration.
- **Maximum Resources for File Conversion**: Memory and CPU are 100% dedicated to high-speed file processing.

---

## 2. Server Processing Engine Architecture (`apps/web/src/lib/server/`)

The primary server-side workload in ConvertHub is executing heavy file conversion jobs via the Next.js API route:
`POST /api/process/[slug]`

### 2.1 Tool Execution Pipeline

```
Client Upload (Multipart Form Data: File + Options)
       │
       ▼
1. Route Boundary Security
   ├── Payload size check (enforce tool.maxMb)
   ├── Magic-byte verification (reject executables via file-security.ts)
   └── URL Guard (validateSafeUrl for HTML-to-PDF to block private IPs & SSRF)
       │
       ▼
2. Temporary Workspace Allocation
   ├── Unique temp directory: mkdtemp(join(tmpdir(), "tool-XXXXXX"))
   └── Input file writing: writeFile(inputPath, buffer)
       │
       ▼
3. Dedicated Binary Execution
   ├── LibreOffice Headless (soffice --headless --convert-to targetFormat)
   ├── Ghostscript (gs -sDEVICE=pdfwrite -dPDFSETTINGS=/quality)
   ├── Poppler (pdftoppm -png/-jpeg -r DPI / pdfimages -png -j)
   ├── Tesseract OCR (tesseract input output -l eng pdf)
   └── Headless Chromium (puppeteer-core with request interception)
       │
       ▼
4. Output Packaging & Response
   ├── Read output buffer from disk
   ├── Set Content-Type and Content-Disposition attachment headers
   └── Stream binary back to user
       │
       ▼
5. Guaranteed Cleanup (finally block)
   └── rm(tempDir, { recursive: true, force: true }) — 100% disk cleanup
```

---

## 3. Orphaned Code Purge in `apps/web`

### 3.1 Remove Video Presets (`apps/web/src/app/api/presets/route.ts`)
- **Reason:** Remnant from an unrelated video transcoding application. ConvertHub is a PDF and document converter with no video features.
- **Action:** Delete `apps/web/src/app/api/presets/route.ts`.

### 3.2 Remove Mock Prisma (`apps/web/src/lib/server/db.ts`)
- **Reason:** Exports a dummy Prisma object whose `$queryRaw` throws an error.
- **Action:** Remove `apps/web/src/lib/server/db.ts` once dead endpoints are purged.

---

## 4. Lightweight Public Inquiries & Feedback Service

While administrative login is removed, public users still benefit from:
1. **Contact Inquiries (`POST /api/contact`)**: Submit bug reports or general questions.
2. **Feature Feedback (`POST /api/feedback`)**: Submit tool requests or feature suggestions.
3. **Newsletter Subscription (`POST /api/newsletter/subscribe`)**: Subscribe to platform updates.

### Production Hardening for Public Endpoints:
- **Rate Limiting:** Enforce a maximum of 5 submissions per hour per IP address to eliminate spam.
- **HTML Escaping:** All user input in notification emails is passed through `escapeHtml()` to eliminate XSS.
- **Input Sanitization:** Enforce strict field length limits (`maxlength: 5000` for messages, `100` for names).
- **Body Parser Limit:** Restrict JSON body size to `500kb` in Express (`app.use(express.json({ limit: "500kb" }))`).
