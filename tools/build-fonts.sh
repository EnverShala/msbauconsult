#!/bin/sh
# Dev-only: erzeugt die gesubsetteten woff2-Dateien reproduzierbar. Aus dem Projektstamm starten.
set -eu
PY=${PYTHON:-python3}
command -v "$PY" >/dev/null 2>&1 || PY=python
SRC=tools/out/fonts-src
mkdir -p "$SRC" assets/fonts
# google/fonts ist auf einen Commit gepinnt (nicht "main"); jede Datei wird gegen SHA-256 geprueft.
# Update: neuen Commit waehlen (git ls-remote https://github.com/google/fonts HEAD), Hashes neu berechnen.
REV=e7db6ca603fd4862010383ff17ffd6cc4ffac1c0
G=https://raw.githubusercontent.com/google/fonts/$REV/ofl
sha() { if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }
fetch() { # url out sha256
  curl -fsSL -o "$2" "$1"
  [ "$(sha "$2")" = "$3" ] || { echo "SHA-256 stimmt nicht: $2" >&2; rm -f "$2"; exit 1; }
}
fetch "$G/cinzel/Cinzel%5Bwght%5D.ttf" "$SRC/Cinzel[wght].ttf" f4d83d34d1f6c741193e4acf4b3dff9531e5a67b6aa65228d00a7db72a4e0f34
fetch "$G/plusjakartasans/PlusJakartaSans%5Bwght%5D.ttf" "$SRC/PlusJakartaSans[wght].ttf" 89b3fb38aa0d275d7a731d0d817a4f1622b316b4d7fbdedcf02ee9099ff68bc8
fetch "$G/plusjakartasans/PlusJakartaSans-Italic%5Bwght%5D.ttf" "$SRC/PlusJakartaSans-Italic[wght].ttf" 9529eb888668b6a3c6dd75b6341a2fc5263fb6c9e788822e6117c29dd9e8b115
fetch "$G/cinzel/OFL.txt" assets/fonts/OFL-Cinzel.txt f2b3029aba64c378bf0963b62945eee15e564fe4330b934c8f2eb058282b5e83
fetch "$G/plusjakartasans/OFL.txt" assets/fonts/OFL-PlusJakartaSans.txt 995c7199cab65954f545996326755daee7b63cc6b42b06c13da1f9502ab08a99

U='U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2013,U+2014,U+2018-201A,U+201C-201E,U+2022,U+2026,U+20AC,U+2122,U+2212'
F='kern,liga,calt,locl,ccmp,mark,mkmk'

"$PY" -m fontTools.varLib.instancer "$SRC/PlusJakartaSans-Italic[wght].ttf" wght=400 -o "$SRC/pjs-italic-400.ttf"

sub() { "$PY" -m fontTools.subset "$1" --unicodes="$U" --layout-features="$F" --flavor=woff2 --output-file="$2"; }
sub "$SRC/Cinzel[wght].ttf" assets/fonts/cinzel.woff2
sub "$SRC/PlusJakartaSans[wght].ttf" assets/fonts/pjs.woff2
sub "$SRC/pjs-italic-400.ttf" assets/fonts/pjs-italic.woff2
ls -l assets/fonts
