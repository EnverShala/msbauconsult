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
.htaccess             Apache: HTTPS/www-Weiterleitung, Rewrites für /impressum und /datenschutz, Sperre von Entwicklungspfaden
robots.txt            Crawler-Regeln
sitemap.xml           Sitemap
sendMail.php          Kontaktformular-Endpunkt (PHP, JSON)
LAUNCH-CHECKLIST.md   Offene Live-Prüfungen und Punkte vor dem Go-live
CREDITS.md            Lizenzen und Bildquellen
tailwind.config.js    Tailwind-Konfiguration
src/input.css         CSS-Quelle (Tailwind-Direktiven, Schriften, eigene Komponenten)
assets/css/           erzeugtes main.css
assets/js/            main.js (Spotlight, Partikel, Rechtsdialoge, Navigation, Formular, Wärmepumpen-Check)
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

Ein Befehl führt alle Phase-3-Prüfungen aus:

```
sh tools/verify.sh
```

Geprüft werden: Build, kein Inline-Code, keine fremden Domains, `final.html` unverändert, keine Platzhalter, statische Phase-3-Regeln (Pfade, `.htaccess`, Honeypot, Dialog-/Menü-/Consent-IDs, heizreport nur im Loader), Struktur/Meta/Anker (structcheck), Design-Stile gegen Baseline (stylecheck), Layout 320–1440 px ohne horizontales Scrollen (layoutcheck), Netzwerk (keine fremden Anfragen), Bewegung (`prefers-reduced-motion`, Partikel-Pause im verdeckten Tab) und Interaktion (interactcheck). Ausgabe am Ende: `ALL PASS`.

Die Interaktionsprüfung läuft auch einzeln, optional mit Gruppen:

```
node tools/interactcheck.mjs [gruppe ...]
```

Gruppen: `server`, `mock`, `parity`, `paths`, `dialogs`, `deeplinks`, `legal`, `form`, `anchors`, `menu`, `consent`. Der Entwicklungsserver (`tools/serve.mjs`) ersetzt Apache und bildet die Rewrites sowie `sendMail.php` nach (Mail-Mock: `startServer(root, { mockMail: true })`, die Regex-Quellen und Grenzwerte der Formularprüfung sind textuell mit `sendMail.php` und `main.js` abgeglichen, der Mock bildet die Reihenfolge der PHP-Prüfungen nach; PHP selbst (z. B. `filter_var`, `mail()`) wird dabei nicht ausgeführt und muss separat getestet werden). Mit `--online` lädt die Gruppe `consent` einmal das echte heizreport-Skript und meldet das Ergebnis nur als `INFO`; `verify.sh` verwendet das Flag nie.

Die Baseline der berechneten Stile liegt in `.planning/phases/02-inhalte-neue-sektionen/baseline/styles.json` und wurde von der Phase-1-Seite aufgenommen. `node tools/stylecheck.mjs index.html --record` darf auf der geänderten Seite **nicht** erneut ausgeführt werden.

Zustände (Menü, Dialoge, Formular, Wärmepumpen-Check) werden über Attribute (`hidden`, `aria-expanded`, `data-state`) und eigenes CSS in `src/input.css` gesteuert, nicht über per JavaScript gesetzte Tailwind-Klassen.

Reproduzierbare Asset-Rezepte: `sh tools/build-fonts.sh` (Schrift-Subsets; google/fonts auf Commit `e7db6ca` gepinnt, TTFs per SHA-256 geprueft) und `python -I tools/build-images.py` (Bilder).

## Hero-Foto (optional)

Standard ist der Hero ohne Foto. Zum Aktivieren den HTML-Kommentar um den `<picture>`-Block im Hero von `index.html` entfernen, danach `sh build.sh`. Der Vergleich liegt in `preview/hero-ohne.png` und `preview/hero-mit.png`.

## Bekannte Einschränkungen

- Ohne JavaScript zeigen `/impressum` und `/datenschutz` die Startseite ohne den Rechtstext, die Dialoge und der Wärmepumpen-Check brauchen JavaScript. Die Pflichtangaben stehen im HTML, werden aber erst im Dialog sichtbar.
- Das mobile Menü (unter 1024 px) braucht JavaScript; die Abschnittsanker der Seite funktionieren ohne JavaScript weiterhin.
- Nur Webdateien deployen (`index.html`, `assets/`, `favicon.svg`, `robots.txt`, `sitemap.xml`, `sendMail.php`, `.htaccess`). Entwicklungspfade (`tools/`, `src/`, `.planning/`, `preview/`) sperrt `.htaccess` ohnehin.
- Offene Live-Prüfungen (PHP-Mailversand, Apache-Regeln, heizreport-Lizenz, Rechtsprüfung, Hoster-Angaben) stehen in [LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md).

## Lizenzen

Schriften, Icons und Bildquellen siehe [CREDITS.md](CREDITS.md).
