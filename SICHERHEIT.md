# Sicherheit & DSGVO — MS Bauconsult Website

Stand: 2026-06-26

---

## Technische Sicherheit (Kontaktformular)

### Honeypot-Schutz
- Verstecktes `<input type="checkbox" name="botcheck">` im Formular
- Wird clientseitig geprüft: wenn von Bot befüllt → Abbruch ohne API-Aufruf
- Web3Forms lehnt Anfragen ab, bei denen `botcheck` gesetzt ist

### Rate Limiting (clientseitig)
- 60 Sekunden Cooldown zwischen Absendungen via `localStorage`
- Verhindert schnelle Mehrfacheinreichungen und schützt das Free-Plan-Kontingent (250/Monat)

### Double-Submit-Schutz
- Absenden-Button wird während des Fetch deaktiviert und zeigt "Wird gesendet…"
- Verhindert doppeltes Absenden durch ungeduldige Klicks

### E-Mail-Header-Injection-Schutz
- `name`, `email`, `phone` werden vor dem Senden mit `clean()` bereinigt
- Entfernt Leerzeichen und Zeilenumbrüche (`\r\n`) aus allen Felder-Werten

### Eingabelängen-Begrenzung
- `name`: maxlength 100
- `email`: maxlength 200
- `phone`: maxlength 30
- `message`: maxlength 2000

---

## DSGVO-Konformität

### Fonts — lokal eingebunden
- Alle 45 WOFF2-Schriftdateien sind im Bundler-Manifest eingebettet
- Kein Aufruf von Google Fonts, Adobe Fonts oder anderen Font-CDNs

### JavaScript-Framework — lokal eingebunden
- `dc-runtime` (proprietäres Framework) vollständig inline im Bundler-Manifest
- `React 18.3.1` → `assets/react.production.min.js` (SRI-verifiziert)
- `ReactDOM 18.3.1` → `assets/react-dom.production.min.js` (SRI-verifiziert)
- Alle 4 HTML-Seiten injizieren React vor dem Bundler-Loader → `window.React` ist gesetzt → unpkg.com wird nie kontaktiert
- Babel Standalone (`@babel/standalone@7.26.4`) ist als URL-Konstante vorhanden, wird aber nie geladen (`ext_resources: []`, kein JSX-Modus aktiv)

### Bilder — lokal gespeichert
- Alle 9 Bilder in `assets/` (vorher externe WordPress-URLs)
- Kein Aufruf externer Bildserver

### Kein Tracking / keine Analytics
- Kein Google Analytics, keine Matomo, keine Tracking-Pixel
- Keine Facebook Pixel, keine GTM
- `ext_resources: []` in allen Seiten bestätigt

### Externes API — nur bei Nutzeraktion
- Einziger externer Aufruf: `https://api.web3forms.com/submit`
- Wird nur ausgelöst wenn Nutzer aktiv das Kontaktformular absendet (kein Autoload)
- In der Datenschutzerklärung als Auftragsverarbeiter ausgewiesen

### Datenschutzerklärung bereinigt
- "Real Cookie Banner" (devowl.io) — entfernt (war nie installiert)
- Cookie-Rechtsgrundlagen-Absätze — entfernt
- "Anwaltskanzlei Weiß & Partner" Hinweis — entfernt
- Web3Forms als Auftragsverarbeiter — hinzugefügt
- Hosting-Abschnitt — generisch (muss vor Go-Live mit echtem Hoster befüllt werden)

---

## CDN-Audit-Ergebnis

Geprüft wurden: Outer HTML, Bundler-Manifest (dekomprimiert), Template-HTML aller 4 Seiten.

| Domäne | Status | Anmerkung |
|---|---|---|
| `unpkg.com` (React/ReactDOM) | **behoben** | Lokale Dateien in `assets/`, Guard aktiv |
| `unpkg.com` (Babel) | **kein Problem** | URL-Konstante in Framework-Code, wird nie geladen |
| `fonts.googleapis.com` | nicht vorhanden | |
| `cdn.jsdelivr.net` | nicht vorhanden | |
| Google Analytics / GTM | nicht vorhanden | |
| `api.web3forms.com` | intentional | Nur bei Formular-Absendung, in Datenschutz erwähnt |
| `schema.org` | nicht geladen | Nur Namespace-String in JSON-LD |
| `ec.europa.eu/consumers/odr/` | intentional | Pflicht-Link im Impressum (§ 36 VSBG) |
