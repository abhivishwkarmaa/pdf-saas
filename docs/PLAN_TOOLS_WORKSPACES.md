# Tools & Workspaces Master Plan — The iLovePDF Quality Standard

> **Core Objective:** Build a production-grade, 100% open, high-fidelity file conversion platform.  
> **Key Metric:** Every tool works accurately, reliably, and delivers an intuitive, frictionless user experience.  
> **Target Audience:** Public users worldwide (Zero login / Zero signup required).

---

## 1. The iLovePDF User Experience Standard

Every tool in ConvertHub must follow the standardized **4-Step User Journey**:

```
[ Step 1: Select File ]
  • Large, intuitive drag-and-drop dropzone with file picker
  • Clear file format & size limits visible up front
  • File validation with friendly error messages (rejects bad formats immediately)

[ Step 2: Configure & Preview ]
  • Visual thumbnails of uploaded pages or images
  • Simple, sensible default settings pre-selected
  • Interactive controls (drag to reorder pages, rotate individual pages, select quality)

[ Step 3: Process with Clear Feedback ]
  • Immediate visual response upon clicking the action button
  • Real upload progress (XHR progress: 0% → 100%)
  • Honest processing state indicator (pulsing indicator, no frozen fake tickers)

[ Step 4: Instant Result & Download ]
  • Automatic trigger of browser file download immediately upon completion
  • Prominent "Download File" button if auto-download is blocked by browser
  • "Convert Another File" and "Share" options for high user satisfaction
```

---

## 2. Tool-by-Tool Accuracy & Implementation Blueprint

### 2.1 PDF Tools (Core Suite)

