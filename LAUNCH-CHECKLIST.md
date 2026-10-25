# Launch-Checkliste

Offene Prüfungen vor dem Go-live. Alles hier ist lokal nicht prüfbar (kein PHP, kein Apache, kein Zugriff auf Lizenz und Hoster). Phase 4 ist abgeschlossen (CSP, Sicherheits-Header, Kompression, Caching sind umgesetzt und lokal gegen `serve.mjs --prod` geprüft); alles unten ist nur live prüfbar.

## Server & .htaccess

- [ ] Weiterleitungen prüfen (jeweils Endziel `https://www.ms-bauconsult.de/`, keine Schleife):
  - `curl -sIL http://ms-bauconsult.de/`
  - `curl -sIL http://www.ms-bauconsult.de/`
  - `curl -sIL https://ms-bauconsult.de/`
  - `curl -sIL https://www.ms-bauconsult.de/index.html` (Ziel `/`)
- [ ] `curl -sIL https://www.ms-bauconsult.de/impressum`, `/impressum/` und `/datenschutz` liefern 200 mit der Startseite (Rewrite, kein Redirect auf eine andere URL)
- [ ] Entwicklungspfad `curl -sI https://www.ms-bauconsult.de/tools/` liefert 404 (ebenso `/src/`, `/.planning/`, `/tailwind.config.js`)
- [ ] Redirect-Schleife hinter einem Proxy oder Load Balancer: Variante mit `X-Forwarded-Proto` in der `.htaccess` verwenden, falls `%{HTTPS}` serverseitig nie `on` ist
- [ ] Hoster erlaubt `Options -Indexes` und `ErrorDocument` in `.htaccess` (sonst Serverfehler 500: betroffene Zeilen entfernen und mit dem Hoster klären)
- [ ] Nur Webdateien hochgeladen (siehe README, „Bekannte Einschränkungen“)

## Kontaktformular

- [ ] `php -l sendMail.php` auf dem Hoster ohne Fehler (lokal am 2026-10-25 mit portablem PHP 8.3.36 geprüft: Syntax ok; Validierung, Honeypot, Zeitfalle, Content-Type-Prüfung, 405 und Rate-Limit (429 ab der 4. Anfrage) funktional getestet. Nicht getestet: echter Mailversand, PHP 7.4) – unbedingt einen echten Test per Formular durchführen
- [ ] Ratenbegrenzung: im Temp-Verzeichnis (`sys_get_temp_dir()`) entsteht `rl_salt.key` (Rechte 0600) und je Absender eine `rl_<64 Hex-Zeichen>.json`; nach über 10 Minuten und einer weiteren Formularanfrage ist die alte `rl_*.json` verschwunden; `mb_encode_mimeheader` verfügbar (sonst Fallback auf Base64-Betreff)
- [ ] Entwicklungsdateien sind auch ohne mod_rewrite gesperrt: `curl -I https://www.ms-bauconsult.de/.git/config`, `/.planning/`, `/tools/serve.mjs`, `/README.md` liefern 404 oder 403; `/.well-known/` bleibt erreichbar
- [ ] PHP-Version mindestens 7.4 (Arrow Functions), `mbstring` verfügbar
- [ ] Echte Testmail: kommt bei info@ms-bauconsult.de an, enthält Name, E-Mail, Telefon-Zeile und Nachricht, Umlaute korrekt
- [ ] Ratenbegrenzung: die vierte Anfrage innerhalb des Fensters liefert 429 (Meldung „Zu viele Anfragen …“ erscheint im Formular)
- [ ] Zeitfalle und Honeypot: Absenden unter 3 Sekunden bzw. mit gefülltem Feld erzeugt scheinbaren Erfolg, aber keine Mail
- [ ] Liegt der Host hinter einem Reverse Proxy: `$behindProxy` in `sendMail.php` setzen, damit die Ratenbegrenzung die Besucher-IP statt der Proxy-IP verwendet
- [ ] Mailzustellung (SPF/DKIM des Absenders) beim Hoster prüfen, Spam-Ordner kontrollieren

