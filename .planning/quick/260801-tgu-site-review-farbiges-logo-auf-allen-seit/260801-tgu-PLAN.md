---
phase: quick-260801-tgu
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - index.html
  - impressum/index.html
  - datenschutz/index.html
  - sitemap.xml
autonomous: true
requirements: [LOGO-01, WIDGET-01, DSGVO-01, REVIEW-01]

must_haves:
  truths:
    - "Impressum und Datenschutz zeigen das farbige Logo (identisch zur Startseite), gut sichtbar auf dunklem Header"
    - "Auf der Startseite gibt es einen eigenen, verlinkbaren Abschnitt mit dem Heizreport-Wärmepumpencheck"
    - "Der Wärmepumpen-Check ist über Desktop-Navigation, Mobile-Drawer und Footer-Navigation erreichbar"
    - "Die Datenschutzerklärung informiert über die Einbindung von heizreport.de"
    - "Alle drei Seiten deklarieren die Sprache Deutsch (lang=\"de\")"
    - "Die Datenschutz-Seite hat valide HTML-Verschachtelung; alle Abschnitte liegen im zentrierten Inhaltscontainer"
    - "sitemap.xml enthält keine toten URLs mehr"
  artifacts:
    - path: "index.html"
      provides: "Sektion #waermepumpencheck + Navigations-Einträge + Heizreport-Script-Loader"
      contains: "wp_check_script"
    - path: "impressum/index.html"
      provides: "farbiges Logo im Header"
    - path: "datenschutz/index.html"
      provides: "farbiges Logo + Heizreport-Datenschutzabschnitt + reparierte div-Verschachtelung"
      contains: "heizreport"
    - path: "sitemap.xml"
      provides: "Sitemap ohne die entfernte Cookie-Richtlinie"
  key_links:
    - from: "index.html Navigation (Desktop/Drawer/Footer)"
      to: "#waermepumpencheck"
      via: "Anker-Links + Scroll-Spy"
      pattern: "waermepumpencheck"
    - from: "index.html componentDidMount"
      to: "https://heizreport.de/js/heizreport_3.js"
      via: "dynamisch injiziertes script-Element nach dem Rendern"
      pattern: "heizreport_3\\.js"
---

<objective>
Drei zusammenhängende Verbesserungen an der MS-Bauconsult-Website:

1. **Farbiges Logo überall** — Impressum und Datenschutz zeigen aktuell ein weiß eingefärbtes Logo (`filter:brightness(0) invert(1)`). Der Kunde will überall das farbige Original.
2. **Heizreport-Wärmepumpencheck** — Vom Kunden geliefertes Widget als eigene, verlinkbare Sektion auf der Startseite einbauen, inklusive DSGVO-Abschnitt in der Datenschutzerklärung.
3. **Site-Review** — Die gesamte Seite auf Verbesserungspotenzial prüfen; kleine, risikoarme Fehler direkt beheben, größere Empfehlungen nur dokumentieren.

Purpose: Kundenwunsch umsetzen (Logo + Widget), rechtliche Absicherung des externen Scripts, und die vor dem Launch noch offenen Qualitätsmängel sichtbar machen.
Output: Angepasste `index.html`, `impressum/index.html`, `datenschutz/index.html`, `sitemap.xml` + SUMMARY mit Review-Bericht.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Kein `CLAUDE.md`, keine Projekt-Skills vorhanden — es gelten die unten dokumentierten Konventionen.

**Wichtige, bereits verifizierte Fakten (nicht erneut prüfen):**

- Deploy erfolgt über `.github/workflows/deploy.yml`. Deployed werden **ausschließlich**: `index.html`, `impressum/index.html`, `datenschutz/index.html`, `assets/`, `favicon.svg`, `robots.txt`, `sitemap.xml`, `.nojekyll`.
- `index_bundled.html` und alle anderen `*_bundled.html` sind Alt-Artefakte, werden **nicht** deployed → **nicht anfassen**.
- Alle sichtbaren Texte sind Deutsch. Korrekte Orthographie mit ä/ö/ü/ß ist Pflicht.

