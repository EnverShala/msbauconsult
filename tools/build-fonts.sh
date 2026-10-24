#!/bin/sh
# Dev-only: erzeugt die gesubsetteten woff2-Dateien reproduzierbar. Aus dem Projektstamm starten.
set -eu
PY=${PYTHON:-python3}
command -v "$PY" >/dev/null 2>&1 || PY=python
SRC=tools/out/fonts-src
mkdir -p "$SRC" assets/fonts
G=https://raw.githubusercontent.com/google/fonts/main/ofl
curl -fsSL -o "$SRC/Cinzel[wght].ttf" "$G/cinzel/Cinzel%5Bwght%5D.ttf"
curl -fsSL -o "$SRC/PlusJakartaSans[wght].ttf" "$G/plusjakartasans/PlusJakartaSans%5Bwght%5D.ttf"
curl -fsSL -o "$SRC/PlusJakartaSans-Italic[wght].ttf" "$G/plusjakartasans/PlusJakartaSans-Italic%5Bwght%5D.ttf"
curl -fsSL -o assets/fonts/OFL-Cinzel.txt "$G/cinzel/OFL.txt"
curl -fsSL -o assets/fonts/OFL-PlusJakartaSans.txt "$G/plusjakartasans/OFL.txt"

U='U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2013,U+2014,U+2018-201A,U+201C-201E,U+2022,U+2026,U+20AC,U+2122,U+2212'
F='kern,liga,calt,locl,ccmp,mark,mkmk'

"$PY" -m fontTools.varLib.instancer "$SRC/PlusJakartaSans-Italic[wght].ttf" wght=400 -o "$SRC/pjs-italic-400.ttf"

sub() { "$PY" -m fontTools.subset "$1" --unicodes="$U" --layout-features="$F" --flavor=woff2 --output-file="$2"; }
sub "$SRC/Cinzel[wght].ttf" assets/fonts/cinzel.woff2
sub "$SRC/PlusJakartaSans[wght].ttf" assets/fonts/pjs.woff2
sub "$SRC/pjs-italic-400.ttf" assets/fonts/pjs-italic.woff2
ls -l assets/fonts