## Wärmepumpen-Check

- [ ] Speicherverhalten des Widgets im Live-Test prüfen (Browser-Entwicklertools: Cookies, localStorage, sessionStorage nach dem Laden) und mit dem Datenschutztext („Cookies, Tracking und lokaler Speicher“) abgleichen
- [ ] Live-Test mit der heizreport-Lizenz, gebunden an info@ms-bauconsult.de: Check durchlaufen bis zum Ergebnisschritt
- [ ] Vor dem Klick auf „Wärmepumpen-Check laden“ gehen keine Anfragen an heizreport.de oder heiz.report (Netzwerk-Tab, Ladevorgang und Scrollen bis zum Seitenende)
- [ ] Kontrast des Widgets mit der Akzentfarbe `#85650F` im hellen Design prüfen (Buttons, Ergebnisbox, Videovorschau)
- [ ] Optional lokal: `node tools/interactcheck.mjs consent --online` (nur Information, kein Pass-Kriterium)
- [ ] CSP umgesetzt (siehe `.htaccess`) – live prüfen: Widget bis zum Ergebnisschritt durchlaufen, Konsole ohne CSP-Verstöße (Details im Abschnitt „Sicherheits-Header, Kompression, Caching“)
- [ ] Die zwei Reload-Buttons des Widgets arbeiten mit Inline-`onclick` und funktionieren unter der strikten `script-src` nicht (bekannte kosmetische Einschränkung, Seite neu laden bleibt möglich)
- [ ] Kein SRI möglich (der Anbieter ändert das Skript); Einwilligung bleibt auf angemeldete Besucher beschränkt

## Sicherheits-Header, Kompression, Caching (Phase 4)

