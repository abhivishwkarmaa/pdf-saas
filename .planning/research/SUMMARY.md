# Research Summary

## PDF processing

- **Light ops**: `pdf-lib` in Node for merge/split/rotate; `qpdf` CLI for linearize/encrypt when needed
- **Raster**: `poppler-utils` (`pdftoppm`) for PDF→images; `sharp` + pdf-lib for images→PDF
- **Compress/PDF-A**: `ghostscript` profiles (screen, ebook, print)
- **Office**: LibreOffice headless (`soffice --headless --convert-to`)
- **OCR**: Tesseract + poppler preprocessing
- **HTML→PDF**: Puppeteer in worker container

## Architecture

- Next.js API enqueues async jobs; long work in separate Docker worker
- MinIO/S3 presigned uploads; 2h TTL cleanup job
- BullMQ + Redis for queue

## Deployment

- Web: Vercel or Node Docker
- Worker: Fly.io/Railway with full Dockerfile (LibreOffice, poppler, gs, qpdf, tesseract)
