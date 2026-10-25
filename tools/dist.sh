#!/bin/sh
# Deploy-Hilfe: baut zuerst (CSS + ?v=-Stempel), kopiert dann genau die Upload-Whitelist nach dist/
# (gitignored). Aufruf: sh tools/dist.sh
# Testversion fuer eine andere (Sub-)Domain: STAGING_HOST=test.example.de sh tools/dist.sh
# -> dist-staging/ mit Weiterleitung auf diese Domain, ohne HSTS, mit noindex.
set -eu
cd "$(dirname "$0")/.."

# Immer frisch bauen: sonst koennte ein altes main.css mit passendem alten Stempel deployt werden
sh build.sh >/dev/null

hash_of() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1
  else shasum -a 256 "$1" | cut -d' ' -f1; fi
}

# Plausibilitaetspruefung nach dem Build: ?v= in index.html muss zu sha256[0:8] der aktuellen Datei passen
for f in assets/css/main.css assets/js/main.js; do
  stamp=$(grep -oE "/$f\?v=[0-9a-f]{8}" index.html | head -n 1 | sed 's/.*?v=//' || true)
  want=$(hash_of "$f" | cut -c1-8)
  if [ -z "$stamp" ] || [ "$stamp" != "$want" ]; then
    echo "Stempel passt nach dem Build nicht ($f: index.html=${stamp:-fehlt}, Datei=$want)" >&2
    exit 1
  fi
done

# Whitelist aus der gemeinsamen Datei (auch von verify.sh gelesen)
FILES=$(grep -vE '^[[:space:]]*(#|$)' tools/dist-files.txt | tr -d '\r')

# Hero-Bilder nur, wenn ausserhalb von HTML-Kommentaren referenziert
if awk 'BEGIN{c=0} { s=$0; out="";
    while (length(s) > 0) {
      if (c) { i=index(s,"-->"); if (i==0) { s=""; } else { s=substr(s,i+3); c=0 } }
      else { i=index(s,"<!--"); if (i==0) { out=out s; s="" } else { out=out substr(s,1,i-1); s=substr(s,i+4); c=1 } }
    }
    print out }' index.html | grep -q '/assets/img/hero/'; then
  for f in assets/img/hero/*; do FILES="$FILES
$f"; done
fi

for f in $FILES; do
  [ -f "$f" ] || { echo "Fehlt: $f" >&2; exit 1; }
done

OUT=dist
STAGING_HOST=${STAGING_HOST:-}
if [ -n "$STAGING_HOST" ]; then
  echo "$STAGING_HOST" | grep -qE '^[A-Za-z0-9.-]+$' || { echo "Ungueltiger STAGING_HOST" >&2; exit 1; }
  OUT=dist-staging
fi

rm -rf "$OUT"
mkdir -p "$OUT"
for f in $FILES; do
  mkdir -p "$OUT/$(dirname "$f")"
  cp "$f" "$OUT/$f"
done

if [ -n "$STAGING_HOST" ]; then
  # Zeilenweise ersetzen (ENVIRON statt -v, damit awk die Backslashes nicht umdeutet)
  STAGING_ESC=$(echo "$STAGING_HOST" | sed 's/\./\\./g') STAGING_HOST="$STAGING_HOST" awk '
    index($0, "RewriteCond %{HTTP_HOST}") { print "    RewriteCond %{HTTP_HOST} !^" ENVIRON["STAGING_ESC"] "$ [NC]"; next }
    index($0, "RewriteRule ^ https://www.ms-bauconsult.de") { print "    RewriteRule ^ https://" ENVIRON["STAGING_HOST"] "%{REQUEST_URI} [R=301,L]"; next }
    index($0, "Strict-Transport-Security") { next }
    index($0, "Header always set X-Content-Type-Options") { print "    Header always set X-Robots-Tag \"noindex, nofollow\"" }
    { print }
  ' "$OUT/.htaccess" > "$OUT/.htaccess.tmp"
  mv "$OUT/.htaccess.tmp" "$OUT/.htaccess"
  printf 'User-agent: *\nDisallow: /\n' > "$OUT/robots.txt"
fi

( cd "$OUT" && find . -type f | sort | sed 's#^\./##' )
echo "$OUT/: $(find "$OUT" -type f | wc -l | tr -d ' ') Dateien, $(find "$OUT" -type f -exec cat {} + | wc -c | tr -d ' ') Bytes"
