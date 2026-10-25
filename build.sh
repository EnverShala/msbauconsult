#!/bin/sh
# Ein-Befehl-Build: laedt den gepinnten Tailwind-Standalone-CLI (falls noetig) und baut assets/css/main.css
set -eu
cd "$(dirname "$0")"

VERSION=v3.4.17
OS=$(uname -s)
ARCH=$(uname -m)
# Gepinnte SHA-256-Hashes (aus sha256sums.txt des Releases v3.4.17, fest hinterlegt)
case "$OS" in
  MINGW*|MSYS*|CYGWIN*)
    ASSET=tailwindcss-windows-x64.exe; BIN=tailwindcss.exe
    PIN=67f1c5e3f5a03406a7bf5badf5ada09b79f3ae78ec43450c15f7e983068da346 ;;
  Linux)
    BIN=tailwindcss
    case "$ARCH" in
      x86_64|amd64)
        ASSET=tailwindcss-linux-x64
        PIN=7d24f7fa191d2193b78cd5f5a42a6093e14409521908529f42d80b11fde1f1d4 ;;
      aarch64|arm64)
        ASSET=tailwindcss-linux-arm64
        PIN=69b1378b8133192d7d2feb12a116fa12d035594f58db3eff215879e4ad8cf39b ;;
      *) echo "Nicht unterstuetzte CPU-Architektur: $ARCH (Linux)" >&2; exit 1 ;;
    esac ;;
  Darwin)
    BIN=tailwindcss
    case "$ARCH" in
      x86_64)
        ASSET=tailwindcss-macos-x64
        PIN=6cbdad74be776c087ffa5e9a057512c54898f9fe8828d3362212dfe32fc933a3 ;;
      arm64)
        ASSET=tailwindcss-macos-arm64
        PIN=a1d0c7985759accca0bf12e51ac1dcbf0f6cf2fffb62e6e0f62d091c477a10a3 ;;
      *) echo "Nicht unterstuetzte CPU-Architektur: $ARCH (macOS)" >&2; exit 1 ;;
    esac ;;
  *) echo "Nicht unterstuetztes System: $OS" >&2; exit 1 ;;
esac

hash_of() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1
  else shasum -a 256 "$1" | cut -d' ' -f1; fi
}

# Vorhandene Binaerdatei vor jeder Nutzung pruefen; bei Abweichung verwerfen und neu laden
if [ -f "$BIN" ] && [ "$(hash_of "$BIN")" != "$PIN" ]; then
  echo "Vorhandenes $BIN hat falschen Hash - wird verworfen." >&2
  rm -f "$BIN"
fi

if [ ! -f "$BIN" ]; then
  BASE="https://github.com/tailwindlabs/tailwindcss/releases/download/$VERSION"
  TMP="$BIN.part"
  trap 'rm -f "$TMP"' EXIT
  echo "Lade $ASSET ($VERSION) ..."
  curl -fsSL -o "$TMP" "$BASE/$ASSET"
  ACTUAL=$(hash_of "$TMP")
  if [ "$ACTUAL" != "$PIN" ]; then
    echo "Pruefsumme stimmt nicht (erwartet $PIN, erhalten $ACTUAL)" >&2
    exit 1
  fi
  chmod +x "$TMP"
  mv "$TMP" "$BIN"
fi

./"$BIN" -i src/input.css -o assets/css/main.css --minify "$@"

# Im Watch-Modus nicht stempeln
case " $* " in *" --watch "*) exit 0 ;; esac

# Cache-Busting: ?v=<sha256[0:8]> von main.css/main.js in index.html eintragen (idempotent)
CSS_V=$(hash_of assets/css/main.css | cut -c1-8)
JS_V=$(hash_of assets/js/main.js | cut -c1-8)
sed -i.bak -E \
  -e "s#/assets/css/main\.css(\?v=[0-9a-f]{8})?\"#/assets/css/main.css?v=$CSS_V\"#g" \
  -e "s#/assets/js/main\.js(\?v=[0-9a-f]{8})?\"#/assets/js/main.js?v=$JS_V\"#g" \
  index.html
rm -f index.html.bak
