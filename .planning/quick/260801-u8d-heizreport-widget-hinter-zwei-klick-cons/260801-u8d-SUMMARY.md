---
phase: quick-260801-u8d
plan: 01
subsystem: consent, ui, dsgvo, seo
tags: [static-site, dsgvo, heizreport, consent, cls, sitemap]

# Dependency graph
requires:
  - phase: quick-260801-tgu
    provides: Heizreport-Wärmepumpencheck-Widget (Auto-Load), farbiges Logo auf allen Seiten
provides:
  - Zwei-Klick-Consent-Loader für das Heizreport-Widget (kein Request an heizreport.de vor Klick)
  - Aktualisierte Datenschutzerklärung mit Einwilligungs-Rechtsgrundlage (Art. 6 Abs. 1 lit. a) DSGVO, § 25 Abs. 1 TDDDG)
  - Vereinheitlichte Containerbreite (860px) auf impressum/ und datenschutz/
  - Bereinigte sitemap.xml (nur noch indexierbare Startseite)
  - Intrinsische Bildmaße (width/height) an allen img-Tags gegen Layout-Shift
affects: [legal-review, seo, performance]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zwei-Klick-Consent ohne Speicherung: state-Flag pro Seitenaufruf, Loader über this._hrLoad an Instanz gehängt, Injektion erst nach Klick"
    - "Persistentes Widget-Div: bleibt dauerhaft im DOM, Sichtbarkeit ausschließlich über display-Property des umgebenden Wrappers gesteuert (kein sc-if auf dem Snippet-Div selbst)"

key-files:
  created: []
  modified:
    - index.html
    - datenschutz/index.html
    - impressum/index.html
    - sitemap.xml

key-decisions:
  - "Widget-Div bleibt permanent im DOM (kein sc-if darauf), nur der umgebende Wrapper wird über display block/none umgeschaltet — verhindert Verlust der vom Drittanbieter-Script injizierten Kindknoten bei Consent-Wechsel"
  - "Keine Consent-Speicherung (kein Cookie/localStorage/sessionStorage) — Einwilligung gilt bewusst nur pro Seitenaufruf"
  - "Containerbreiten auf 860px vereinheitlicht (datenschutz/ als längeres Dokument blieb unangetastet, impressum/ wurde angepasst)"
  - "sitemap.xml enthält nur noch die Startseite, da impressum/ und datenschutz/ ohnehin robots: noindex setzen"

patterns-established:
  - "Drittanbieter-Script-Injektion hinter Nutzeraktion: Loader-Funktion vom Auto-Aufruf entkoppelt, über this.<name> an Komponenteninstanz gehängt, im Click-Handler via setTimeout(fn,0) im nächsten Macrotask aufgerufen"

requirements-completed: [CONSENT-01, DSGVO-02, REVIEW-02, REVIEW-03, REVIEW-04]

# Metrics
duration: ~20min
completed: 2026-08-01
---

# Phase quick-260801-u8d: Heizreport-Widget hinter Zwei-Klick-Consent Summary

**Heizreport-Wärmepumpencheck lädt erst nach Klick (kein Auto-Request an heizreport.de), Datenschutzerklärung auf Einwilligung (Art. 6 Abs. 1 lit. a) DSGVO / § 25 Abs. 1 TDDDG) umgestellt, Containerbreiten und Sitemap bereinigt, intrinsische Bildmaße gegen Layout-Shift ergänzt**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-08-01
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Zwei-Klick-Consent für das Heizreport-Widget implementiert: Platzhalter-Karte mit Hinweistext, Datenschutz-Link und Ladebutton; erst nach Klick wird `heizreport_3.js` injiziert
- Datenschutzerklärung beschreibt jetzt korrekt den Zwei-Klick-Ablauf, nennt Art. 6 Abs. 1 lit. a) DSGVO als primäre Rechtsgrundlage sowie § 25 Abs. 1 TDDDG, und erläutert Widerruf/Nicht-Speicherung
- Containerbreiten von impressum/ (vorher 980px) und datenschutz/ (860px) vereinheitlicht auf 860px
- sitemap.xml enthält nur noch die Startseite (impressum/ und datenschutz/ waren ohnehin noindex)
- Alle `<img>`-Tags in index.html, impressum/index.html und datenschutz/index.html haben jetzt width/height mit den echten Pixelmaßen (CLS-Reduktion), inklusive der 6 templategesteuerten Leistungs-Bilder

