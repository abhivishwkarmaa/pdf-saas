#!/usr/bin/env sh
# Install Linux native bindings for Tailwind/lightningcss/sharp inside Docker (arm64 or x64).
set -e

WS="@pdf-saas/web"
ARCH="$(uname -m)"

echo "Installing native npm bindings for $ARCH..."

if [ "$ARCH" = "aarch64" ]; then
  npm install \
    lightningcss-linux-arm64-gnu@1.32.0 \
    "@tailwindcss/oxide-linux-arm64-gnu@4.3.0" \
    "@img/sharp-linux-arm64@0.34.5" \
    "@img/sharp-libvips-linux-arm64@1.2.4" \
    -w "$WS" --no-save --no-audit --no-fund
else
  npm install \
    lightningcss-linux-x64-gnu@1.32.0 \
    "@tailwindcss/oxide-linux-x64-gnu@4.3.0" \
    "@img/sharp-linux-x64@0.34.5" \
    "@img/sharp-libvips-linux-x64@1.2.4" \
    -w "$WS" --no-save --no-audit --no-fund
fi

echo "Native bindings installed."
