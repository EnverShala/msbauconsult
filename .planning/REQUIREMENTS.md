# Requirements — MS Bauconsult Website

## v1 Requirements

### Assets & Medien

- [x] **ASSET-01**: Alle 9 Bilder liegen lokal in `assets/` und sind in allen HTML-Dateien korrekt referenziert
- [x] **ASSET-02**: Keine externen Bild-URLs zur alten WordPress-Domain mehr vorhanden

### Kontaktformular

- [x] **FORM-01**: Formular-Code ruft die Web3Forms-API (`api.web3forms.com/submit`) auf
- [x] **FORM-02**: Bei Erfolg wird die Bestätigungsansicht angezeigt (bestehendes Verhalten beibehalten)
- [x] **FORM-03**: Bei Fehler wird eine Fehlermeldung mit direktem E-Mail-Link angezeigt
- [ ] **FORM-04**: Web3Forms Access Key für info@ms-bauconsult.de eingetragen

### Rechtstexte

- [x] **LEGAL-01**: Cookie-Richtlinie enthält keine WordPress/GA/Complianz/Elementor-Einträge mehr
- [x] **LEGAL-02**: Cookie-Richtlinie erklärt korrekt: keine eigenen Cookies, Formular via Web3Forms
- [x] **LEGAL-03**: Einwilligungs-Text in Abschnitt 7 angepasst (kein Cookie-Banner nötig)

### Deployment

- [x] **DEPLOY-01**: `.nojekyll` vorhanden (verhindert Jekyll-Verarbeitung durch GitHub Pages)
- [x] **DEPLOY-02**: GitHub Actions Workflow `.github/workflows/deploy.yml` für automatisches Deployment
- [ ] **DEPLOY-03**: Repository auf GitHub angelegt und Code gepusht
- [ ] **DEPLOY-04**: GitHub Pages in Repository-Settings aktiviert

## v2 Requirements (optional, später)

- [ ] Custom Domain `ms-bauconsult.de` in GitHub Pages eingetragen
- [ ] CNAME-Datei für GitHub Pages Custom Domain

## Out of Scope

- Cookie-Consent-Banner — keine Cookies gesetzt, rechtlich nicht erforderlich
- Analytics/Tracking — bewusst ausgelassen
- CMS / WordPress — statische Seite ist das Ziel
- Formular-Backend — Web3Forms ersetzt das
