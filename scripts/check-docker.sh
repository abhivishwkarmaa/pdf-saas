#!/usr/bin/env sh
# Pre-flight checks for npm run docker:* — requires Docker Engine + Compose V2 plugin.
# Legacy docker-compose v1.x (Python) fails on Engine 25+ with ContainerConfig KeyErrors.
set -e

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed."
  echo "Install Docker Desktop: https://www.docker.com/products/docker-desktop/"
  echo "Or Docker Engine: https://docs.docker.com/engine/install/"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker is installed but not running (or permission denied)."
  echo "Start Docker Desktop / docker.service, then try again."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose V2 is not available (expected: 'docker compose version')."
  echo "Legacy 'docker-compose' v1 is not supported with modern Docker Engine."
  echo ""
  echo "Install the Compose plugin:"
  echo "  npm run setup:docker"
  echo "Or see https://docs.docker.com/compose/install/linux/"
  exit 1
fi

if command -v docker-compose >/dev/null 2>&1; then
  legacy_ver="$(docker-compose --version 2>/dev/null || true)"
  case "$legacy_ver" in
    *"docker-compose version 1."*|*"docker-compose version 1,"*)
      echo "Warning: legacy docker-compose v1 detected on PATH: $legacy_ver"
      echo "This repo uses 'docker compose' (V2). Do not run the hyphenated binary for deploys."
      ;;
  esac
fi

printf 'Docker OK — %s\n' "$(docker compose version 2>/dev/null | head -n 1)"
