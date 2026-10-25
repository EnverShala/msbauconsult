# Launch-Checkliste

Offene Prüfungen vor dem Go-live. Alles hier ist lokal nicht prüfbar (kein PHP, kein Apache, kein Zugriff auf Lizenz und Hoster). Phase 4 erweitert die Liste (CSP-Header, Lighthouse, Sicherheits-Header).

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

- [ ] `php -l sendMail.php` ohne Fehler
- [ ] PHP-Version mindestens 7.4 (Arrow Functions), `mbstring` verfügbar
- [ ] Echte Testmail: kommt bei info@ms-bauconsult.de an, enthält Name, E-Mail, Telefon-Zeile und Nachricht, Umlaute korrekt
- [ ] Ratenbegrenzung: die vierte Anfrage innerhalb des Fensters liefert 429 (Meldung „Zu viele Anfragen …“ erscheint im Formular)
- [ ] Zeitfalle und Honeypot: Absenden unter 3 Sekunden bzw. mit gefülltem Feld erzeugt scheinbaren Erfolg, aber keine Mail
- [ ] Liegt der Host hinter einem Reverse Proxy: `$behindProxy` in `sendMail.php` setzen, damit die Ratenbegrenzung die Besucher-IP statt der Proxy-IP verwendet
- [ ] Mailzustellung (SPF/DKIM des Absenders) beim Hoster prüfen, Spam-Ordner kontrollieren

## Wärmepumpen-Check

- [ ] Live-Test mit der heizreport-Lizenz, gebunden an info@ms-bauconsult.de: Check durchlaufen bis zum Ergebnisschritt
- [ ] Vor dem Klick auf „Wärmepumpen-Check laden“ gehen keine Anfragen an heizreport.de oder heiz.report (Netzwerk-Tab, Ladevorgang und Scrollen bis zum Seitenende)
- [ ] Kontrast des Widgets mit der Akzentfarbe `#85650F` im hellen Design prüfen (Buttons, Ergebnisbox, Videovorschau)
- [ ] Optional lokal: `node tools/interactcheck.mjs consent --online` (nur Information, kein Pass-Kriterium)
- [ ] CSP-Bedarf des Widgets für Phase 4 berücksichtigen:
  - `script-src https://heizreport.de`
  - `connect-src https://heizreport.de`
  - `img-src https://heiz.report`
  - `style-src 'unsafe-inline'` (alternativ Hash plus `style-src-attr`), da das Widget Inline-Styles setzt
  - kein `frame-src` nötig
  - Die zwei Reload-Buttons des Widgets arbeiten mit Inline-`onclick` und funktionieren unter einer strikten `script-src` nicht (Seite neu laden bleibt möglich)
- [ ] Kein SRI möglich (der Anbieter ändert das Skript); Einwilligung bleibt auf angemeldete Besucher beschränkt

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
