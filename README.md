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
assets/js/            main.js (Spotlight, Partikel)
assets/fonts/         selbst gehostete woff2-Schriften
assets/img/           optimierte Bilder
tools/                nur Entwicklung (Prüfung, Asset-Rezepte)
tools/assets-src/     Bildquellen für tools/build-images.py
preview/              Vergleich Hero mit/ohne Foto (nur Entwicklung, nicht deployen)
final.html            Design-Referenz, unverändert
```

## Prüfung (nur Entwicklung)

Voraussetzungen: Node, installierter Google Chrome, Python mit Pillow, numpy, fonttools und brotli sowie Playwright:

```
cd tools && npm i --no-save --no-package-lock playwright@1.64.1
```

Ein Befehl führt alle Phase-2-Prüfungen aus:

```
sh tools/verify.sh
```

Geprüft werden: Build, kein Inline-Code, keine fremden Domains, `final.html` unverändert, keine Platzhalter, Struktur/Meta/Anker (structcheck), Design-Stile gegen Baseline (stylecheck), Layout 320–1440 px ohne horizontales Scrollen (layoutcheck), Netzwerk (keine fremden Anfragen) und Bewegung (`prefers-reduced-motion`, Partikel-Pause im verdeckten Tab). Ausgabe am Ende: `ALL PASS`.

Die Baseline der berechneten Stile liegt in `.planning/phases/02-inhalte-neue-sektionen/baseline/styles.json` und wurde von der Phase-1-Seite aufgenommen. `node tools/stylecheck.mjs index.html --record` darf auf der geänderten Seite **nicht** erneut ausgeführt werden.

Hinweis: Tailwind scannt nur `index.html`. Klassen, die später per JavaScript gesetzt werden (Phase 3), erfordern eine Erweiterung von `content` in `tailwind.config.js`.

Reproduzierbare Asset-Rezepte: `sh tools/build-fonts.sh` (Schrift-Subsets; google/fonts auf Commit `e7db6ca` gepinnt, TTFs per SHA-256 geprueft) und `python -I tools/build-images.py` (Bilder).

## Hero-Foto (optional)

Standard ist der Hero ohne Foto. Zum Aktivieren den HTML-Kommentar um den `<picture>`-Block im Hero von `index.html` entfernen, danach `sh build.sh`. Der Vergleich liegt in `preview/hero-ohne.png` und `preview/hero-mit.png`.

## Lizenzen

Schriften, Icons und Bildquellen siehe [CREDITS.md](CREDITS.md).
