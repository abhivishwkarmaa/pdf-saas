#!/usr/bin/env sh
set -e

echo "Installing PDF SaaS CLI tools via Homebrew (for npm run dev on Mac)..."

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew not found. Install from https://brew.sh then run this script again."
  exit 1
fi

brew install libreoffice ghostscript qpdf poppler tesseract

echo ""
echo "Done. Verify:"
echo "  which soffice gs qpdf pdftoppm tesseract"
echo ""
echo "Then run: npm run dev"
echo "Health check: curl http://localhost:3000/api/health"
