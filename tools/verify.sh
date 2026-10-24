#!/bin/sh
# Ein-Befehl-Abnahme fuer Phase 1 (vom Projektstamm ausfuehren: sh tools/verify.sh)
set -u
cd "$(dirname "$0")/.."

FAILS=0
BASE=.planning/phases/01-fundament/baseline
OUT=tools/out/new

pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; FAILS=$((FAILS + 1)); }
check() { # check <name> <command...>
  name=$1; shift
  if "$@"; then pass "$name"; else fail "$name"; fi
}

# 1. build
check build sh build.sh

# 2. SEC-02: kein Inline-Code
sec02() {
  n=$(grep -ciE '<style|style=| on[a-z]+=|data-lucide' index.html)
  [ "$n" -eq 0 ] || { echo "  inline-treffer: $n"; return 1; }
  bad=$(grep -i '<script' index.html | grep -vc 'src=')
  [ "$bad" -eq 0 ] || { echo "  inline-script: $bad"; return 1; }
}
check static-sec02 sec02

# 3. keine externen Referenzen
external() {
  n=$(cat index.html assets/css/main.css assets/js/main.js | grep -ciE 'cdn\.tailwindcss|unpkg|googleapis|gstatic|unsplash')
  [ "$n" -eq 0 ] || { echo "  externe hosts: $n"; return 1; }
  # Lizenzkommentar von Tailwind (/*! ... */) ist keine Anfrage und wird vorher entfernt
  urls=$(sed 's#/\*![^*]*\*/##' assets/css/main.css | cat index.html - assets/js/main.js | grep -ohE "https?://[^\"' )]+" | grep -v '^http://www.w3.org/2000/svg$' || true)
  [ -z "$urls" ] || { echo "  fremde URLs: $urls"; return 1; }
}
check static-external external

# 4. final.html unveraendert
FINAL_SHA=df448ef592d70447b5b68ca11fa38c79ee1547d8ba263dbc55753ae06116fc1f
sha_of() { if command -v sha256sum >/dev/null 2>&1; then sha256sum | cut -d' ' -f1; else shasum -a 256 | cut -d' ' -f1; fi; }
# Zeilenenden (CRLF/LF) werden vor dem Hash normalisiert
untouched() { [ "$(tr -d '\r' < final.html | sha_of)" = "$FINAL_SHA" ]; }
check final-untouched untouched

# 5. Pixelvergleich (Toleranz 3/255)
# Veraltete Screenshots entfernen, damit ein fehlgeschlagener Capture nie gegen alte PNGs besteht
PY=${PYTHON:-python3}
command -v "$PY" >/dev/null 2>&1 || PY=python
rm -rf "$OUT"; mkdir -p "$OUT"
check capture node tools/shoot.mjs index.html "$OUT" new
check parity-1440 "$PY" tools/diff.py "$BASE/ref-1440.png" "$OUT/new-1440.png" --tol 3
check parity-375 "$PY" tools/diff.py "$BASE/ref-375.png" "$OUT/new-375.png" --tol 3
check parity-hover "$PY" tools/diff.py "$BASE/ref-hover-1440.png" "$OUT/new-hover-1440.png" --tol 3

# 6. Netzwerk
check network node tools/netcheck.mjs index.html

# 7. Motion
check motion node tools/motioncheck.mjs index.html

# 8. Groessen (informativ)
echo "--- sizes (bytes / gzip -9) ---"
for f in index.html assets/css/main.css assets/js/main.js assets/fonts/*.woff2; do
  [ -f "$f" ] && echo "$f $(wc -c < "$f" | tr -d ' ') $(gzip -9 -c "$f" | wc -c | tr -d ' ')"
done

if [ "$FAILS" -eq 0 ]; then echo "ALL PASS"; exit 0; else echo "$FAILS FAILED"; exit 1; fi