- [ ] Genau **eine** `Content-Security-Policy` live (Hoster-CSP abgeschaltet, sonst gilt die Schnittmenge beider Header): `curl -sI https://www.ms-bauconsult.de/ | grep -ic '^content-security-policy'` liefert 1; dazu HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`
- [ ] Dieselben Security-Header auch auf dem 301 (`curl -sI http://ms-bauconsult.de/`) und auf einer 404-Seite (`curl -sI https://www.ms-bauconsult.de/gibtsnicht`)
- [ ] Kompression: `curl -sI -H 'Accept-Encoding: br, gzip' https://www.ms-bauconsult.de/` zeigt `Content-Encoding: br` (oder `gzip`) und `Vary: Accept-Encoding`; ebenso für `main.css?v=…` und `main.js?v=…`
- [ ] Cache-Control: `/` und `/impressum` `no-cache`; `main.css?v=…` und `main.js?v=…` `public, max-age=31536000, immutable`; Schriften und Bilder `public, max-age=2592000` (ohne `immutable`); `favicon.svg` `max-age=604800`; die `sendMail.php`-Antwort nicht `immutable`
- [ ] Keine doppelten Header in der `sendMail.php`-Antwort: `curl -si -X POST -H 'Content-Type: application/json' -d '{}' https://www.ms-bauconsult.de/sendMail.php | grep -ic '^x-frame-options'` liefert 1 (ebenso `X-Content-Type-Options`, `Referrer-Policy`)
- [ ] 404-Seite über `ErrorDocument`: `curl -si https://www.ms-bauconsult.de/gibtsnicht | head -n 1` zeigt `404`, der Body ist die Startseite (`curl -s … | grep -c '<title>'` liefert 1)
- [ ] `RedirectMatch 404` für Entwicklungsdateien: `curl -sI https://www.ms-bauconsult.de/tools/serve.mjs`, `/src/input.css`, `/README.md`, `/final.html` liefern jeweils 404
- [ ] Kompression wirklich aktiv (Modul geladen): `curl -s -o /dev/null -w '%{size_download}\n' -H 'Accept-Encoding: br' https://www.ms-bauconsult.de/assets/css/main.css?v=…` deutlich kleiner als ohne `Accept-Encoding`
- Hinweis: Die lokalen Gruppen `headers`/`csp` laufen gegen `tools/serve.mjs --prod`, das die `.htaccess`-Regeln (Header, Cache-Control, `RedirectMatch 404`) in Node nachbildet. Apache-Verhalten (Header-Deduplizierung, `ErrorDocument`, echte Brotli/Deflate-Module, Override-Rechte) ist nur mit den Live-Prüfungen oben belegt.
- [ ] Browser-Konsole live: keine CSP-Verstöße beim Laden, im Menü, in den Dialogen und im Formular; nach Klick auf „Wärmepumpen-Check laden“ das Widget bis zum Ergebnisschritt durchlaufen, inklusive Bild von heiz.report (die 2 `onclick`-Reload-Buttons funktionieren erwartungsgemäß nicht)
- [ ] HSTS-Reichweite: Der Header gilt nur für Hosts, die ihn per HTTPS senden. `https://www.ms-bauconsult.de` sendet ihn immer; der Apex nur, wenn er direkt als `https://ms-bauconsult.de` aufgerufen wird (`http://ms-bauconsult.de` leitet in einem Schritt auf `https://www.` weiter, dort gibt es für den Apex kein HSTS). Ohne `includeSubDomains` sind andere Subdomains (z. B. `webmail.`, `autodiscover.`, `ftp.`) nicht betroffen. Soll der Apex sicher abgedeckt sein: erst `http://ms-bauconsult.de` → `https://ms-bauconsult.de`, dann → `https://www.` (zwei Schritte)
- [ ] HSTS stufenweise: beim ersten Deploy in `.htaccess` `max-age=300` setzen, Weiterleitungen und Zertifikat (www und Apex) einige Tage beobachten, danach auf `max-age=31536000` zurückstellen (Stand im Repository) und mit `curl -sI https://www.ms-bauconsult.de/ | grep -i strict-transport` prüfen
- [ ] PageSpeed Insights (mobil) für `https://www.ms-bauconsult.de/`: Ziel 4×100; Screenshot oder JSON für README und PORTFOLIO. Lokal lag der Performance-Median bei 99 (siehe README, Kennzahlen): den Performance-Wert live ausdrücklich bestätigen und README/PORTFOLIO nur mit dem live gemessenen Wert aktualisieren
- [ ] Optional: securityheaders.com und Mozilla Observatory als Nachweis
- [ ] DNS: `www` und Apex zeigen auf den Webspace; das Zertifikat deckt beide ab
- [ ] Hoster erlaubt den FileInfo-Override (`Header`, `AddType` in `.htaccess`); sonst die betroffenen Blöcke entfernen und mit dem Hoster klären
- [ ] Hochgeladen wurde nur der Inhalt von `dist/` (`sh tools/dist.sh`, baut vorher selbst)

## Rechtstexte

- [ ] Impressum und Datenschutzerklärung rechtlich prüfen lassen (Textgrundlage: e-recht24.de, angepasst)
- [ ] Vom Inhaber zu bestätigen, nichts wurde ergänzt oder erfunden: USt-IdNr., Berufsbezeichnung, zuständige Kammer
- [ ] Hoster: Name, Anschrift und Auftragsverarbeitungsvertrag (AVV) eintragen; Angaben zu Server-Logfiles (Umfang, Speicherdauer) im Abschnitt „Hosting und Server-Logfiles“ mit dem Hoster abgleichen
- [ ] dena-Kennzeichnung (Energie-Effizienz-Experte): Nutzungsbedingungen für das Badge prüfen
- [ ] Bildnachweise in `CREDITS.md` vollständig

## Bekannte Einschränkungen

- [ ] Ohne JavaScript zeigen `/impressum` und `/datenschutz` die Startseite ohne Rechtstext; entscheiden, ob das akzeptabel ist (sonst serverseitige Alternative in Phase 4)
- [ ] Annahme A1: Chrome unter Android schließt den Rechtsdialog per Zurück-Geste nativ (sonst verlässt die Geste die Seite); mit einem echten Gerät bestätigen
- [ ] Das mobile Menü braucht JavaScript (unter 1024 px)
