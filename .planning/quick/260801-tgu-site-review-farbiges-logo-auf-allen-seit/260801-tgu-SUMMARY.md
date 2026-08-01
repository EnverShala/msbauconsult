---
phase: quick-260801-tgu
plan: 01
subsystem: ui
tags: [static-site, dsgvo, heizreport, accessibility, seo]

requires: []
provides:
  - Farbiges Logo (statt weiß) auf Impressum und Datenschutz
  - Neue verlinkbare Sektion #waermepumpencheck auf der Startseite mit Heizreport-Widget
  - Idempotenter dynamischer Script-Loader für heizreport_3.js
  - DSGVO-Abschnitt zu heizreport.de in der Datenschutzerklärung
  - Reparierte HTML-Verschachtelung auf der Datenschutz-Seite
  - lang="de" auf allen drei Seiten
  - Bereinigte sitemap.xml (kein toter cookie-richtlinie-Eintrag mehr)
affects: [launch-vorbereitung, dsgvo-review]

tech-stack:
  added: []
  patterns:
    - "Externe Drittanbieter-Scripts werden per idempotentem Loader in componentDidMount() injiziert (Retry mit Abbruch, statisches <script src> wird vom Client-Renderer nicht ausgeführt)"

key-files:
  created: []
  modified:
    - index.html
    - impressum/index.html
    - datenschutz/index.html
    - sitemap.xml

key-decisions:
  - "Als Link auf die Datenschutzhinweise des Heizreport-Widgets wurde https://heizreport.de/datenschutz gewählt (per Fetch/curl mit HTTP 200 verifiziert, gleiche Domain wie das eingebundene Script); die Alternative heiz.report/datenschutz ist ebenfalls erreichbar, aber heizreport.de passt zur tatsächlich geladenen Script-Domain"
  - "Intro-Absatz der neuen Sektion und Sektionsheader teilen sich denselben reveal-Wrapper (max-width:640px), der Widget-Wrapper (max-width:900px) bekommt einen eigenen reveal-Wrapper - konsistent mit dem Muster der Leistungen-Sektion"

requirements-completed: [LOGO-01, WIDGET-01, DSGVO-01, REVIEW-01]

duration: 35min
completed: 2026-08-01
---

# Quick Task 260801-tgu: Farbiges Logo, Wärmepumpen-Check-Widget, Site-Review Summary

**Farbiges Logo auf allen Seiten, neue verlinkbare Heizreport-Wärmepumpencheck-Sektion mit dynamischem Script-Loader, DSGVO-Abschnitt dafür, sowie mehrere risikoarme Review-Fixes (kaputte HTML-Verschachtelung, fehlendes lang-Attribut, tote Sitemap-URL)**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-08-01T19:26:34Z
- **Tasks:** 3/3
- **Files modified:** 4

## Accomplishments
- Impressum und Datenschutz zeigen jetzt das farbige Logo mit goldenem Glow (`drop-shadow`) statt des weiß eingefärbten Logos (`brightness(0) invert(1)`)
- Neue eigenständige Sektion `#waermepumpencheck` auf der Startseite mit dem unverändert übernommenen Heizreport-Widget-Snippet, erreichbar über Desktop-Nav, Mobile-Drawer, Footer-Nav und Scroll-Spy
- Heizreport-Script wird idempotent und retry-sicher in `componentDidMount()` nachgeladen (kein statisches `<script src>`, da vom Client-Renderer ignoriert)
- Datenschutzerklärung informiert jetzt vollständig über die heizreport.de-Einbindung inkl. Rechtsgrundlagen (Art. 6 Abs. 1 lit. f und b DSGVO) und verifiziertem Link zu den Datenschutzhinweisen des Anbieters
- Kaputte HTML-Verschachtelung auf der Datenschutz-Seite behoben (überzähliges `</div>` entfernt) — „Kontaktformular" und „Hosting" liegen jetzt korrekt im zentrierten Inhaltscontainer
- Alle drei Seiten deklarieren `lang="de"`
- `sitemap.xml` enthält keine tote URL zur entfernten Cookie-Richtlinie mehr (genau 3 gültige Einträge)

## Task Commits

Each task was committed atomically:

1. **Task 1: Farbiges Logo auf allen Seiten + risikoarme Review-Fixes** - `9182beb` (fix)
2. **Task 2: Heizreport-Wärmepumpencheck als eigene Sektion auf der Startseite** - `4b61178` (feat)
3. **Task 3: DSGVO-Abschnitt für Heizreport + Review-Bericht** - `137c199` (docs)

_Plan-Metadaten-Commit (SUMMARY, STATE) erfolgt separat durch den Orchestrator._

## Files Created/Modified
- `index.html` - `lang="de"`, neue Sektion `#waermepumpencheck` (Header, Intro-Text, unverändertes Widget-Snippet), Script-Loader in `componentDidMount()`, Nav-Einträge (Desktop/Drawer/Footer), Scroll-Spy-Eintrag, `c_wpcheck` in `renderVals()`
- `impressum/index.html` - `lang="de"`, Logo-Filter auf `drop-shadow` umgestellt
- `datenschutz/index.html` - `lang="de"`, Logo-Filter auf `drop-shadow` umgestellt, überzähliges `</div>` entfernt, neuer DSGVO-Abschnitt „Wärmepumpen-Check (heizreport.de)"
- `sitemap.xml` - Toten `cookie-richtlinie`-Eintrag entfernt

