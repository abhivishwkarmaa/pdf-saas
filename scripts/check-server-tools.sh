#!/usr/bin/env sh
set -e

missing=""

check() {
  bin="$1"
  if ! command -v "$bin" >/dev/null 2>&1; then
    missing="$missing $bin"
  fi
}

check soffice
check gs
check qpdf
check pdftoppm
check tesseract

if [ -n "$missing" ]; then
  echo "Missing required server CLI tools:$missing"
  echo ""
  echo "If you have Docker:"
  echo "  npm run docker:build && npm run docker:up"
  echo ""
  echo "If you want to install on host (macOS):"
  echo "  npm run setup:mac"
  echo ""
  echo "Or with Homebrew:"
  echo "  brew install libreoffice ghostscript qpdf poppler tesseract"
  exit 1
fi

echo "Server CLI tools OK (soffice, gs, qpdf, pdftoppm, tesseract)."

