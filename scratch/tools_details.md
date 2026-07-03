# Project Tools Details Registry

| Name | Category | Type | Tier | Enabled | Phase | Status | Tested | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Merge PDF** (merge-pdf) | PDF | Browser (Client) | SYNC | Yes | Phase 2 | Working | Tested | Fully client-side (no server request). |
| **Split PDF** (split-pdf) | PDF | Browser (Client) | SYNC | Yes | Phase 2 | Working | Tested | Fully client-side (no server request). |
| **Remove Pages** (remove-pages) | PDF | Browser (Client) | SYNC | Yes | Phase 2 | Working | Tested | Fully client-side (no server request). |
| **Extract Pages** (extract-pages) | PDF | Browser (Client) | SYNC | Yes | Phase 2 | Working | Tested | Fully client-side (no server request). |
| **Organize PDF** (organize-pdf) | PDF | Browser (Client) | SYNC | Yes | Phase 2 | Working | Tested | Fully client-side (no server request). |
| **Rotate PDF** (rotate-pdf) | PDF | Browser (Client) | SYNC | Yes | Phase 2 | Working | Tested | Fully client-side (no server request). |
| **PDF to JPG** (pdf-to-jpg) | PDF | Server (Heavy) | SYNC | Yes | Phase 2 | Working | Tested (with docker) | Requires system binaries: Poppler (pdftoppm). Runs inside docker. |
| **PDF to PNG** (pdf-to-png) | PDF | Server (Heavy) | SYNC | Yes | Phase 2 | Working | Tested (with docker) | Requires system binaries: Poppler (pdftoppm). Runs inside docker. |
| **JPG to PDF** (jpg-to-pdf) | PDF | Browser (Client) | SYNC | Yes | Phase 2 | Working | Tested | Fully client-side (no server request). |
| **PNG to PDF** (png-to-pdf) | PDF | Browser (Client) | SYNC | Yes | Phase 2 | Working | Tested | Fully client-side (no server request). |
| **Compress PDF** (compress-pdf) | PDF | Server (Heavy) | ASYNC | Yes | Phase 4 | Working | Tested (with docker) | Requires system binaries: Ghostscript (gs). Runs inside docker. |
| **PDF to PDF/A** (pdf-to-pdfa) | PDF | Server (Heavy) | ASYNC | Yes | Phase 4 | Working | Tested (with docker) | Requires system binaries: Ghostscript (gs). Runs inside docker. |
| **Repair PDF** (repair-pdf) | PDF | Server (Heavy) | ASYNC | Yes | Phase 4 | Working | Tested (with docker) | Requires system binaries: Ghostscript (gs). Runs inside docker. |
| **PDF to Word** (pdf-to-word) | PDF | Server (Heavy) | ASYNC | Yes | Phase 5 | Working | Tested (with docker) | Requires system binaries: LibreOffice (soffice). Runs inside docker. |
| **PDF to PowerPoint** (pdf-to-powerpoint) | PDF | Server (Heavy) | ASYNC | Yes | Phase 5 | Working | Tested (with docker) | Requires system binaries: LibreOffice (soffice). Runs inside docker. |
| **PDF to Excel** (pdf-to-excel) | PDF | Server (Heavy) | ASYNC | Yes | Phase 5 | Working | Tested (with docker) | Requires system binaries: LibreOffice (soffice). Runs inside docker. |
| **Word to PDF** (word-to-pdf) | PDF | Server (Heavy) | ASYNC | Yes | Phase 5 | Working | Tested (with docker) | Requires system binaries: LibreOffice (soffice). Runs inside docker. |
| **PowerPoint to PDF** (powerpoint-to-pdf) | PDF | Server (Heavy) | ASYNC | Yes | Phase 5 | Working | Tested (with docker) | Requires system binaries: LibreOffice (soffice). Runs inside docker. |
| **Excel to PDF** (excel-to-pdf) | PDF | Server (Heavy) | ASYNC | Yes | Phase 5 | Working | Tested (with docker) | Requires system binaries: LibreOffice (soffice). Runs inside docker. |
| **HTML to PDF** (html-to-pdf) | PDF | Server (Heavy) | ASYNC | Yes | Phase 5 | Working | Tested (with docker) | Requires server runtime environment. |
| **PDF to Text** (pdf-to-text) | PDF | Server (Heavy) | SYNC | Yes | Phase 2 | Working | Tested (with docker) | Requires server runtime environment. |
| **Watermark PDF** (watermark-pdf) | PDF | Browser (Client) | SYNC | Yes | Phase 6 | Working | Tested | Fully client-side (no server request). |
| **Add Page Numbers** (page-numbers) | PDF | Browser (Client) | SYNC | Yes | Phase 6 | Working | Tested | Fully client-side (no server request). |
| **Crop PDF** (crop-pdf) | PDF | Browser (Client) | SYNC | Yes | Phase 6 | Working | Tested | Fully client-side (no server request). |
| **Redact PDF** (redact-pdf) | PDF | Browser (Client) | SYNC | Yes | Phase 6 | Working | Tested | Allows basic redaction by drawing black rectangles. |
| **Sign PDF** (sign-pdf) | PDF | Browser (Client) | SYNC | Yes | Phase 6 | Working | Tested | Browser-based canvas signature placement. |
| **Protect PDF** (protect-pdf) | PDF | Server (Heavy) | SYNC | Yes | Phase 6 | Working | Tested (with docker) | Requires server runtime environment. |
| **Unlock PDF** (unlock-pdf) | PDF | Server (Heavy) | SYNC | Yes | Phase 6 | Working | Tested (with docker) | Requires server runtime environment. |
| **OCR PDF** (ocr-pdf) | PDF | Server (Heavy) | ASYNC | Yes | Phase 7 | Working | Tested (with docker) | Requires system binaries: Tesseract OCR (tesseract). Runs inside docker. |
| **Compare PDF** (compare-pdf) | PDF | Server (Heavy) | ASYNC | Yes | Phase 7 | Working | Tested (with docker) | Requires server runtime environment. |
| **Image to Word** (image-to-word) | PDF | Server (Heavy) | ASYNC | Yes | Phase 5 | Working | Tested (with docker) | Requires system binaries: Tesseract OCR (tesseract). Runs inside docker. |
| **Scan to PDF** (scan-to-pdf) | PDF | Browser (Client) | SYNC | Yes | Phase 2 | Working | Tested | Fully client-side (no server request). |
| **Compress Image** (compress-image) | IMAGE | Browser (Client) | SYNC | Yes | Phase 2 | Working | Tested | Fully client-side (no server request). |
| **Resize Image** (resize-image) | IMAGE | Browser (Client) | SYNC | Yes | Phase 2 | Working | Tested | Fully client-side (no server request). |
| **Crop Image** (crop-image) | IMAGE | Browser (Client) | SYNC | Yes | Phase 2 | Working | Tested | Fully client-side (no server request). |
| **Rotate Image** (rotate-image) | IMAGE | Browser (Client) | SYNC | Yes | Phase 2 | Working | Tested | Fully client-side (no server request). |
| **JPG to PNG** (jpg-to-png) | IMAGE | Browser (Client) | SYNC | Yes | Phase 2 | Working | Tested | Fully client-side (no server request). |
| **PNG to JPG** (png-to-jpg) | IMAGE | Browser (Client) | SYNC | Yes | Phase 2 | Working | Tested | Fully client-side (no server request). |
| **WebP to JPG** (webp-to-jpg) | IMAGE | Browser (Client) | SYNC | Yes | Phase 2 | Working | Tested | Fully client-side (no server request). |
| **JPG to WebP** (jpg-to-webp) | IMAGE | Browser (Client) | SYNC | Yes | Phase 2 | Working | Tested | Fully client-side (no server request). |
| **HEIC to JPG** (heic-to-jpg) | IMAGE | Server (Heavy) | SYNC | Yes | Phase 2 | Working | Tested (with docker) | Requires server runtime environment. |
| **GIF to PNG** (gif-to-png) | IMAGE | Browser (Client) | SYNC | Yes | Phase 2 | Working | Tested | Fully client-side (no server request). |
| **BMP to JPG** (bmp-to-jpg) | IMAGE | Browser (Client) | SYNC | Yes | Phase 2 | Working | Tested | Fully client-side (no server request). |
| **SVG to PNG** (svg-to-png) | IMAGE | Server (Heavy) | ASYNC | Yes | Phase 2 | Working | Tested (with docker) | Requires server runtime environment. |
| **AVIF to JPG** (avif-to-jpg) | IMAGE | Server (Heavy) | SYNC | Yes | Phase 2 | Working | Tested (with docker) | Requires server runtime environment. |
| **Image to PDF** (image-to-pdf) | IMAGE | Browser (Client) | SYNC | Yes | Phase 2 | Working | Tested | Fully client-side (no server request). |
| **Text to PDF** (txt-to-pdf) | TEXT | Browser (Client) | SYNC | Yes | Phase 5 | Working | Tested | Fully client-side (no server request). |
| **Markdown to PDF** (markdown-to-pdf) | TEXT | Server (Heavy) | ASYNC | Yes | Phase 5 | Working | Tested (with docker) | Requires system binaries: LibreOffice (soffice). Runs inside docker. |
| **Markdown to Word** (markdown-to-word) | TEXT | Server (Heavy) | ASYNC | Yes | Phase 5 | Working | Tested (with docker) | Requires system binaries: LibreOffice (soffice). Runs inside docker. |
| **RTF to PDF** (rtf-to-pdf) | TEXT | Server (Heavy) | ASYNC | Yes | Phase 5 | Working | Tested (with docker) | Requires system binaries: LibreOffice (soffice). Runs inside docker. |
| **LaTeX to Word** (tex-to-word) | TEXT | Server (Heavy) | ASYNC | Yes | Phase 5 | Working | Tested (with docker) | Requires system binaries: LibreOffice (soffice). Runs inside docker. |
| **Pages to Word** (pages-to-word) | TEXT | Server (Heavy) | ASYNC | Yes | Phase 5 | Working | Tested (with docker) | Requires system binaries: LibreOffice (soffice). Runs inside docker. |
| **EPUB to PDF** (epub-to-pdf) | TEXT | Server (Heavy) | ASYNC | Yes | Phase 5 | Working | Tested (with docker) | Requires system binaries: LibreOffice (soffice). Runs inside docker. |
| **JSON Formatter** (json-formatter) | DEVELOPER | Utility (Client) | SYNC | Yes | Phase 8 | Working | Tested | Pure local browser calculations / utilities. |
| **Base64 Encode** (base64-encode) | DEVELOPER | Utility (Client) | SYNC | Yes | Phase 8 | Working | Tested | Pure local browser calculations / utilities. |
| **Base64 Decode** (base64-decode) | DEVELOPER | Utility (Client) | SYNC | Yes | Phase 8 | Working | Tested | Pure local browser calculations / utilities. |
| **URL Encode** (url-encode) | DEVELOPER | Utility (Client) | SYNC | Yes | Phase 8 | Working | Tested | Pure local browser calculations / utilities. |
| **URL Decode** (url-decode) | DEVELOPER | Utility (Client) | SYNC | Yes | Phase 8 | Working | Tested | Pure local browser calculations / utilities. |
| **Hash Generator** (hash-generator) | DEVELOPER | Utility (Client) | SYNC | Yes | Phase 8 | Working | Tested | Pure local browser calculations / utilities. |
| **Percentage Calculator** (percentage-calculator) | CALCULATOR | Utility (Client) | SYNC | Yes | Phase 8 | Working | Tested | Pure local browser calculations / utilities. |
| **Age Calculator** (age-calculator) | CALCULATOR | Utility (Client) | SYNC | Yes | Phase 8 | Working | Tested | Pure local browser calculations / utilities. |
| **BMI Calculator** (bmi-calculator) | CALCULATOR | Utility (Client) | SYNC | Yes | Phase 8 | Working | Tested | Pure local browser calculations / utilities. |
| **Unit Converter** (unit-converter) | CALCULATOR | Utility (Client) | SYNC | Yes | Phase 8 | Working | Tested | Pure local browser calculations / utilities. |
| **Image Editor** (image-editor) | IMAGE | Browser (Client) | SYNC | Yes | Phase 2 | Working | Tested | Fully client-side (no server request). |
