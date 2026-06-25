# MS Bauconsult — Statische Website

## What This Is

Modernisierte, vollständig statische Website (4 HTML-Dateien) für **MS Bauconsult** — Ingenieurbüro für Bau- und Energieberatung von Muhamed Shala, M.Eng., Fellbach.

Die Seite ersetzt eine WordPress-Installation. Kein Build-Tool, kein Backend — alle Styles, Logik und Assets sind eingebettet. Deployment via GitHub Pages.

## Core Value

Eine professionelle Online-Präsenz, die potenzielle Kunden überzeugt und eine direkte Kontaktaufnahme ermöglicht.

## Context

- **Typ:** Statische Website (4 HTML-Dateien + Assets)
- **Design:** Final — dunkel, monochrom, Gold-Akzent `#FFC000`, Schrift "Saira"
- **Technologie:** Vanilla HTML/CSS/JS, kein Framework, kein Build-Schritt
- **Template-Format:** Bundled HTML (Inhalte als JSON-String in `<script type="__bundler/template">`)
- **Hosting:** GitHub Pages (geplant)
- **E-Mail:** info@ms-bauconsult.de (Kontaktformular-Ziel)
- **Formulardienst:** Web3Forms (access_key noch einzutragen)

## Seiten

| Datei | Inhalt |
|-------|--------|
| `index.html` | Startseite: Hero, Über mich, Leistungen, Kontaktformular |
| `impressum.html` | Impressum |
| `datenschutz.html` | Datenschutzerklärung |
| `cookie-richtlinie.html` | Cookie-Richtlinie |

## Requirements

### Validated

- ✓ Bilder lokal eingebunden — 9 Bilder in `assets/`, keine externen URLs mehr
- ✓ Kontaktformular mit Web3Forms verbunden (Code fertig, Access Key fehlt noch)
- ✓ Cookie-Richtlinie bereinigt — WordPress/GA/Complianz/Elementor entfernt, Web3Forms-Hinweis ergänzt
- ✓ GitHub Actions Workflow für automatisches Deployment auf GitHub Pages

### Active

- [ ] Web3Forms Access Key eintragen (info@ms-bauconsult.de bei web3forms.com registrieren)
- [ ] GitHub Repository anlegen und Code pushen
- [ ] Optional: Custom Domain ms-bauconsult.de in GitHub Pages eintragen

### Out of Scope

- Cookie-Consent-Banner — keine Cookies gesetzt, nicht erforderlich
- CMS / Backend — bewusst statisch
- SEO-Optimierungen — Design ist final, keine Inhaltsänderungen

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web3Forms für E-Mail-Versand | Kein Backend nötig, kostenlos, DSGVO-freundlich | Implementiert |
| GitHub Actions statt manuell | Automatisches Deployment bei jedem Push auf main | Eingerichtet |
| JSON.parse/stringify für Datei-Patches | Saubere Bearbeitung des Bundler-Formats ohne manuelle Escaped-String-Logik | Funktioniert |

## Evolution

Dieses Projekt ist nach der Fertigstellung weitgehend statisch. Änderungen nur bei Inhaltsaktualisierungen oder neuem Hosting-Bedarf.

---
*Initialisiert: 2026-06-26*
