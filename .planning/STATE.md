---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-06-29T23:32:58.024Z"
---

# State — MS Bauconsult Website

## Current Phase

**Phase 1** — Abgeschlossen ✓  
**Phase 2** — Ausstehend (manuelle Schritte)

## Last Action

Phase 1 vollständig abgeschlossen (2026-06-26):

- Bilder lokalisiert via `node localize-images.mjs`
- Kontaktformular auf Web3Forms umgestellt
- Cookie-Richtlinie bereinigt
- GitHub Pages Setup eingerichtet

## Blocking

**FORM-04**: Web3Forms Access Key — bewusst zurückgestellt, wird ganz zuletzt vor dem Launch eingetragen.
→ Schritt: https://web3forms.com/#start → info@ms-bauconsult.de eingeben → Key per E-Mail erhalten → `YOUR_WEB3FORMS_ACCESS_KEY` in `index.html` ersetzen → committen + pushen

## Next Step

GitHub Repository anlegen und Code pushen (Phase 2), dann ganz am Schluss den Web3Forms Key eintragen.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260801-tgu | Site-Review, farbiges Logo auf allen Seiten, Heizreport-Wärmepumpencheck einbauen | 2026-08-01 | 137c199 | [260801-tgu-site-review-farbiges-logo-auf-allen-seit](./quick/260801-tgu-site-review-farbiges-logo-auf-allen-seit/) |
| 260801-u8d | Heizreport-Widget hinter Zwei-Klick-Consent, optische Review-Fixes | 2026-08-01 | c2a2674 | [260801-u8d-heizreport-widget-hinter-zwei-klick-cons](./quick/260801-u8d-heizreport-widget-hinter-zwei-klick-cons/) |
| 260802-368 | CSP-Header in .htaccess ergänzen: heizreport.de für Wärmepumpen-Check erlauben | 2026-08-02 | e2d6f8c | [260802-368-csp-header-in-htaccess-erg-nzen-heizrepo](./quick/260802-368-csp-header-in-htaccess-erg-nzen-heizrepo/) |

Last activity: 2026-08-02 - Completed quick task 260802-368: CSP-Header für heizreport.de (Wärmepumpen-Check-Blockade behoben)

Hinweis: Finales Hosting ist ein PHP-fähiger Server (ms-bauconsult.de) — `sendMail.php` ist der gewollte Formular-Backend-Weg, GitHub Pages dient nur als Preview.