**Rendering-Architektur (entscheidend für Task 2):**

Die Seiten sind Single-File-Komponenten eines Client-Side-Frameworks (`assets/bundle_2.js`). Der Markup liegt in `<x-dc>…</x-dc>` und enthält `{{ }}`-Platzhalter, `<sc-if>`- und `<sc-for>`-Elemente. Die Logik steht am Dateiende in `<script type="text/x-dc">` als `class Component extends DCLogic` mit `state`, `componentDidMount()`, `componentDidUpdate()`, `renderVals()`.

Konsequenz: Ein statisches `<script src="…">` im Markup wird beim Client-Rendering **nicht ausgeführt**. Externe Scripts müssen deshalb in `componentDidMount()` dynamisch injiziert werden.

**Styling-Konventionen:** Ausschließlich Inline-Styles. Kein Tailwind, keine Utility-Klassen. Akzentfarbe: `var(--accent,#FFC000)`. Überschriften: `font-family:'Saira SemiCondensed','Saira',sans-serif;font-weight:600;text-transform:uppercase`. Sektionspadding: `clamp(72px,11vw,140px) 0`. Container: `max-width:1280px;margin:0 auto;padding:0 clamp(20px,5vw,48px)`. Scroll-Animationen über `class="reveal"`.

**Referenz-Sektionsheader (aus `index.html` „Leistungen", Zeilen 1314-1319) — dieses Muster für die neue Sektion übernehmen:**

```
<div class="reveal" style="max-width:640px;margin-bottom:clamp(40px,6vw,64px)">
  <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
    <span style="width:36px;height:2px;background:var(--accent,#FFC000)"></span>
    <span style="font-size:13px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:#6B6864">Leistungen</span>
  </div>
  <h2 style="margin:0;font-family:'Saira SemiCondensed','Saira',sans-serif;font-weight:600;font-size:clamp(28px,4vw,50px);line-height:1.05;letter-spacing:-.4px;text-transform:uppercase;color:#181716">…</h2>
</div>
```

**Relevante Fundstellen (Zeilennummern vor den Änderungen):**

| Datei | Zeile | Inhalt |
|-------|-------|--------|
| `index.html` | 2 | `<html><head>` — kein `lang` |
| `index.html` | 1169 | Header-Logo, farbig mit `drop-shadow(0 0 10px rgba(212,160,23,.35))` |
| `index.html` | 1172-1177 | Desktop-`<nav>` (Start / Über mich / Leistungen / Kontakt-Button) |
| `index.html` | 1200-1205 | Mobile-Drawer-`<nav>` |
| `index.html` | 1336 | Ende der Leistungen-Sektion |
| `index.html` | 1339 | Beginn `<section id="kontakt">` |
| `index.html` | 1403 | Footer-Logo, farbig mit `drop-shadow(0 0 8px rgba(212,160,23,.25))` |
| `index.html` | 1408-1413 | Footer-`<nav>` |
| `index.html` | 1458 | Scroll-Spy: `const ids = ['start','ueber','leistungen','kontakt'];` |
| `index.html` | 1479 | Letzte Zeile in `componentDidMount()` (Hero-Höhen-Logik) |
| `index.html` | 1507-1509 | `c_start` / `c_ueber` / `c_leistungen` in `renderVals()` |
| `impressum/index.html` | 2 | `<html><head>` |
| `impressum/index.html` | 349 | Logo mit `filter:brightness(0) invert(1)` |
| `datenschutz/index.html` | 2 | `<html><head>` |
| `datenschutz/index.html` | 348 | Logo mit `filter:brightness(0) invert(1)` |
| `datenschutz/index.html` | 402 | **Überzähliges `</div>`** — schließt den Inhaltscontainer zu früh |
| `datenschutz/index.html` | 411-415 | Abschnitt „Hosting" (letzter Abschnitt vor `</main>`) |

**Header-Hintergrund auf Impressum/Datenschutz:** `rgba(8,8,8,.92)` über `background:#000` — also dunkel, genau wie auf der Startseite. Das farbige Logo funktioniert dort unverändert; die gleiche `drop-shadow`-Technik wie auf `index.html` reicht aus. Kein heller Hintergrund-Chip nötig.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Farbiges Logo auf allen Seiten + risikoarme Review-Fixes</name>
  <files>impressum/index.html, datenschutz/index.html, index.html, sitemap.xml</files>
  <action>
Sechs kleine, in sich abgeschlossene Korrekturen:

**1a — Farbiges Logo (Kundenwunsch).** In `impressum/index.html` (Zeile 349) und `datenschutz/index.html` (Zeile 348) im `<img src="../assets/logo.png">` den Inline-Style-Anteil `filter:brightness(0) invert(1)` ersetzen durch `filter:drop-shadow(0 0 8px rgba(212,160,23,.35))`. Damit erscheint das Logo farbig und erhält denselben goldenen Glow-Rand wie das Footer-Logo auf `index.html` (Zeile 1403) — auf dem dunklen Header (`rgba(8,8,8,.92)`) gut sichtbar. `height:34px;width:auto` unverändert lassen. Keine weiteren Attribute ändern.

**1b — Sprachdeklaration.** In allen drei Seiten (`index.html`, `impressum/index.html`, `datenschutz/index.html`) jeweils Zeile 2 von `<html><head>` auf `<html lang="de"><head>` ändern. Bisher fehlt die Sprachangabe komplett — relevant für Screenreader, Browser-Übersetzung und SEO.

**1c — Kaputte HTML-Verschachtelung auf der Datenschutz-Seite.** In `datenschutz/index.html` steht in Zeile 402 ein überzähliges `</div>`, das den zentrierten Inhaltscontainer (`max-width:860px`, geöffnet in Zeile 365) bereits nach dem Abschnitt „Kontaktanfragen / Kontaktmöglichkeit" schließt. Dadurch stehen die beiden folgenden Abschnitte („Kontaktformular – technische Verarbeitung", „Hosting") außerhalb des Containers: volle Fensterbreite, ohne seitliches Padding, ohne den Flex-Gap. Das überzählige `</div>` in Zeile 402 sowie die anschließende Leerzeile mit Restwhitespace (Zeile 403) entfernen. Das `</div>` in Zeile 417 bleibt und schließt den Container dann korrekt. Danach ist die div-Bilanz ausgeglichen (aktuell 9 öffnende / 10 schließende → danach 9 / 9).

**1d — Tote URL in der Sitemap.** In `sitemap.xml` den kompletten `<url>`-Block für `https://ms-bauconsult.de/cookie-richtlinie/` entfernen (inkl. `<loc>`, `<changefreq>`, `<priority>` und den umschließenden Tags). Die Cookie-Richtlinie wurde in Phase 1 entfernt und wird vom Deploy-Workflow nicht ausgeliefert — der Eintrag verweist ins Leere und produziert 404-Meldungen in der Search Console. Die drei verbleibenden Einträge (`/`, `/impressum/`, `/datenschutz/`) unverändert lassen.

**1e — Restliches Review.** Beim Durcharbeiten der drei Dateien auf weitere offensichtliche, risikoarme Fehler achten (kaputte interne Links, fehlende `alt`-Attribute, fehlendes `rel="noopener noreferrer"` bei `target="_blank"`, Tippfehler in deutschen Texten, falsche Umlaute). Nur eindeutige Fehler beheben. Alles, was Designentscheidungen, Textinhalte oder Verhalten verändert, **nicht** anfassen, sondern für Task 3 notieren.

**Nicht anfassen:** `index_bundled.html`, `sendMail.php`, `assets/bundle_*.js`, `.github/workflows/deploy.yml`.
  </action>
  <verify>
    <automated>cd "D:/Vizionists/msbauconsult" &amp;&amp; test $(grep -c 'html lang="de"' index.html) -eq 1 &amp;&amp; test $(grep -c 'html lang="de"' impressum/index.html) -eq 1 &amp;&amp; test $(grep -c 'html lang="de"' datenschutz/index.html) -eq 1 &amp;&amp; test $(grep -c 'brightness(0) invert(1)' impressum/index.html) -eq 0 &amp;&amp; test $(grep -c 'brightness(0) invert(1)' datenschutz/index.html) -eq 0 &amp;&amp; test $(grep -c 'drop-shadow' impressum/index.html) -eq 1 &amp;&amp; test $(grep -c 'drop-shadow' datenschutz/index.html) -eq 1 &amp;&amp; test $(grep -c 'cookie-richtlinie' sitemap.xml) -eq 0 &amp;&amp; test $(grep -o '&lt;div' datenschutz/index.html | wc -l) -eq $(grep -o '&lt;/div&gt;' datenschutz/index.html | wc -l) &amp;&amp; echo TASK1-OK</automated>
  </verify>
  <done>Beide Rechtsseiten zeigen das farbige Logo mit Glow; alle drei Seiten haben `lang="de"`; die div-Bilanz in `datenschutz/index.html` ist ausgeglichen; `sitemap.xml` enthält keinen `cookie-richtlinie`-Eintrag mehr.</done>
</task>

<task type="auto">
  <name>Task 2: Heizreport-Wärmepumpencheck als eigene Sektion auf der Startseite</name>
  <files>index.html</files>
  <action>
Das vom Kunden gelieferte Widget als eigenständige, verlinkbare Sektion einbauen. **Das Snippet ist exakt wie geliefert zu übernehmen — Script-URL, `id`, `class` und alle `data-*`-Werte dürfen nicht verändert werden.**

Geliefertes Snippet (Doku: https://heiz.report/api/v2/docs.html):

- Script: `https://heizreport.de/js/heizreport_3.js`
- Container: `<div id="wp_check_script" class="heizreport" data-heizreport-ansprache="du" data-primary-color="#3371b7" data-heizreport-user="info@ms-bauconsult.de"></div>`

**2a — Sektion einfügen.** Zwischen dem Ende der Leistungen-Sektion (`</section>`, Zeile 1336) und dem `<!-- CONTACT -->`-Kommentar (Zeile 1338) eine neue Sektion einfügen:

- `<section id="waermepumpencheck">` mit `background:#FFFFFF` und `padding:clamp(72px,11vw,140px) 0`. Weiß statt des Leistungen-Beige (`#F5F3EF`), damit sich die Sektion optisch absetzt und die blaue Primärfarbe des Widgets (`#3371b7`) sauber zur Geltung kommt.
- Darin der Standard-Container `max-width:1280px;margin:0 auto;padding:0 clamp(20px,5vw,48px)`.
- Sektionsheader exakt nach dem Referenz-Muster aus `<context>`: Akzentstrich + Eyebrow-Label **„Wärmepumpen-Check"** (Farbe `#6B6864`) + `<h2>` mit dem Text **„Passt eine Wärmepumpe zu Ihrem Haus?"** (Farbe `#181716`).
- Darunter ein einleitender Absatz im Stil der Leistungen-Karten-Texte (`font-size:17px;line-height:1.75;color:#6B6864;max-width:60ch`), sinngemäß: kostenloser Kurzcheck, in wenigen Minuten eine erste Einschätzung zur Eignung einer Wärmepumpe für die eigene Immobilie, unverbindlich.
- Anschließend ein Wrapper-`<div>` mit `max-width:900px` und `margin-top:clamp(32px,4vw,48px)`, das den unveränderten Widget-Container enthält.
- Der äußere Inhaltsblock bekommt `class="reveal"` (konsistent mit den übrigen Sektionen). **Der Widget-Container selbst bekommt keine zusätzliche Klasse und keine zusätzlichen Attribute** — er bleibt exakt wie geliefert.

**2b — Script dynamisch laden.** Ein statisches `<script src="…">` im `<x-dc>`-Markup wird vom Client-Renderer nicht ausgeführt. Deshalb am Ende von `componentDidMount()` (nach der bestehenden Hero-Höhen-Logik in Zeile 1479) einen idempotenten Loader ergänzen, der prüft, ob das Script bereits im DOM ist, und es andernfalls als `<script>`-Element mit `src="https://heizreport.de/js/heizreport_3.js"` und `async` an `document.body` anhängt. Zur Wiedererkennung ein eigenes `id`-Attribut (z. B. `heizreport-sdk`) am Script-Element setzen — die `src` selbst bleibt unverändert. Der Loader muss laufen, **nachdem** `#wp_check_script` im DOM existiert; falls der Renderer das Markup erst nach `componentDidMount()` einhängt, den Loader in ein `setTimeout(…, 0)` verpacken bzw. das Anhängen erst ausführen, wenn `document.getElementById('wp_check_script')` gefunden wird (kurzes Retry-Intervall mit klarem Abbruch nach wenigen Versuchen, damit keine Endlosschleife entsteht).

**2c — Navigation anbinden.** Der neue Abschnitt muss von überall erreichbar sein. Label überall einheitlich **„Wärmepumpe"** (kurz genug, damit die Desktop-Navigation nicht umbricht):

- **Desktop-Nav** (Zeilen 1172-1177): neuer `<a>` zwischen „Leistungen" und dem Kontakt-Button, exakt im Stil der bestehenden Nav-Links, mit `href="#waermepumpencheck"`, `onclick="{{ navClick }}"`, `data-target="waermepumpencheck"` und `color: {{ c_wpcheck }}`.
- **Mobile-Drawer** (Zeilen 1200-1205): neuer `<a>` zwischen „Leistungen" und „Kontakt", im Stil der bestehenden Drawer-Links, `onclick="{{ closeMenu }}"`, `href="#waermepumpencheck"`. Die `animation`-Verzögerungen der nachfolgenden Einträge sinnvoll nachziehen (bestehende Staffelung .35s / .42s / .49s / .56s um einen Schritt erweitern).
- **Footer-Nav** (Zeilen 1408-1413): neuer `<a href="#waermepumpencheck">` zwischen „Leistungen" und „Kontakt", im Stil der bestehenden Footer-Links.
- **Scroll-Spy** (Zeile 1458): `'waermepumpencheck'` in das `ids`-Array einfügen, an der richtigen Position zwischen `'leistungen'` und `'kontakt'` (die Reihenfolge muss der DOM-Reihenfolge entsprechen, sonst springt die Aktiv-Markierung).
- **`renderVals()`** (bei Zeilen 1507-1509): `c_wpcheck` analog zu `c_leistungen` ergänzen: Akzentfarbe wenn `this.state.active === 'waermepumpencheck'`, sonst `'#fff'`.

Die bestehende `navClick`-Logik behandelt unbekannte Targets bereits über den generischen Zweig (sucht `h2,h3` und scrollt mit 100px Offset zum ersten Element des Elternblocks) — es sind **keine** Änderungen an `navClick` oder `closeMenu` nötig.
  </action>
  <verify>
    <automated>cd "D:/Vizionists/msbauconsult" &amp;&amp; test $(grep -c 'id="wp_check_script"' index.html) -eq 1 &amp;&amp; grep -q 'data-heizreport-ansprache="du"' index.html &amp;&amp; grep -q 'data-primary-color="#3371b7"' index.html &amp;&amp; grep -q 'data-heizreport-user="info@ms-bauconsult.de"' index.html &amp;&amp; grep -q 'heizreport.de/js/heizreport_3.js' index.html &amp;&amp; test $(grep -c 'id="waermepumpencheck"' index.html) -eq 1 &amp;&amp; test $(grep -c 'waermepumpencheck' index.html) -ge 7 &amp;&amp; grep -q "'leistungen', *'waermepumpencheck', *'kontakt'" index.html &amp;&amp; grep -q 'c_wpcheck' index.html &amp;&amp; test $(grep -o '&lt;div' index.html | wc -l) -eq $(grep -o '&lt;/div&gt;' index.html | wc -l) &amp;&amp; test $(grep -o '&lt;section' index.html | wc -l) -eq $(grep -o '&lt;/section&gt;' index.html | wc -l) &amp;&amp; echo TASK2-OK</automated>
  </verify>
  <done>`index.html` enthält die Sektion `#waermepumpencheck` mit dem unveränderten Widget-Snippet, den Script-Loader in `componentDidMount()`, Navigationseinträge in Desktop-Nav, Drawer und Footer, den Scroll-Spy-Eintrag sowie `c_wpcheck` in `renderVals()`. div- und section-Tags sind ausgeglichen.</done>
</task>

<task type="auto">
  <name>Task 3: DSGVO-Abschnitt für Heizreport + Review-Bericht</name>
  <files>datenschutz/index.html</files>
  <action>
**3a — Datenschutzabschnitt ergänzen.** In `datenschutz/index.html` nach dem Abschnitt „Hosting" (endet in Zeile 415, Zählung **vor** Task 1; nach Task 1 verschiebt sich das um zwei Zeilen nach oben) und **innerhalb** des durch Task 1 reparierten Inhaltscontainers einen neuen `<section>`-Block einfügen. Struktur und Inline-Styles exakt vom „Hosting"-Abschnitt übernehmen:

- `<section style="border-top:1px solid #1a1a1a;padding-top:clamp(36px,5vw,52px);margin-top:clamp(36px,5vw,52px)">`
- `<h2>` im Seitenstil (`margin:0 0 16px;font-family:'Saira SemiCondensed','Saira',sans-serif;font-weight:600;font-size:22px;letter-spacing:.4px;text-transform:uppercase;color:#fff`), Text: **„Wärmepumpen-Check (heizreport.de)"**
- Fließtext-Absätze mit `margin:0 0 14px;font-size:16px;line-height:1.85;color:#a8a8a8`
- Der Absatz mit der Rechtsgrundlage — wie bei allen anderen Abschnitten der Seite — hervorgehoben mit `margin:0;font-size:16px;line-height:1.85;color:#c2c2c2;font-weight:500`

Inhaltlich abzudecken (Sie-Form, wie der Rest der Seite; ganze Sätze, korrekte Umlaute):

1. Auf der Startseite ist ein Wärmepumpen-Check des Anbieters heizreport.de eingebunden, mit dem Besucher eine erste Einschätzung zur Eignung einer Wärmepumpe für ihre Immobilie erhalten können.
2. Beim Aufruf der Seite wird ein Script von den Servern des Anbieters (heizreport.de) geladen. Dabei wird technisch zwingend die IP-Adresse des Besuchers an den Anbieter übertragen; zusätzlich können Browser- und Geräteinformationen sowie die aufrufende Seite übermittelt werden.
3. Geben Besucher im Check Angaben zu ihrer Immobilie oder Kontaktdaten ein, werden diese an den Anbieter übermittelt und dort verarbeitet, um das Ergebnis zu erstellen und die Anfrage an uns weiterzuleiten.
4. Zweck: unverbindliche Erstberatung und Kontaktanbahnung. Rechtsgrundlage: **Art. 6 Abs. 1 lit. f) DSGVO** — berechtigtes Interesse an einem bedarfsgerechten, informativen Angebot. Bei aktiver Nutzung des Checks zusätzlich **Art. 6 Abs. 1 lit. b) DSGVO** (Vertragsanbahnung).
5. Hinweis auf die Datenschutzinformationen des Anbieters. Die URL vorher mit einem Fetch prüfen (Kandidaten: `https://heizreport.de/datenschutz`, `https://heiz.report/datenschutz`). **Nur** verlinken, wenn die URL tatsächlich erreichbar ist — Link-Styling wie auf den Rechtsseiten üblich: `style="text-decoration:none;color:var(--accent,#FFC000)"` mit `target="_blank" rel="noopener noreferrer"`. Wenn keine URL verifizierbar ist, den Anbieter nur im Text nennen („Einzelheiten entnehmen Sie den Datenschutzhinweisen des Anbieters unter heizreport.de.") und **keinen** Link setzen. Keine erfundenen Firmenanschriften oder Rechtsformen erfinden — nur nennen, was verifiziert wurde.

**3b — Review-Bericht in die SUMMARY.** Die folgenden im Review gefundenen Punkte werden **nicht** umgesetzt, sondern in der SUMMARY unter „Review-Befunde" dokumentiert. Diese Befunde sind bereits verifiziert und müssen nicht erneut geprüft werden:

- **KRITISCH — Kontaktformular funktioniert in Produktion nicht.** Das Formular in `index.html` postet in `onSubmit` (Zeile ~1543) per `fetch('sendMail.php', …)`. `sendMail.php` wird vom Deploy-Workflow gar nicht ausgeliefert, und GitHub Pages kann PHP grundsätzlich nicht ausführen. Der Request läuft ins Leere → Besucher sehen die Fehlermeldung, Anfragen gehen verloren. Empfehlung: auf einen statisch nutzbaren Dienst umstellen (Web3Forms ist laut `STATE.md` bereits als FORM-04 vorgesehen und nur wegen des fehlenden Access Keys zurückgestellt) — oder auf einen Hoster mit PHP wechseln. **Vor dem Launch zu klären.**
- **Kein Consent-Banner trotz eingebundenem Drittanbieter-Script.** Mit dem Heizreport-Widget lädt die Seite jetzt eine externe Ressource, die die IP-Adresse an einen Dritten überträgt. Das ist über Art. 6 Abs. 1 lit. f) DSGVO argumentierbar und in der Datenschutzerklärung offengelegt, rechtssicherer wäre jedoch ein Consent-Mechanismus (Widget erst nach Klick/Zustimmung nachladen, „Zwei-Klick-Lösung"). Das ist eine bewusste Entscheidung des Kunden und ein eigenes Arbeitspaket.
- **Rechtsseiten sind `noindex`, stehen aber in der `sitemap.xml`.** `impressum/index.html` und `datenschutz/index.html` setzen `robots: noindex, follow`, werden aber in der Sitemap gelistet. Widersprüchliches Signal an Suchmaschinen. Empfehlung: entweder aus der Sitemap entfernen oder `noindex` streichen. Nicht kritisch, deshalb nicht eigenmächtig geändert.
- **Inkonsistente Containerbreiten auf den Rechtsseiten.** `datenschutz/index.html`: Header 980px, Inhalt 860px, Footer 860px. `impressum/index.html`: durchgängig 980px. Rein optisch, kosmetisch.
- **`index_bundled.html` (435 KB) und `sendMail.php` liegen ungenutzt im Repository.** Werden nicht deployed, stiften aber Verwirrung. Empfehlung: aufräumen bzw. in ein Archiv-Verzeichnis verschieben.
- **Fehlende `width`/`height`-Attribute an Bildern.** Alle `<img>` arbeiten nur mit CSS-Größen. Explizite Intrinsic-Größen würden Layout-Shift (CLS) reduzieren. Betrifft mehrere Stellen, deshalb als separates Optimierungspaket vermerkt.

Falls in Task 1e weitere Befunde aufgetaucht sind, diese unter denselben Punkt aufnehmen.
  </action>
  <verify>
    <automated>cd "D:/Vizionists/msbauconsult" &amp;&amp; grep -qi 'heizreport' datenschutz/index.html &amp;&amp; grep -q 'Wärmepumpen-Check' datenschutz/index.html &amp;&amp; grep -q 'Art. 6 Abs. 1 lit. f) DSGVO' datenschutz/index.html &amp;&amp; test $(grep -o '&lt;section' datenschutz/index.html | wc -l) -eq $(grep -o '&lt;/section&gt;' datenschutz/index.html | wc -l) &amp;&amp; test $(grep -o '&lt;div' datenschutz/index.html | wc -l) -eq $(grep -o '&lt;/div&gt;' datenschutz/index.html | wc -l) &amp;&amp; echo TASK3-OK</automated>
  </verify>
  <done>`datenschutz/index.html` enthält einen stilkonformen Heizreport-Abschnitt mit Zweck, Datenübertragung und Rechtsgrundlage, korrekt im Inhaltscontainer verschachtelt. Die sechs Review-Befunde sind in der SUMMARY dokumentiert.</done>
</task>

</tasks>

<verification>
**Automatisiert (nach allen Tasks):**

```bash
cd "D:/Vizionists/msbauconsult"
# Tag-Bilanz auf allen drei Seiten
for f in index.html impressum/index.html datenschutz/index.html; do
  echo "$f div: $(grep -o '<div' $f | wc -l)/$(grep -o '</div>' $f | wc -l)  section: $(grep -o '<section' $f | wc -l)/$(grep -o '</section>' $f | wc -l)"
done
# Widget-Snippet unverändert
grep -o 'data-heizreport-[a-z]*="[^"]*"\|data-primary-color="[^"]*"' index.html
# Sitemap valide
node -e "require('fs').readFileSync('sitemap.xml','utf8')" && grep -c '<url>' sitemap.xml   # muss 3 sein
```

**Human-Check (Drittanbieter-Widget lässt sich nicht offline testen):**

1. `index.html` lokal im Browser öffnen (z. B. `npx serve .` oder Live-Server — `file://` kann externe Scripts blockieren).
2. Zur Sektion „Wärmepumpen-Check" scrollen: Das Heizreport-Widget rendert sichtbar (nicht nur ein leeres `<div>`). Browser-Konsole zeigt keine Fehler zu `heizreport_3.js`.
3. Navigation prüfen: „Wärmepumpe" erscheint in der Desktop-Navigation, im Mobile-Drawer (< 900px) und im Footer; jeder Klick scrollt sauber zur Sektion; die Aktiv-Markierung in der Desktop-Nav springt beim Scrollen korrekt mit.
4. `impressum/index.html` und `datenschutz/index.html` öffnen: Logo ist farbig und auf dem dunklen Header gut lesbar.
5. Datenschutz-Seite komplett durchscrollen: Alle Abschnitte — auch „Kontaktformular", „Hosting" und der neue Heizreport-Abschnitt — liegen im zentrierten Textcontainer und laufen nicht über die volle Fensterbreite.
</verification>

<success_criteria>
- Impressum und Datenschutz zeigen das farbige Logo mit Glow-Effekt, kein `brightness(0) invert(1)` mehr im Repo
- `index.html` hat eine eigene Sektion `#waermepumpencheck` mit dem **unverändert** übernommenen Heizreport-Snippet
- Das Widget rendert im Browser sichtbar
- „Wärmepumpe" ist in Desktop-Nav, Mobile-Drawer, Footer-Nav und Scroll-Spy angebunden
- `datenschutz/index.html` informiert stilkonform über heizreport.de inkl. Rechtsgrundlage
- Alle drei Seiten haben `lang="de"`; div-/section-Bilanz auf allen Seiten ausgeglichen
- `sitemap.xml` enthält genau 3 gültige URLs
- Die SUMMARY dokumentiert die sechs Review-Befunde, allen voran das nicht funktionierende Kontaktformular
- Keine Änderungen an `index_bundled.html`, `sendMail.php`, `assets/bundle_*.js` oder `.github/workflows/deploy.yml`
</success_criteria>

<output>
Erstelle `.planning/quick/260801-tgu-site-review-farbiges-logo-auf-allen-seit/260801-tgu-SUMMARY.md` nach Abschluss.
Die SUMMARY muss einen Abschnitt **„Review-Befunde"** enthalten (siehe Task 3b) — mit dem kaputten Kontaktformular als klar markiertem Blocker vor dem Launch.
</output>