## Decisions Made
- Verlinkung der Heizreport-Datenschutzhinweise auf `https://heizreport.de/datenschutz` (HTTP 200 per curl verifiziert), da diese Domain auch das eingebundene Script liefert
- Script-Loader nutzt Retry mit Abbruch nach 20 Versuchen (à 150ms, max. 3s), um auf das clientseitig gerenderte `#wp_check_script`-Element zu warten, ohne Endlosschleife zu riskieren

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Review-Befunde

Folgende im Site-Review gefundenen Punkte wurden **nicht** umgesetzt (siehe Plan, Task 3b), sondern werden hier dokumentiert:

1. **KRITISCH — Kontaktformular funktioniert in Produktion nicht.** Das Formular in `index.html` postet in `onSubmit` (Zeile ~1565) per `fetch('sendMail.php', …)`. `sendMail.php` wird vom Deploy-Workflow nicht ausgeliefert, und GitHub Pages kann kein PHP ausführen (verifiziert: `grep -n "sendMail.php"` zeigt weiterhin den Aufruf in `index.html`). Der Request läuft ins Leere, Besucher sehen eine Fehlermeldung, Anfragen gehen verloren. **Empfehlung:** Umstellung auf einen statisch nutzbaren Dienst (Web3Forms ist laut `STATE.md` als FORM-04 bereits vorgesehen, aktuell nur wegen fehlendem Access Key zurückgestellt) oder Wechsel auf einen Hoster mit PHP-Unterstützung. **Vor dem Launch zu klären.**
2. **Kein Consent-Banner trotz eingebundenem Drittanbieter-Script.** Mit dem neuen Heizreport-Widget lädt die Startseite jetzt eine externe Ressource, die die IP-Adresse an einen Dritten überträgt. Das ist über Art. 6 Abs. 1 lit. f) DSGVO argumentierbar und wurde in der Datenschutzerklärung offengelegt; rechtssicherer wäre jedoch ein Consent-Mechanismus (Widget erst nach Klick/Zustimmung nachladen, „Zwei-Klick-Lösung"). Bewusste Kundenentscheidung, eigenes Arbeitspaket.
3. **Rechtsseiten sind `noindex`, stehen aber in der `sitemap.xml`.** `impressum/index.html` und `datenschutz/index.html` setzen `robots: noindex, follow`, sind aber weiterhin in der Sitemap gelistet — widersprüchliches Signal an Suchmaschinen. Nicht kritisch, daher nicht eigenmächtig geändert.
4. **Inkonsistente Containerbreiten auf den Rechtsseiten.** `datenschutz/index.html`: Header 980px, Inhalt 860px, Footer 860px. `impressum/index.html`: durchgängig 980px. Rein optisch/kosmetisch.
5. **`index_bundled.html` (435 KB) und `sendMail.php` liegen ungenutzt im Repository.** Werden nicht deployed, stiften aber Verwirrung. Empfehlung: aufräumen bzw. in ein Archiv-Verzeichnis verschieben.
6. **Fehlende `width`/`height`-Attribute an Bildern.** Alle `<img>` arbeiten nur mit CSS-Größen. Explizite Intrinsic-Größen würden Layout-Shift (CLS) reduzieren. Betrifft mehrere Stellen, separates Optimierungspaket.

Task 1e (allgemeines Review) hat keine weiteren risikoarmen Fehler zutage gefördert: alle `<img>`-Tags haben `alt`-Attribute, beide vorhandenen `target="_blank"`-Links (Google-Maps-Adresse) haben bereits `rel="noopener noreferrer"`, und alle internen `href="#…"`-Anker verweisen auf existierende Section-IDs.

## User Setup Required

None - keine externe Service-Konfiguration für diese Änderungen nötig. Das Heizreport-Widget benötigt keine zusätzlichen Zugangsdaten (Snippet ist bereits mit `data-heizreport-user="info@ms-bauconsult.de"` konfiguriert).

## Next Phase Readiness

- Logo, Widget und DSGVO-Abschnitt sind einsatzbereit; Widget-Rendering im Live-Browser sollte vor dem Launch einmal visuell geprüft werden (Drittanbieter-Script lässt sich nicht offline testen)
- **Blocker vor Launch:** Kontaktformular (`sendMail.php`) muss durch einen auf GitHub Pages funktionierenden Dienst ersetzt werden (siehe Review-Befund 1, hängt mit dem bereits bekannten FORM-04-Blocker aus `STATE.md` zusammen)

---
*Plan: quick-260801-tgu/01*
*Completed: 2026-08-01*

## Self-Check: PASSED

All modified files exist (`index.html`, `impressum/index.html`, `datenschutz/index.html`, `sitemap.xml`) and all three task commits (`9182beb`, `4b61178`, `137c199`) are present in `git log`.
