#!/bin/sh
# Ein-Befehl-Abnahme fuer Phase 3 (vom Projektstamm ausfuehren: sh tools/verify.sh)
set -u
cd "$(dirname "$0")/.."

FAILS=0
REVIEW=.planning/phases/03-interaktion/review

pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; FAILS=$((FAILS + 1)); }
check() { # check <name> <command...>
  name=$1; shift
  if "$@"; then pass "$name"; else fail "$name"; fi
}

# 1. build
check build sh build.sh

# 2. SEC-02: kein Inline-Code (JSON-LD ist ein Datenblock, kein ausfuehrbares Script)
sec02() {
  n=$(grep -ciE '<style|style=| on[a-z]+=|data-lucide' index.html)
  [ "$n" -eq 0 ] || { echo "  inline-treffer: $n"; return 1; }
  bad=$(grep -i '<script' index.html | grep -v 'src=' | grep -vc 'application/ld+json')
  [ "$bad" -eq 0 ] || { echo "  inline-script: $bad"; return 1; }
}
check static-sec02 sec02

# 3. keine externen Referenzen
external() {
  n=$(cat index.html assets/css/main.css assets/js/main.js | grep -ciE 'cdn\.tailwindcss|unpkg|googleapis|gstatic|unsplash')
  [ "$n" -eq 0 ] || { echo "  externe hosts: $n"; return 1; }
  # Lizenzkommentar von Tailwind (/*! ... */) ist keine Anfrage und wird vorher entfernt
  # Erlaubt: SVG-Namespace, eigene Domain (canonical/OG/JSON-LD), schema.org-Kontext
  urls=$(sed 's#/\*![^*]*\*/##' assets/css/main.css | cat index.html - assets/js/main.js | grep -ohE "https?://[^\"' )]+" | grep -v '^http://www.w3.org/2000/svg$' | grep -vE '^https://heizreport\.de/(js/heizreport_3\.js|datenschutz)$' | grep -vE '^https://(www\.ms-bauconsult\.de(/|$)|schema\.org$)' || true)
  [ -z "$urls" ] || { echo "  fremde URLs: $urls"; return 1; }
}
check static-external external

# 4. final.html unveraendert
FINAL_SHA=df448ef592d70447b5b68ca11fa38c79ee1547d8ba263dbc55753ae06116fc1f
sha_of() { if command -v sha256sum >/dev/null 2>&1; then sha256sum | cut -d' ' -f1; else shasum -a 256 | cut -d' ' -f1; fi; }
# Zeilenenden (CRLF/LF) werden vor dem Hash normalisiert
untouched() { [ "$(tr -d '\r' < final.html | sha_of)" = "$FINAL_SHA" ]; }
check final-untouched untouched

# 5. CONT-08: keine Platzhalter-Reste
placeholder() {
  hits=$(grep -rniE 'von berg|chastain|vbc|megastruktur|megastruct|statik-rechner|prüfingenieur|iso 9001|civil engineering|tragwerk|calculator|area-input|floors-input|type-input|result-score|slate-400' index.html src assets/js assets/css/main.css || true)
  [ -z "$hits" ] || { echo "$hits"; return 1; }
  [ ! -e assets/img/portrait.webp ] || { echo "  assets/img/portrait.webp existiert"; return 1; }
  [ ! -e ./muhamedshala.jpg ] || { echo "  muhamedshala.jpg existiert"; return 1; }
}
check placeholder placeholder

# 5b. Phase 3 statisch: Pfade, .htaccess, robots/sitemap, Honeypot, Zeichenlaengen
phase3static() {
  rc=0
  [ -z "$(grep -oE '[" ,]assets/|href="favicon' index.html)" ] || { echo "  index.html: nicht root-relative Pfade"; rc=1; }
  ! grep -q '<base' index.html || { echo "  index.html: <base> vorhanden"; rc=1; }
  grep -q 'THE_REQUEST' .htaccess || { echo "  .htaccess: THE_REQUEST fehlt"; rc=1; }
  grep -qF 'RewriteRule ^(impressum|datenschutz)/?$' .htaccess || { echo "  .htaccess: Rewrite fuer Rechtstexte fehlt"; rc=1; }
  grep -q 'www.ms-bauconsult.de' .htaccess || { echo "  .htaccess: www-Ziel fehlt"; rc=1; }
  for f in robots.txt sitemap.xml; do
    grep -q 'https://www.ms-bauconsult.de/' "$f" || { echo "  $f: www-URL fehlt"; rc=1; }
    ! grep -q 'https://ms-bauconsult.de' "$f" || { echo "  $f: non-www-URL"; rc=1; }
  done
  grep -q 'hp_website' index.html || { echo "  index.html: hp_website fehlt"; rc=1; }
  [ "$(grep -E '(^|[^_])strlen\(' sendMail.php | grep -vc function_exists)" -eq 0 ] || { echo "  sendMail.php: strlen( ausserhalb des Helpers"; rc=1; }
  return $rc
}
check static-phase3 phase3static

# 6. Struktur
check structure node tools/structcheck.mjs index.html

# 7. Computed Styles (nur Vergleich, nie --record)
check styles node tools/stylecheck.mjs index.html

# 8. Layout / Portrait-Crops
rm -rf "$REVIEW/portrait"
check layout node tools/layoutcheck.mjs index.html "$REVIEW/portrait"

# 9. Netzwerk, Motion
check network node tools/netcheck.mjs index.html
check motion node tools/motioncheck.mjs index.html
check interact node tools/interactcheck.mjs

# 10. Capture (Review-Material, kein Pixelvergleich)
rm -rf "$REVIEW/full"; mkdir -p "$REVIEW/full"
check capture node tools/shoot.mjs index.html "$REVIEW/full" page

# 11. Groessen (informativ)
echo "--- sizes (bytes / gzip -9) ---"
for f in index.html assets/css/main.css assets/js/main.js assets/fonts/*.woff2 assets/img/*.avif assets/img/*.webp assets/img/*.jpg assets/img/*.png; do
  [ -f "$f" ] && echo "$f $(wc -c < "$f" | tr -d ' ') $(gzip -9 -c "$f" | wc -c | tr -d ' ')"
done

if [ "$FAILS" -eq 0 ]; then echo "ALL PASS"; exit 0; else echo "$FAILS FAILED"; exit 1; fi
