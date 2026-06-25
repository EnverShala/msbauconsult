# Roadmap — MS Bauconsult Website

## Phase 1: Fertigstellung der statischen Website ✓

**Goal:** Website ist vollständig funktionsfähig, serverunabhängig und live-bereit.
**Status:** Abgeschlossen (2026-06-26)

**Abgeschlossen:**
- ASSET-01, ASSET-02: Bilder lokalisiert (9 Bilder in `assets/`)
- FORM-01, FORM-02, FORM-03: Kontaktformular mit Web3Forms verbunden
- LEGAL-01, LEGAL-02, LEGAL-03: Cookie-Richtlinie bereinigt
- DEPLOY-01, DEPLOY-02: GitHub Pages Setup (`.nojekyll`, GitHub Actions Workflow)

**Success Criteria:**
1. `node verify.mjs` bestätigt: alle Checks bestehen
2. Keine externen Bild-URLs zur alten Domain
3. Cookie-Richtlinie enthält nur tatsächlich gesetzte Cookies (keine)

---

## Phase 2: Live-Gang

**Goal:** Website ist öffentlich erreichbar unter GitHub Pages URL.
**Status:** Ausstehend — manuelle Schritte erforderlich

**Aufgaben:**
1. Web3Forms Access Key holen: https://web3forms.com/#start → E-Mail info@ms-bauconsult.de eingeben → Key aus Bestätigungs-E-Mail kopieren
2. Key in `index.html` eintragen: `YOUR_WEB3FORMS_ACCESS_KEY` ersetzen
3. GitHub Repository anlegen (z. B. `ms-bauconsult`)
4. Code pushen: alle 4 HTML-Dateien, `assets/`, `.nojekyll`, `.github/`
5. In GitHub: Settings → Pages → Source: GitHub Actions → Save
6. Nach ~1 Minute: Website unter `https://<account>.github.io/ms-bauconsult/` prüfen

**Success Criteria:**
1. Website öffentlich erreichbar
2. Kontaktformular sendet E-Mail an info@ms-bauconsult.de
3. Alle Bilder laden korrekt

---

## Phase 3 (Optional): Custom Domain

**Goal:** Website unter ms-bauconsult.de erreichbar.

**Aufgaben:**
1. In GitHub Pages: Custom domain `ms-bauconsult.de` eintragen → CNAME-Datei wird angelegt
2. Beim Domain-Anbieter: A-Records auf GitHub Pages IPs oder CNAME auf `<account>.github.io` setzen
3. HTTPS erzwingen (GitHub Pages bietet Let's Encrypt automatisch an)