| Tool Slug | Execution Mode | Engine / Binary | Accuracy & Feature Requirements |
|---|---|---|---|
| `merge-pdf` | **Client (Browser)** | `pdf-lib` | • Support up to 50 files.<br>• Drag-and-drop card reordering to change merge sequence.<br>• Preserve all page sizes, orientations, and vector quality.<br>• Instant client-side download without server roundtrip. |
| `split-pdf` | **Client (Browser)** | `pdf-lib` | • Support range syntax: `1-5, 8, 11-13`.<br>• Option to extract all pages into separate PDFs (bundled into ZIP).<br>• Option to merge selected ranges into one PDF. |
| `remove-pages` | **Client (Browser)** | `pdf-lib` + Canvas | • Visual thumbnail grid of all pages.<br>• One-click page selection/unselection with hover trash icon.<br>• Generates clean PDF with selected pages excised. |
| `extract-pages` | **Client (Browser)** | `pdf-lib` + Canvas | • Visual thumbnail grid of all pages.<br>• Click pages to include in the extracted document.<br>• Clean output document generation. |
| `organize-pdf` | **Client (Browser)** | `pdf-lib` + Canvas | • Drag-and-drop reordering of all pages.<br>• Individual page rotation (90° clockwise) and deletion.<br>• Option to insert blank pages. |
| `rotate-pdf` | **Client (Browser)** | `pdf-lib` | • Rotate all pages or selected pages (90°, 180°, 270°).<br>• Visual preview updating in real time. |
| `compress-pdf` | **Server (Heavy)** | Ghostscript (`gs`) | • Presets: Extreme (`/screen`, 72 DPI), Recommended (`/ebook`, 150 DPI), Low Compression (`/printer`, 300 DPI).<br>• Shows estimated and actual file size reduction (e.g. "Saved 65%"). |
| `pdf-to-word` | **Server (Heavy)** | LibreOffice + Python optimizer | • Converts PDF layout into editable `.docx`.<br>• Python optimizer embeds images cleanly and retains paragraph structure.<br>• Scanned PDF detection with OCR fallback. |
| `pdf-to-excel` | **Server (Heavy)** | LibreOffice / Python | • Extracts table boundaries into native `.xlsx` cells.<br>• Multi-page sheet generation. |
| `pdf-to-powerpoint` | **Server (Heavy)** | LibreOffice / pptxgenjs | • Each PDF page rendered as a clean slide in `.pptx`. |
| `word-to-pdf` | **Server (Heavy)** | LibreOffice (`soffice`) | • High-fidelity conversion from `.docx`/`.doc` to vector PDF.<br>• Preserves margins, fonts, and table layouts. |
| `excel-to-pdf` | **Server (Heavy)** | LibreOffice (`soffice`) | • Formats spreadsheets cleanly into printable A4/Letter PDF pages. |
| `powerpoint-to-pdf`| **Server (Heavy)** | LibreOffice (`soffice`) | • Converts `.pptx`/`.ppt` slide decks into full-page PDF presentations. |
| `ocr-pdf` | **Server (Heavy)** | Tesseract OCR + Poppler | • Multi-language OCR recognition (English, Spanish, French, German, etc.).<br>• Generates searchable PDF with invisible selectable text layer over scans. |
| `pdf-to-jpg` / `pdf-to-png` | **Hybrid** | Poppler (`pdftoppm`) / Canvas | • High-resolution page rendering (150 / 300 DPI).<br>• Mode: Convert entire pages vs Extract embedded raw images.<br>• Single image downloads directly; multiple images download as a clean ZIP. |
| `watermark-pdf` | **Client (Browser)** | `pdf-lib` | • Text watermark: customizable text, font size, opacity (10-100%), rotation (45°), color.<br>• Image watermark: upload transparent PNG logo and place on all pages. |
| `page-numbers` | **Client (Browser)** | `pdf-lib` | • Position presets: Bottom Right, Bottom Center, Bottom Left, Top Right.<br>• Format options: `1, 2, 3`, `Page 1 of N`, `p. 1`.<br>• Customizable font size and margin distance. |
| `protect-pdf` | **Server / Client** | `qpdf` / `pdf-lib` | • 128-bit/256-bit AES encryption with user-provided password.<br>• Disallows unauthorized opening without password. |
| `unlock-pdf` | **Server / Client** | `qpdf` / `pdf-lib` | • Strips password protection when user enters the correct password. |
| `repair-pdf` | **Server (Heavy)** | Ghostscript (`gs`) | • Rebuilds corrupted PDF cross-reference tables (XREF) and streams. |
| `pdf-to-pdfa` | **Server (Heavy)** | Ghostscript (`gs`) | • Conformance profiles: PDF/A-1b and PDF/A-2b for long-term archiving. |
| `sign-pdf` | **Client (Browser)** | Canvas + `pdf-lib` | • Draw signature on canvas, type signature, or upload signature image.<br>• Drag signature onto target page, resize, and bake permanently into PDF. |
| `redact-pdf` | **Client (Browser)** | Canvas + `pdf-lib` | • Draw black redaction boxes over confidential text/data.<br>• Permanently removes content underneath. |
| `compare-pdf` | **Server (Heavy)** | Pixelmatch / Poppler | • Compares two PDF revisions side-by-side and highlights visual changes in red/cyan. |
| `html-to-pdf` | **Server (Heavy)** | Headless Chromium | • **SSRF Protected** ([url-guard.ts](file:///c:/MAJOR%20PROJECTS/pdf-saas/apps/web/src/lib/server/url-guard.ts)).<br>• Full CSS3 Flexbox/Grid support, custom fonts, A4/Letter margins. |

---

### 2.2 Image Tools

| Tool Slug | Execution Mode | Engine | Accuracy & Feature Requirements |
|---|---|---|---|
| `compress-image` | **Client (Browser)** | Canvas / Browser API | • Interactive quality slider (1-100%).<br>• Real-time file size comparison (Before vs After).<br>• Lossless mode for PNG; lossy compression for JPEG/WebP. |
| `resize-image` | **Client (Browser)** | Canvas | • Aspect ratio lock toggle.<br>• Pixel dimensions vs percentage scaling.<br>• Social media presets: Instagram Square (1080x1080), Story (1080x1920), YouTube (1280x720), Passport (600x600).<br>• High-quality bicubic interpolation. |
| `crop-image` | **Client (Browser)** | Canvas | • Visual draggable crop rectangle.<br>• Preset ratios: Free, 1:1, 16:9, 4:3, 9:16.<br>• Pixel readout of crop dimensions. |
| `rotate-image` | **Client (Browser)** | Canvas | • 90° clockwise/counter-clockwise rotation and horizontal/vertical flips. |
| `jpg-to-png` / `png-to-jpg` | **Client (Browser)** | Canvas | • Instant lossless or lossy format conversion with white background fallback for JPEG. |
| `jpg-to-webp` / `webp-to-jpg` | **Client (Browser)** | Canvas | • Next-gen WebP conversion with adjustable quality. |
| `jpg-to-image` | **Hybrid** | Canvas + Server Sharp | • **Fix Applied:** True BMP binary header generator for client-side BMP exports; server Sharp for AVIF. Eliminates corrupt PNG-disguised downloads. |
| `image-to-pdf` | **Client (Browser)** | `pdf-lib` + Canvas | • Combine multiple photos into single PDF or ZIP of individual PDFs.<br>• Orientation (Auto / Portrait / Landscape), Page Size (A4 / Letter / Fit Image), Margins (None / Small / Large). |
| `heic-to-jpg` | **Server (Heavy)** | `heic-convert` + Sharp | • Converts Apple iPhone `.heic`/`.heif` photos into universally viewable `.jpg`. |

---

### 2.3 Text, Developer & Calculator Tools

| Category | Tools | Execution Mode | Requirements |
|---|---|---|---|
| **Text** | `txt-to-pdf`, `markdown-to-pdf`, `markdown-to-word` | Hybrid / LibreOffice | • Clean typography, line wrapping, code syntax styling, table rendering. |
| **Developer** | `json-formatter`, `base64-encode/decode`, `url-encode/decode`, `hash-generator` | **Client (Browser)** | • 100% private in-browser execution. Zero server logging.<br>• Monaco editor for JSON; instant SHA-256/MD5 hashing. |
| **Calculator** | `percentage-calculator`, `age-calculator`, `bmi-calculator`, `unit-converter` | **Client (Browser)** | • Instant real-time calculation as user types. Mobile-responsive inputs. |

---

## 3. High-Priority Workspace Fixes for Production Quality

### Fix 1: Eliminate External CDN Dependencies
- **Issue:** Several PDF workspaces (`PdfToImageWorkspace`, `OrganizePdfWorkspace`) inject external scripts from `cdnjs.cloudflare.com` dynamically into the DOM.
- **Production Solution:**
  - Bundle `pdf.js` and `pdf.worker.min.js` locally in `apps/web/public/vendor/pdfjs/` or use npm package `pdfjs-dist`.
  - Ensures 100% offline functionality, zero CDN failure risk, and faster initial load.

### Fix 2: Real Upload Progress & Honest Processing States
- **Issue:** `ServerToolWorkspace.tsx` simulated progress with a `setInterval` incrementing by 1-3% every 350ms, freezing at 95% on long conversions.
- **Production Solution:**
  - Track real upload percentage using `xhr.upload.onprogress`.
  - Once upload hits 100%, transition to an active indeterminate status: *"Processing document on server... (may take up to 30 seconds for complex files)"*.
  - Trigger download immediately when server responds.

### Fix 3: Image Conversion Format Fidelity
- **Issue:** Browser Canvas cannot encode `.bmp` or `.avif`, silently returning PNG data with a `.bmp` or `.avif` file extension.
- **Production Solution:**
  - Implement a 54-byte BMP header generator to produce authentic uncompressed Windows BMP files.
  - Route AVIF requests through the Sharp server handler (`/api/process/avif-to-jpg`).
