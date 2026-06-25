# MS Bauconsult — Website (Nocturne)

Modernisierte Website für **MS Bauconsult** (Muhamed Shala, M.Eng.) — Ingenieurbüro für Bau- und Energieberatung, Fellbach.

## Inhalt dieses Ordners

Vier eigenständige HTML-Dateien — jede ist komplett in sich geschlossen (Logik/Styles eingebettet), keine Build-Tools nötig:

| Datei | Seite |
|-------|-------|
| `index.html` | Startseite (Hero, Über mich, Leistungen, Kontakt) |
| `impressum.html` | Impressum |
| `datenschutz.html` | Datenschutzerklärung |
| `cookie-richtlinie.html` | Cookie-Richtlinie (EU) |

Die Seiten sind untereinander verlinkt (Footer + „Zur Startseite").

## Auf GitHub stellen & veröffentlichen (GitHub Pages)

1. Neues Repository anlegen (z. B. `ms-bauconsult`).
2. Die vier `.html`-Dateien (und optional diese README) ins Repo hochladen — direkt in den Hauptordner (root).
3. Im Repo: **Settings → Pages → Source: „Deploy from a branch"**, Branch `main`, Ordner `/ (root)`, **Save**.
4. Nach ca. 1 Minute ist die Seite unter `https://<dein-name>.github.io/ms-bauconsult/` erreichbar.

Für eine eigene Domain (z. B. `ms-bauconsult.de`): unter **Settings → Pages → Custom domain** eintragen und beim Domain-Anbieter einen CNAME-/A-Record auf GitHub Pages setzen.

> Alternativ funktioniert das Hosting genauso bei Netlify, Vercel oder jedem klassischen Webhosting (Dateien per FTP in den Webspace legen).

## Wichtig vor dem echten Live-Gang

1. **Bilder & Logo lokal einbinden** (Skript liegt bei). Aktuell laden Bilder und Logo noch von der alten Adresse `ms-bauconsult.de`. Sobald die alte Seite abgeschaltet wird, fehlen sie. Lokal in VS Code lösen:
   ```bash
   node localize-images.mjs
   ```
   Das Skript lädt alle 9 Bilder in den Ordner `assets/` herunter und stellt in allen `.html`-Dateien die Links automatisch auf die lokalen Dateien um. Voraussetzung: Node.js 18+. Danach committen — die Seite ist dann vollständig serverunabhängig.
2. **Kontaktformular anbinden.** Das Formular zeigt bisher nur eine Bestätigung an; es verschickt noch keine E-Mail. Für echten Versand braucht es einen Dienst wie [Formspree](https://formspree.io), [Web3Forms](https://web3forms.com) oder eine kleine Server-Funktion.
3. **Rechtstexte prüfen.** Impressum, Datenschutz und Cookie-Richtlinie wurden von der bestehenden Seite übernommen. Da die neue Seite **ohne WordPress** läuft, sollten die in der Cookie-Richtlinie gelisteten Cookies (WordPress, Google Analytics, Complianz, Elementor) an den tatsächlichen Stand angepasst und das Impressum auf Vollständigkeit geprüft werden (ggf. USt-ID / Kammer / Berufshaftpflicht).

## Bearbeiten

Die bearbeitbaren Quelldateien liegen im übergeordneten Projekt als `*.dc.html`. Diese vier `*.html` hier sind die fertig gebündelte Auslieferungs-Version.
