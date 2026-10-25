#!/bin/sh
# Deploy-Hilfe: baut zuerst (CSS + ?v=-Stempel), kopiert dann genau die Upload-Whitelist nach dist/
# (gitignored). Aufruf: sh tools/dist.sh
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

rm -rf dist
mkdir -p dist
for f in $FILES; do
  mkdir -p "dist/$(dirname "$f")"
  cp "$f" "dist/$f"
done

( cd dist && find . -type f | sort | sed 's#^\./##' )
echo "dist/: $(find dist -type f | wc -l | tr -d ' ') Dateien, $(find dist -type f -exec cat {} + | wc -c | tr -d ' ') Bytes"
