# MS Bauconsult – Website

Statische One-Page-Website für MS Bauconsult – Muhamed Shala, M.Eng. (Ingenieurbüro für Bau- & Energieberatung, Fellbach). Keine Laufzeit-Abhängigkeiten, keine externen Anfragen vor einer Nutzerinteraktion, kein Inline-Code, keine Cookies. Einziges Build-Werkzeug ist die Tailwind-v3.4.17-Standalone-CLI.

Das visuelle Design (`final.html`) entstand KI-gestützt; Inhalte, Umsetzung, Barrierefreiheit, Sicherheit und Performance-Optimierung sind die Arbeit des Entwicklers. Eine kurze Portfolio-Beschreibung steht in [PORTFOLIO.md](PORTFOLIO.md).

## Build

```
.\build.ps1
sh build.sh
sh build.sh --watch
```

`.\build.ps1` gilt für Windows, `sh build.sh` für Git Bash, Linux und macOS, `--watch` für die Entwicklung. Das Skript lädt beim ersten Lauf die gepinnte Binärdatei (v3.4.17) und prüft ihren SHA-256-Hash. Die Binärdatei ist per `.gitignore` ausgeschlossen, die erzeugte `assets/css/main.css` wird eingecheckt.

Versionierung: Der Build stempelt `?v=<sha256[0:8]>` für `main.css` und `main.js` in `index.html` (der Watch-Modus stempelt nicht). Nur diese beiden Dateien werden ein Jahr als `immutable` gecacht, die neue URL erzwingt das Nachladen. Schriften und Bilder tragen keinen Versionsparameter (`tools/build-images.py` schreibt unter denselben Namen) und werden deshalb nur 30 Tage (`max-age=2592000`) ohne `immutable` gecacht: Ein geändertes Bild oder eine geänderte Schrift kommt spätestens nach 30 Tagen an, sofort nur mit neuem Dateinamen.

## Deploy

```
sh tools/dist.sh
```

`tools/dist.sh` führt zuerst `sh build.sh` aus (damit `main.css` und die `?v=`-Stempel immer zum aktuellen Stand von `index.html` und `src/input.css` passen), prüft danach die Stempel und kopiert genau die Upload-Whitelist aus `tools/dist-files.txt` nach `dist/` (per `.gitignore` ausgeschlossen). Der Inhalt von `dist/` wird per FTP in das Web-Root des Hosters geladen. Bei einer inhaltlichen Änderung von `index.html` vor dem Deploy `<lastmod>` in `sitemap.xml` von Hand auf das Änderungsdatum setzen (wird nicht automatisch gepflegt). Nicht deployt werden `final.html`, `src/`, `tools/`, `preview/`, `.planning/`, `*.md` und die Build-Dateien.

Setzt der Hoster serverseitig eine eigene Content-Security-Policy, gelten beide Header als Schnittmenge. Es darf nur die CSP aus `.htaccess` aktiv sein; die Prüfung steht in [LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md).

## Sicherheit

`.htaccess` sendet die Header mit `Header always set`, also auch bei 301 und 404:

- `Content-Security-Policy`: `default-src 'none'; script-src 'self' https://heizreport.de/js/heizreport_3.js; style-src 'self' 'unsafe-inline'; img-src 'self' https://heiz.report; font-src 'self'; connect-src 'self' https://heizreport.de/web/; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`
- `Strict-Transport-Security: max-age=31536000` (ohne `includeSubDomains` und ohne `preload`, damit Subdomains des Hosters ohne TLS nicht gesperrt werden)
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (Kamera, Mikrofon, Geolocation, Payment, USB aus), `Cross-Origin-Opener-Policy: same-origin`

Die Lockerungen der CSP gelten ausschließlich dem Wärmepumpen-Check und werden erst nach Klick-Einwilligung relevant:

- `script-src https://heizreport.de/js/heizreport_3.js`: genau dieser eine Skriptpfad, kein `'unsafe-inline'`.
- `style-src 'unsafe-inline'`: das Widget fügt ein `<style>`-Element und `style`-Attribute ein; die eigene Seite hat keine Inline-Styles.
- `img-src https://heiz.report`: Ergebnisbild des Widgets im letzten Schritt.
- `connect-src https://heizreport.de/web/`: Tracking- und Integrationsaufrufe des Widgets.
- `frame-src 'none'`: das Widget nutzt kein iframe.

## Struktur

