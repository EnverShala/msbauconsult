# Launch-Checkliste — MS Bauconsult

Stand: 2026-06-26

---

## Blockierend (muss vor Go-Live erledigt werden)

- [ ] **Web3Forms Access Key**
  - Auf web3forms.com registrieren mit `info@ms-bauconsult.de`
  - Kostenlosen Access Key holen (250 Einreichungen/Monat)
  - In `index.html` ersetzen: `YOUR_WEB3FORMS_ACCESS_KEY` → echter Key
  - Commit + Push

- [ ] **Datenschutz: Hosting-Anbieter eintragen**
  - In `datenschutz/index.html` den Abschnitt "Hosting" mit dem echten Provider ergänzen
  - Name, Adresse und Link zur Datenschutzerklärung des Hosters angeben
  - Gilt für den finalen Host von ms-bauconsult.de (IONOS, Strato, All-Inkl., etc.)

- [ ] **Domain einrichten**
  - DNS der Domain `ms-bauconsult.de` auf den Hosting-Server zeigen lassen
  - SSL-Zertifikat aktivieren (HTTPS)

---

## Empfohlen vor Go-Live

- [ ] **Impressum prüfen**
  - Umsatzsteuer-ID: erforderlich, falls vorhanden
  - Berufsbezeichnung / Kammer (Ingenieurkammer BW?)
  - Berufshaftpflichtversicherung: falls vorhanden angeben
  - Hinweis-Text unten im Impressum ist bereits entfernt

- [ ] **Formular live testen**
  - Nach Einsetzen des echten Access Keys: Testformular abschicken
  - Prüfen ob E-Mail bei `info@ms-bauconsult.de` ankommt
  - Fehlermeldung testen (z. B. Netzwerk aus)

- [ ] **Darstellung auf Mobilgeräten prüfen**
  - Kontaktformular
  - Navigation (Hamburger-Menü)
  - Hero-Bereich

- [ ] **sitemap.xml und robots.txt anpassen**
  - `sitemap.xml`: URLs prüfen (aktuell auf `ms-bauconsult.de` — korrekt)
  - `robots.txt`: aktuell `Allow: /` — korrekt für eine öffentliche Seite

---

## Bereits erledigt

- [x] Alle Bilder lokal (9 Dateien in `assets/`)
- [x] Alle Fonts lokal im Bundle (kein Google Fonts CDN)
- [x] React 18.3.1 + ReactDOM lokal (`assets/`)
- [x] Kontaktformular: Honeypot, Rate Limiting, Double-Submit-Schutz, Header-Injection-Schutz
- [x] Favicon: nur Gebäude-Icon
- [x] Datenschutz: bereinigt, Web3Forms eingetragen
- [x] Cookie-Richtlinie: bereinigt (keine WP/GA/Complianz-Einträge mehr)
- [x] GitHub Actions Deploy-Workflow (für Test-Deployment auf GitHub Pages)
- [x] Git-Repository: `https://github.com/EnverShala/msbauconsult`
