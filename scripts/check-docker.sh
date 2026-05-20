#!/usr/bin/env sh
set -e

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed."
  echo "Install Docker Desktop: https://www.docker.com/products/docker-desktop/"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker is installed but not running."
  echo "Open Docker Desktop, wait until it says \"Docker is running\", then try again."
  exit 1
fi

echo "Docker OK"