```
index.html            Seite
favicon.svg           Favicon (Logo)
.htaccess             Apache: HTTPS/www-Weiterleitung, Rewrites für /impressum und /datenschutz, Sperre von Entwicklungspfaden, Security-Header, Kompression, Caching
robots.txt            Crawler-Regeln
sitemap.xml           Sitemap
sendMail.php          Kontaktformular-Endpunkt (PHP, JSON)
README.md             diese Datei
PORTFOLIO.md          Portfolio-Beschreibung
LAUNCH-CHECKLIST.md   Offene Live-Prüfungen und Punkte vor dem Go-live
CREDITS.md            Lizenzen und Bildquellen
build.ps1, build.sh   Build (Tailwind-CLI, ?v=-Stempel)
tailwind.config.js    Tailwind-Konfiguration
src/input.css         CSS-Quelle (Tailwind-Direktiven, Schriften, eigene Komponenten)
assets/css/           erzeugtes main.css
assets/js/            main.js (Spotlight, Partikel, Rechtsdialoge, Navigation, Formular, Wärmepumpen-Check)
assets/fonts/         selbst gehostete woff2-Schriften
assets/img/           optimierte Bilder
dist/                 Deploy-Ausgabe von tools/dist.sh (gitignored)
tools/                nur Entwicklung (Prüfung, Asset-Rezepte)
tools/dist.sh         Build und Deploy-Whitelist nach dist/
tools/dist-files.txt  Upload-Whitelist (einzige Quelle für dist.sh und verify.sh)
tools/hardencheck.mjs Header, CSP, Storage, axe, Zielgrößen, Clipping, Tastatur
tools/lighthouse.mjs  Lighthouse, Median aus 5 Läufen
tools/assets-src/     Bildquellen für tools/build-images.py
preview/              Vergleich Hero mit/ohne Foto (nur Entwicklung, nicht deployen)
final.html            Design-Referenz, unverändert
```

## Prüfung (nur Entwicklung)

Voraussetzungen: Node, installierter Google Chrome, Python mit Pillow, numpy, fonttools und brotli sowie Playwright und axe-core:

```
cd tools && npm i --no-save --no-package-lock playwright@1.64.1 axe-core@4.14.0
```

Lighthouse wird bei Bedarf über `npx lighthouse@13.5.0` geholt (nur Entwicklung, nicht im Projekt installiert). Ein Befehl führt alle Prüfungen aus:

```
sh tools/verify.sh
```

Das Ergebnis steht in der letzten Zeile: `ALL PASS` (bzw. `ALL PASS (1 WARN)`, wenn nur der Lighthouse-Performance-Median 99 statt 100 beträgt). Ein zusätzliches `WARN build-current` heißt: `index.html` oder `main.css` waren vor dem Lauf nicht frisch gebaut; `verify.sh` baut selbst, die Änderung muss danach eingecheckt werden. Mit `VERIFY_LIGHTHOUSE=0` entfällt der mehrminütige Lighthouse-Teil für schnelle Läufe.

Geprüft werden: Build, kein Inline-Code, keine fremden Domains, `final.html` unverändert, keine Platzhalter, statische Regeln (Pfade, `.htaccess`, Header, Versionsstempel, Honeypot, Dialog-/Menü-/Consent-IDs, heizreport nur im Loader), Struktur/SEO (Title, Description, OG/Twitter, JSON-LD, Überschriften, alt-Texte, Linktexte, robots/sitemap), Design-Stile gegen Baseline, Layout 320–1440 px ohne horizontales Scrollen, Netzwerk (keine fremden Anfragen), Bewegung (`prefers-reduced-motion`, Partikel-Pause im verdeckten Tab), Interaktion, Header und CSP (inklusive Negativtest), Cookies und Web-Storage, axe-core (0 Verstöße in allen Zuständen), Zielgrößen nach WCAG 2.5.8, Clipping, Tastatur-Durchgang, Größenbudget, Deploy-Whitelist (`dist`) und Lighthouse.

Einzelne Gruppen:

```
node tools/hardencheck.mjs [headers csp storage axe targets clip keyboard]
node tools/interactcheck.mjs [gruppe ...]
node tools/serve.mjs --prod --port 8080
node tools/lighthouse.mjs
```

`serve.mjs --prod` sendet die Header aus `.htaccess` (einzige Quelle), `lighthouse.mjs` misst dagegen. Gruppen von `interactcheck`: `server`, `mock`, `parity`, `paths`, `dialogs`, `deeplinks`, `legal`, `form`, `anchors`, `menu`, `consent`. Der Entwicklungsserver (`tools/serve.mjs`) ersetzt Apache und bildet die Rewrites sowie `sendMail.php` nach (Mail-Mock: `startServer(root, { mockMail: true })`; PHP selbst (z. B. `filter_var`, `mail()`) wird dabei nicht ausgeführt und muss separat getestet werden). Mit `--online` lädt die Gruppe `consent` einmal das echte heizreport-Skript und meldet das Ergebnis nur als `INFO`; `verify.sh` verwendet das Flag nie.

Die Baseline der berechneten Stile liegt in `.planning/phases/02-inhalte-neue-sektionen/baseline/styles.json` und wurde von der Phase-1-Seite aufgenommen. `node tools/stylecheck.mjs index.html --record` darf auf der geänderten Seite **nicht** erneut ausgeführt werden.