## Task Commits

Each task was committed atomically:

1. **Task 1: Zwei-Klick-Consent für das Heizreport-Widget** - `f81d118` (feat)
2. **Task 2: Datenschutzerklärung auf Einwilligung umstellen, Containerbreiten vereinheitlichen, Sitemap bereinigen** - `a1e95cb` (docs)
3. **Task 3: Intrinsische Bildmaße (width/height) an allen img-Tags ergänzen** - `c2a2674` (perf)

_Kein TDD-Ablauf — reine Markup/State-Änderungen an statischer, clientseitig gerenderter Website._

## Files Created/Modified
- `index.html` - wpConsent-State, entkoppelter Loader (this._hrLoad), renderVals (wpNotLoaded/wpDisplay/loadWpCheck), Platzhalter-Karte + persistenter Widget-Wrapper, width/height an allen 7 img-Tags, services-Array um w/h erweitert
- `datenschutz/index.html` - Heizreport-Abschnitt auf Einwilligung umgestellt (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG, Widerrufshinweis), width/height am Logo
- `impressum/index.html` - max-width von 980px auf 860px (4 Stellen), width/height am Logo
- `sitemap.xml` - impressum/ und datenschutz/ entfernt, nur Startseite verbleibt

## Decisions Made
- Widget-Div bleibt dauerhaft im DOM und wird nur über die display-Eigenschaft des Wrappers ein-/ausgeblendet (siehe key-decisions oben) — verhindert Verlust von durch das Drittanbieter-Script injizierten Kindknoten bei jedem Consent-Wechsel
- Keine Consent-Speicherung; Einwilligung gilt bewusst nur pro Seitenaufruf
- Containerbreiten-Vereinheitlichung auf 860px (schmalere, lesefreundlichere Breite für Rechtsseiten; datenschutz/ blieb als längeres Dokument unangetastet)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Keine. Alle automatisierten Verify-Blöcke (Grep-Zähler, sc-if-Balance, div-Balance, XML-Wohlgeformtheit, img width/height-Vollständigkeit, services w/h-Vollständigkeit) sind grün gelaufen.

Ein Punkt aus dem Plan konnte nur teilweise automatisiert geprüft werden: Ob die interpolierten `{{ item.w }}`/`{{ item.h }}`-Attribute am templategesteuerten Leistungs-Bild (index.html) im gerenderten DOM korrekt aufgelöst werden (statt als literaler Text zu erscheinen), ist laut Plan nur im Browser sichtbar (`<human-check>`-Abschnitt der Verifikation). Da `src` und `alt` an derselben Stelle bereits nachweislich interpoliert werden, ist ein Fehlschlag unwahrscheinlich; dies bleibt jedoch offen für die manuelle Prüfung im Browser gemäß Plan-Vorgabe.

## User Setup Required

None - keine externe Service-Konfiguration erforderlich. Das Kundensnippet (Script-URL und alle data-Attribute) wurde inhaltlich nicht verändert.

## Next Phase Readiness
- Automatisierte Verifikation vollständig grün; die im Plan vorgesehene manuelle Browser-Prüfung (`<human-check>` in der PLAN.md: Netzwerk-Tab, Klick-Verhalten, Scroll-Spy-Stabilität, `{{ item.w }}`-Rendering, visueller Abgleich impressum/datenschutz) steht noch aus und sollte vor dem nächsten Deploy durchgeführt werden
- Kein Blocker für nachfolgende Phasen; `sendMail.php`, Kontaktformular und alle `index_bundled.html`-Dateien wurden nicht angefasst (bestätigt über `git diff --stat`, das ausschließlich die vier geplanten Dateien zeigt)

---
*Phase: quick-260801-u8d*
*Completed: 2026-08-01*

## Self-Check: PASSED

- FOUND: index.html
- FOUND: datenschutz/index.html
- FOUND: impressum/index.html
- FOUND: sitemap.xml
- FOUND: commit f81d118
- FOUND: commit a1e95cb
- FOUND: commit c2a2674
