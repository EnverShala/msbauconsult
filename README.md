# MS Bauconsult – Website

Statische One-Page-Website für MS Bauconsult – Muhamed Shala, M.Eng. (Ingenieurbüro für Bau- & Energieberatung, Fellbach). Keine Laufzeit-Abhängigkeiten, keine externen Anfragen, kein Inline-Code. Einziges Build-Werkzeug ist die Tailwind-v3.4.17-Standalone-CLI.

## Build

```
.\build.ps1
sh build.sh
sh build.sh --watch
```

`.\build.ps1` gilt für Windows, `sh build.sh` für Git Bash, Linux und macOS, `--watch` für die Entwicklung. Das Skript lädt beim ersten Lauf die gepinnte Binärdatei (v3.4.17) und prüft ihren SHA-256-Hash. Die Binärdatei ist per `.gitignore` ausgeschlossen, die erzeugte `assets/css/main.css` wird eingecheckt.

## Struktur

```
index.html            Seite
favicon.svg           Favicon (Logo)
CREDITS.md            Lizenzen und Bildquellen
tailwind.config.js    Tailwind-Konfiguration
src/input.css         CSS-Quelle (Tailwind-Direktiven, Schriften, eigene Komponenten)
assets/css/           erzeugtes main.css
assets/js/            main.js (Spotlight, Rechner, Partikel)
assets/fonts/         selbst gehostete woff2-Schriften
assets/img/           optimierte Bilder
tools/                nur Entwicklung (Prüfung, Asset-Rezepte)
final.html            Design-Referenz, unverändert
```

## Prüfung (nur Entwicklung)

Voraussetzungen: Node, installierter Google Chrome, Python mit Pillow, numpy, fonttools und brotli sowie Playwright:

```
cd tools && npm i --no-save --no-package-lock playwright@1.64.1
```

Ein Befehl führt alle Phase-1-Prüfungen aus:

```
sh tools/verify.sh
```

Geprüft werden: Build, kein Inline-Code, keine fremden Domains, Pixelvergleich mit der `final.html`-Baseline (Toleranz 3/255 bei 1440 px, 375 px und Hover-Zustand), keine Anfrage an fremde Ursprünge, `prefers-reduced-motion` sowie Partikel-Pause im verdeckten Tab. Ausgabe am Ende: `ALL PASS`.

Die Baseline liegt in `.planning/phases/01-fundament/baseline/`. Neu aufnehmen (benötigt Netzwerk, da `final.html` externe Ressourcen lädt):

```
node tools/shoot.mjs final.html .planning/phases/01-fundament/baseline ref
```

Reproduzierbare Asset-Rezepte: `sh tools/build-fonts.sh` (Schrift-Subsets) und `python tools/build-images.py` (Bilder).

## Lizenzen

Schriften, Icons und Bildquellen siehe [CREDITS.md](CREDITS.md).