Zustände (Menü, Dialoge, Formular, Wärmepumpen-Check) werden über Attribute (`hidden`, `aria-expanded`, `data-state`) und eigenes CSS in `src/input.css` gesteuert, nicht über per JavaScript gesetzte Tailwind-Klassen.

Reproduzierbare Asset-Rezepte: `sh tools/build-fonts.sh` (Schrift-Subsets; google/fonts auf Commit `e7db6ca` gepinnt, TTFs per SHA-256 geprüft) und `python -I tools/build-images.py` (Bilder).

## Kennzahlen

Gemessen am 2026-10-25 mit Lighthouse 13.5.0 (mobil, simulierte Drosselung, headless Chrome 156) gegen `tools/serve.mjs --prod`; Median aus 5 Läufen, Rohdaten in [`.planning/phases/04-haertung-abnahme/LIGHTHOUSE.json`](.planning/phases/04-haertung-abnahme/LIGHTHOUSE.json):

| Kennzahl | Wert |
|---|---|
| Performance | 99 |
| Barrierefreiheit | 100 |
| Best Practices | 100 |
| SEO | 100 |
| FCP / LCP | 941 ms / 1582 ms |
| TBT / CLS | 84 ms / 0 |
| Requests / Übertragung | 9 / 119 665 Bytes (116,9 KiB) |
| HTML+CSS+JS gzip | 25 119 Bytes (Budget 51 200) |
| plus Schriften | 81 675 Bytes (Budget 122 880) |

Hinweise:

- Der Performance-Median liegt lokal bei 99, nicht bei 100. Von 17 aufgezeichneten Lauf-Serien (je Median aus 5 Läufen) ergaben 13 einen Median von 99, je eine 100 bzw. einen Ausreißer (85, Rechnerlast) und zwei 98; keine wurde ausgelassen. Der verbindliche Wert ist die Live-Messung mit PageSpeed Insights (siehe LAUNCH-CHECKLIST).
- Lokal misst Lighthouse mit simulierter Drosselung; der Live-Wert aus PageSpeed Insights steht in der [LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md) noch aus.
- Vor einer Nutzerinteraktion: 0 externe Anfragen (netcheck: 9 Requests, 0 fremd), keine Cookies, kein localStorage/sessionStorage.
- axe-core 4.14.0: 0 Verstöße bei 375 und 1440 px für Seite, geöffnetes Menü, beide Rechtsdialoge und Formular-Fehlerzustand.

## Hero-Foto (optional)

Standard ist der Hero ohne Foto. Zum Aktivieren den HTML-Kommentar um den `<picture>`-Block im Hero von `index.html` entfernen, danach `sh build.sh`; `tools/dist.sh` nimmt `assets/img/hero/` dann automatisch mit auf. Der Vergleich liegt in `preview/hero-ohne.png` und `preview/hero-mit.png`.

Optional: langsam driftendes Hero-Raster (nur CSS, `transform`-Animation, aus bei „Bewegung reduzieren“). Zum Aktivieren an der Hero-`<section id="top">` die Klasse `grid-drift` ergänzen, danach `sh build.sh`. Vorschau: `preview/hero-raster-animiert.html` (lokal über `node tools/serve.mjs` aufrufen).

## Bekannte Einschränkungen

- Ohne JavaScript zeigen `/impressum` und `/datenschutz` die Startseite ohne den Rechtstext, die Dialoge und der Wärmepumpen-Check brauchen JavaScript. Die Pflichtangaben stehen im HTML, werden aber erst im Dialog sichtbar.
- Das mobile Menü (unter 1024 px) braucht JavaScript; die Abschnittsanker der Seite funktionieren ohne JavaScript weiterhin.
- Die zwei Reload-Buttons des heizreport-Widgets arbeiten mit Inline-`onclick` und funktionieren unter der strikten CSP nicht (Seite neu laden bleibt möglich).
- Einzige bewusste Abweichung vom Design in `final.html`: Die Textauswahl (`::selection`) ist anthrazit statt weiß auf Gold, damit der Kontrast WCAG AA erfüllt (8,09:1). Ebenso sind Fokus-Umrisse bei Tastaturbedienung in Gold-700 sichtbar; die Mausoptik bleibt unverändert.
- Nur `dist/` deployen (siehe Deploy). Entwicklungspfade (`tools/`, `src/`, `.planning/`, `preview/`) sperrt `.htaccess` ohnehin.
- Offene Live-Prüfungen (PHP-Mailversand, Apache-Regeln, Header, heizreport-Lizenz, Rechtsprüfung, Hoster-Angaben, PageSpeed Insights) stehen in [LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md).

## Lizenzen

Schriften, Icons und Bildquellen siehe [CREDITS.md](CREDITS.md).
