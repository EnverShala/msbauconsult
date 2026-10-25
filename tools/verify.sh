#!/bin/sh
# Ein-Befehl-Phase-4-Gesamtabnahme (vom Projektstamm ausfuehren: sh tools/verify.sh)
# Prueft: Build, SEC-02/03 statisch, Header/CSP/Storage (hardencheck), SEO/Struktur (structcheck: Title, Description,
# OG/Twitter, JSON-LD, Ueberschriften, alt, Linktexte, robots/sitemap), Styles, Layout, Netzwerk, Motion, Interaktion,
# Barrierefreiheit (axe 0 Verstoesse in allen Zustaenden, Zielgroesse 2.5.8, Clipping 320-1440, Tastatur-Durchgang),
# Groessenbudget, Lighthouse (Median aus 5).
set -u
cd "$(dirname "$0")/.."

FAILS=0
SKIPPED=0
WARNS=0
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

# 3b. Phase 4 statisch: Header, Kompression, Caching in .htaccess
headers_static() {
  rc=0
  [ "$(grep -c '^ *Header always set Content-Security-Policy' .htaccess)" -eq 1 ] || { echo "  .htaccess: CSP-Zeile nicht genau einmal"; rc=1; }
  for s in "default-src 'none'" "frame-src 'none'" "frame-ancestors 'none'"     'Strict-Transport-Security "max-age=31536000"' 'X-Content-Type-Options "nosniff"'     'X-Frame-Options "DENY"' 'Referrer-Policy "strict-origin-when-cross-origin"' 'Permissions-Policy'     'Cross-Origin-Opener-Policy "same-origin"' BROTLI_COMPRESS DEFLATE; do
    grep -qF -- "$s" .htaccess || { echo "  .htaccess: fehlt: $s"; rc=1; }
  done
  # immutable nur fuer die gestempelten CSS/JS, Schriften/Bilder 30 Tage ohne immutable
  grep -qF '<FilesMatch "\.(css|js)$">' .htaccess || { echo "  .htaccess: FilesMatch css|js fehlt"; rc=1; }
  [ "$(grep -c 'immutable"' .htaccess)" -eq 1 ] || { echo "  .htaccess: immutable nicht genau einmal"; rc=1; }
  grep -qF 'Header set Cache-Control "public, max-age=2592000"' .htaccess || { echo "  .htaccess: 30-Tage-Regel fehlt"; rc=1; }
  [ "$(grep -c 'Header onsuccess unset' .htaccess)" -eq 3 ] || { echo "  .htaccess: Header onsuccess unset != 3"; rc=1; }
  bad=$(grep -v '^ *#' .htaccess | grep -E 'data:|unsafe-eval|preload|interest-cohort|includeSubDomains|Cross-Origin-Embedder-Policy|Cross-Origin-Resource-Policy' || true)
  [ -z "$bad" ] || { echo "  .htaccess: verbotene Direktive: $bad"; rc=1; }
  return $rc
}
check static-headers headers_static

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
  for id in dlg-impressum dlg-datenschutz menu-toggle wp-load wp-consent; do
    grep -q "id=\"$id\"" index.html || { echo "  index.html: id=$id fehlt"; rc=1; }
  done
  ! grep -q '<script src="https://heizreport' index.html || { echo "  index.html: heizreport-Script statisch eingebunden"; rc=1; }
  # heizreport darf in main.js nur im Loader vorkommen (Klick-Handler von #wp-load)
  [ "$(grep -c 'heizreport_3.js' assets/js/main.js)" -eq 1 ] || { echo "  main.js: heizreport_3.js nicht genau einmal"; rc=1; }
  [ "$(grep -n 'heizreport_3.js' assets/js/main.js | cut -d: -f1)" -gt "$(grep -n "wpLoad.addEventListener('click'" assets/js/main.js | cut -d: -f1)" ] || { echo "  main.js: heizreport vor dem Klick-Handler"; rc=1; }
  return $rc
}
check static-phase3 phase3static

# 5c. ?v=-Stempel passen zu den gebauten Dateien; index.html ohne BOM und ohne CR
version_static() {
  rc=0
  c=$(hash_of_file assets/css/main.css | cut -c1-8); j=$(hash_of_file assets/js/main.js | cut -c1-8)
  grep -q "/assets/css/main.css?v=$c\"" index.html || { echo "  index.html: CSS-Stempel passt nicht ($c)"; rc=1; }
  grep -q "/assets/js/main.js?v=$j\"" index.html || { echo "  index.html: JS-Stempel passt nicht ($j)"; rc=1; }
  [ "$(head -c3 index.html | od -An -tx1 | tr -d ' ')" != "efbbbf" ] || { echo "  index.html: BOM"; rc=1; }
  ! grep -q "$(printf '\r')" index.html || { echo "  index.html: CR vorhanden"; rc=1; }
  return $rc
}
hash_of_file() { if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }
check static-version version_static

# 5d. build.ps1 stempelt byte-identisch zu build.sh (PSModulePath leeren: Git-Bash erbt sonst den PowerShell-7-Pfad).
# Start von einer ungestempelten index.html, sonst bestuende die Pruefung auch ohne jeden PS1-Stempel;
# index.html wird in jedem Fall aus der build.sh-Fassung wiederhergestellt.
ps1_parity() {
  mkdir -p tools/out
  cp index.html tools/out/index.sh.html
  grep -qE 'main\.css\?v=[0-9a-f]{8}"' tools/out/index.sh.html && grep -qE 'main\.js\?v=[0-9a-f]{8}"' tools/out/index.sh.html ||
    { echo "  index.html: build.sh-Stempel fehlen"; return 1; }
  sed -E 's#(/assets/(css/main\.css|js/main\.js))\?v=[0-9a-f]{8}"#\1"#g' tools/out/index.sh.html > index.html
  if grep -qE 'main\.(css|js)\?v=' index.html; then
    echo "  Entstempeln fehlgeschlagen"; rc=1
  else
    env -u PSModulePath powershell -NoProfile -ExecutionPolicy Bypass -File build.ps1 >/dev/null 2>&1; rc=$?
    cmp -s index.html tools/out/index.sh.html || { echo "  build.ps1-Stempel weicht von build.sh ab"; rc=1; }
  fi
  cp tools/out/index.sh.html index.html
  return $rc
}
if command -v powershell.exe >/dev/null 2>&1 || command -v powershell >/dev/null 2>&1; then
  check build-ps1-parity ps1_parity
else
  echo "SKIP build-ps1-parity"; SKIPPED=$((SKIPPED + 1))
fi

# 5e. SEC-03 statisch: keine Storage-/Cookie-API in main.js, kein Manifest
sec03_static() {
  n=$(grep -v '^ *//' assets/js/main.js | grep -cE 'localStorage|sessionStorage|document\.cookie|indexedDB|caches\.|serviceWorker')
  [ "$n" -eq 0 ] || { echo "  main.js: Storage-API-Treffer: $n"; return 1; }
  ! grep -qi 'manifest' index.html || { echo "  index.html: manifest-Link"; return 1; }
}
check static-sec03 sec03_static

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
check headers node tools/hardencheck.mjs headers
check csp node tools/hardencheck.mjs csp
check storage node tools/hardencheck.mjs storage
check axe node tools/hardencheck.mjs axe
check targets node tools/hardencheck.mjs targets
check clip node tools/hardencheck.mjs clip
check keyboard node tools/hardencheck.mjs keyboard

# 10. Capture (Review-Material, kein Pixelvergleich)
rm -rf "$REVIEW/full"; mkdir -p "$REVIEW/full"
check capture node tools/shoot.mjs index.html "$REVIEW/full" page

# 11. Groessenbudget (FAIL): HTML+CSS+JS gzip -9 <= 51200 B, inkl. Fonts <= 122880 B
budget() {
  g=0
  for f in index.html assets/css/main.css assets/js/main.js; do g=$((g + $(gzip -9 -c "$f" | wc -c | tr -d ' '))); done
  fonts=0
  for f in assets/fonts/*.woff2; do fonts=$((fonts + $(wc -c < "$f" | tr -d ' '))); done
  t=$((g + fonts))
  echo "  budget html+css+js gzip=$g / 51200"
  echo "  budget +fonts=$t / 122880"
  [ "$g" -le 51200 ] && [ "$t" -le 122880 ]
}
check budget budget
echo "--- sizes (bytes / gzip -9) ---"
for f in index.html assets/css/main.css assets/js/main.js assets/fonts/*.woff2 assets/img/*.avif assets/img/*.webp assets/img/*.jpg assets/img/*.png; do
  [ -f "$f" ] && echo "$f $(wc -c < "$f" | tr -d ' ') $(gzip -9 -c "$f" | wc -c | tr -d ' ')"
done

# 11b. Deploy-Whitelist (dist.sh, Quelle tools/dist-files.txt): alle Whitelist-Dateien vorhanden, sonst nur
# Hero-Bilder; jede von index.html (ohne HTML-Kommentare) und main.css referenzierte Datei liegt in dist/;
# keine Entwicklungsdateien und keine Dotfiles ausser .htaccess
distcheck() {
  sh tools/dist.sh >/dev/null 2>&1 || { echo "  tools/dist.sh fehlgeschlagen"; return 1; }
  rc=0
  for f in $(grep -vE '^[[:space:]]*(#|$)' tools/dist-files.txt | tr -d '\r'); do
    [ -f "dist/$f" ] || { echo "  dist: fehlt $f"; rc=1; }
  done
  extra=$( (cd dist && find . -type f | sed 's#^\./##') | grep -vxF -f tools/dist-files.txt | grep -v '^assets/img/hero/' || true)
  [ -z "$extra" ] || { echo "  dist: nicht in der Whitelist: $extra"; rc=1; }
  missing=$(node -e '
    const fs = require("fs");
    const html = fs.readFileSync("index.html", "utf8").replace(/<!--[\s\S]*?-->/g, "");
    const css = fs.readFileSync("assets/css/main.css", "utf8");
    const refs = new Set([...html.matchAll(/\/(assets\/[^"'"'"'\s,?#)]+|favicon\.svg)/g)].map((m) => m[1]));
    for (const m of css.matchAll(/url\(\.\.\/([^)?#]+)\)/g)) refs.add("assets/" + m[1]);
    console.log([...refs].filter((r) => !fs.existsSync("dist/" + r)).join(" "));
  ')
  [ -z "$missing" ] || { echo "  dist: referenziert, aber nicht deployt: $missing"; rc=1; }
  bad=$(find dist -name '*.md' -o -name 'final.html' -o -path '*/tools/*' -o -path '*/src/*' -o -path '*/preview/*' -o -name '.*' ! -name '.htaccess' -type f)
  [ -z "$bad" ] || { echo "  dist: Entwicklungsdateien: $bad"; rc=1; }
  return $rc
}
check dist distcheck

# 12. Lighthouse (Median aus 5 Laeufen; Exit 3 = Performance 99 = WARN)
if [ "${VERIFY_LIGHTHOUSE:-1}" = "0" ]; then
  echo "SKIP lighthouse"; SKIPPED=$((SKIPPED + 1))
else
  node tools/lighthouse.mjs; rc=$?
  if [ "$rc" -eq 0 ]; then pass lighthouse
  elif [ "$rc" -eq 3 ]; then echo "WARN lighthouse performance median=99"; WARNS=$((WARNS + 1))
  else fail lighthouse; fi
fi

if [ "$FAILS" -ne 0 ]; then echo "$FAILS FAILED"; exit 1; fi
note=""
[ "$WARNS" -eq 0 ] || note="$WARNS WARN"
[ "$SKIPPED" -eq 0 ] || note="${note:+$note, }$SKIPPED SKIPPED"
if [ -z "$note" ]; then echo "ALL PASS"; else echo "ALL PASS ($note)"; fi
exit 0
