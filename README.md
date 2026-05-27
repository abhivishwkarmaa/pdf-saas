# PDF SaaS

Free online PDF tools: merge, split, compress, convert, OCR, and more.

**Architecture:** no Redis, no database, no persistent file storage.

| Workload | Where it runs |
|----------|----------------|
| Light (merge, split, rotate, image tools, …) | **Browser** (`pdf-lib`, Canvas) |
| Heavy (compress, OCR, office, …) | **Next.js API** — in-memory only, file returned immediately |
| Dev utilities (JSON, base64, calculators) | **Browser** |

## Quick start (local dev)

```bash
cp .env.example apps/web/.env
npm run install:optional
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If you see errors like `Cannot find native binding` from Tailwind `@tailwindcss/oxide`,
reinstall with:

```bash
rm -rf node_modules package-lock.json
npm run install:optional
```

Local `npm run dev` does **not** include LibreOffice unless you install it on your Mac. Use Docker below for full server tools.

## Docker (recommended for server tools)

**Before running:** open **Docker Desktop** and wait until it shows “Docker is running”.

Run commands **without** copying comments from docs:

```bash
npm run docker:build
npm run docker:up
```

If the build fails after changing dependencies, rebuild without cache:

```bash
docker compose build --no-cache
docker compose up -d
```

If you see `connect: no such file or directory` for `docker.sock` → Docker Desktop is not running.

If you see `no such service: min` → you pasted a `# comment` on the same line; run only `npm run docker:build`.

The Docker image includes everything needed for heavy tools:

| Tool | Package |
|------|---------|
| LibreOffice (`soffice`) | Word / Excel / PPT / HTML conversions |
| Ghostscript (`gs`) | PDF compress, PDF/A |
| qpdf | PDF repair |
| Poppler (`pdftoppm`) | OCR |
| Tesseract | OCR, image-to-word |

```bash
# Build and run (first build may take a few minutes)
npm run docker:build
npm run docker:up
```

App: [http://localhost:3000](http://localhost:3000)

Check CLI tools are available:

```bash
curl http://localhost:3000/api/health
# "serverToolsReady": true when LibreOffice, gs, qpdf, etc. are all found
```

View logs:

```bash
npm run docker:logs
```

Stop:

```bash
npm run docker:down
```

## Install CLI on host (without Docker)

Check required server CLI tools are installed:

```bash
npm run tools:check
```

macOS — one command:

```bash
npm run setup:mac
```

Or manually with Homebrew:

```bash
brew install libreoffice ghostscript qpdf poppler tesseract
```

Debian/Ubuntu:

```bash
sudo apt-get install -y ghostscript poppler-utils qpdf tesseract-ocr tesseract-ocr-eng \
  libreoffice-writer libreoffice-calc libreoffice-impress libreoffice-core-nogui
```

## Project structure

| Path | Purpose |
|------|---------|
| `apps/web` | Next.js UI + `/api/process/[slug]` for heavy jobs |
| `packages/shared` | Tool registry + browser vs server classification |
| `Dockerfile` | Production image with Node + all CLI dependencies |

## Privacy

User files are not stored in a database or upload folder. Browser tools never leave the device. Server tools process uploads in memory and stream the result back — nothing is kept after the response.

## License

MIT
# pdf-saas
