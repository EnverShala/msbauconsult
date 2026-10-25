# MS Bauconsult – Website-Relaunch

One-Page-Website für ein Ingenieurbüro für Bau- und Energieberatung in Fellbach: statisches HTML, Tailwind-CSS und ein einzelnes Vanilla-JS-Modul, ganz ohne Framework und Laufzeit-Bibliothek. Vor einer Nutzerinteraktion gibt es null externe Anfragen. Die Seite kommt ohne Cookies und Cookie-Banner aus, und der Wärmepumpen-Check eines Drittanbieters lädt erst nach Klick-Einwilligung. Eine strenge Content-Security-Policy, Spam-Schutz ohne CAPTCHA (Honeypot, Zeitfalle, Rate-Limit) und strukturierte Daten für Suchmaschinen runden sie ab. Lighthouse misst mobil 99/100/100/100 (Performance, Barrierefreiheit, Best Practices, SEO), axe-core 0 WCAG-AA-Verstöße – abgesichert durch eine automatisierte Prüfsuite.

## Tech-Stack

- HTML5 (semantisch, native `<dialog>`, JSON-LD)
- Tailwind CSS v3 (Standalone-CLI, ohne Node-Build)
- Vanilla JavaScript (Canvas-Animation, Fetch-API)
- PHP (Kontaktformular-Endpoint)
- Apache `.htaccess` (CSP, Security-Header, Caching, Kompression, saubere URLs)
- Selbst gehostete Webfonts (WOFF2) und Inline-SVG-Icons (Lucide)
- AVIF/WebP-Bilder (Pillow)
- Playwright, Lighthouse und axe-core (automatisierte Tests)
