#!/usr/bin/env sh
# Install Docker Compose V2 CLI plugin when `docker compose` is missing.
# Legacy standalone `docker-compose` v1.x is incompatible with Docker Engine 25+.
set -e

compose_ok() {
  docker compose version >/dev/null 2>&1
}

if compose_ok; then
  echo "Docker Compose V2 plugin is already available:"
  docker compose version
  exit 0
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker CLI is not installed."
  echo "Install Docker Engine or Docker Desktop, then run this script again."
  exit 1
fi

OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Linux) PLATFORM=linux ;;
  Darwin) PLATFORM=darwin ;;
  *)
    echo "Unsupported OS for automatic Compose plugin install: $OS"
    echo "Install manually: https://docs.docker.com/compose/install/"
    exit 1
    ;;
esac

case "$ARCH" in
  x86_64 | amd64) ARCH_TAG=x86_64 ;;
  aarch64 | arm64) ARCH_TAG=aarch64 ;;
  *)
    echo "Unsupported CPU architecture: $ARCH"
    exit 1
    ;;
esac

COMPOSE_VERSION="${DOCKER_COMPOSE_VERSION:-v2.32.4}"
PLUGIN_DIR="${DOCKER_CLI_PLUGIN_DIR:-$HOME/.docker/cli-plugins}"
PLUGIN_PATH="$PLUGIN_DIR/docker-compose"
BINARY_NAME="docker-compose-${PLATFORM}-${ARCH_TAG}"
URL="https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/${BINARY_NAME}"

mkdir -p "$PLUGIN_DIR"

if command -v curl >/dev/null 2>&1; then
  echo "Downloading Compose plugin ${COMPOSE_VERSION} from GitHub..."
  curl -fsSL "$URL" -o "$PLUGIN_PATH"
elif command -v wget >/dev/null 2>&1; then
  echo "Downloading Compose plugin ${COMPOSE_VERSION} from GitHub..."
  wget -qO "$PLUGIN_PATH" "$URL"
else
  echo "Neither curl nor wget is available. Install curl and retry."
  exit 1
fi

chmod +x "$PLUGIN_PATH"

if compose_ok; then
  echo "Compose plugin installed at $PLUGIN_PATH"
  docker compose version
  exit 0
fi

echo "Plugin saved to $PLUGIN_PATH but 'docker compose' is still unavailable."
echo "Ensure Docker Engine is installed and your user can run 'docker info'."
exit 1
