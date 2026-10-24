#!/bin/sh
# Ein-Befehl-Build: laedt den gepinnten Tailwind-Standalone-CLI (falls noetig) und baut assets/css/main.css
set -eu
cd "$(dirname "$0")"

VERSION=v3.4.17
WIN_SHA=67f1c5e3f5a03406a7bf5badf5ada09b79f3ae78ec43450c15f7e983068da346
OS=$(uname -s)
ARCH=$(uname -m)
case "$OS" in
  MINGW*|MSYS*|CYGWIN*) ASSET=tailwindcss-windows-x64.exe; BIN=tailwindcss.exe ;;
  Linux)
    case "$ARCH" in
      aarch64|arm64) ASSET=tailwindcss-linux-arm64 ;;
      *) ASSET=tailwindcss-linux-x64 ;;
    esac
    BIN=tailwindcss ;;
  Darwin)
    case "$ARCH" in
      arm64) ASSET=tailwindcss-macos-arm64 ;;
      *) ASSET=tailwindcss-macos-x64 ;;
    esac
    BIN=tailwindcss ;;
  *) echo "Nicht unterstuetztes System: $OS" >&2; exit 1 ;;
esac

hash_of() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1
  else shasum -a 256 "$1" | cut -d' ' -f1; fi
}

if [ ! -f "$BIN" ]; then
  BASE="https://github.com/tailwindlabs/tailwindcss/releases/download/$VERSION"
  SUMS=$(mktemp)
  echo "Lade $ASSET ($VERSION) ..."
  curl -fsSL -o "$BIN" "$BASE/$ASSET"
  curl -fsSL -o "$SUMS" "$BASE/sha256sums.txt"
  EXPECTED=$(grep "$ASSET" "$SUMS" | head -n 1 | cut -d' ' -f1)
  rm -f "$SUMS"
  ACTUAL=$(hash_of "$BIN")
  if [ -z "$EXPECTED" ] || [ "$ACTUAL" != "$EXPECTED" ]; then
    rm -f "$BIN"
    echo "Prüfsumme stimmt nicht (erwartet $EXPECTED, erhalten $ACTUAL)" >&2
    exit 1
  fi
  if [ "$ASSET" = "tailwindcss-windows-x64.exe" ] && [ "$ACTUAL" != "$WIN_SHA" ]; then
    rm -f "$BIN"
    echo "Prüfsumme stimmt nicht (gepinnter Hash)" >&2
    exit 1
  fi
  chmod +x "$BIN"
fi

./"$BIN" -i src/input.css -o assets/css/main.css --minify "$@"
