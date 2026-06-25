#!/usr/bin/env node
/*
 * MS Bauconsult — Bilder lokalisieren
 * --------------------------------------------------
 * Lädt alle von ms-bauconsult.de verlinkten Bilder in den Ordner ./assets/
 * herunter und ersetzt in allen .html-Dateien die externen URLs durch
 * lokale Pfade. Danach ist die Seite vollständig serverunabhängig.
 *
 * Voraussetzung: Node.js 18 oder neuer (eingebautes fetch).
 * Ausführen (im Ordner dieser Datei):  node localize-images.mjs
 */

import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { writeFile as writeBin } from 'node:fs/promises';
import path from 'node:path';

const BASE = 'https://ms-bauconsult.de/wp-content/uploads';
const images = {
  'cropped-Logo_trans-250x83.png': `${BASE}/2025/05/cropped-Logo_trans-250x83.png`,
  'shutterstock_34071343.png': `${BASE}/2025/04/shutterstock_34071343.png`,
  'shutterstock_61563004.png': `${BASE}/2025/04/shutterstock_61563004.png`,
  'kfw_bafa.png': `${BASE}/2025/04/kfw_bafa.png`,
  'energieausweis-1.jpg': `${BASE}/2025/04/energieausweis-1.jpg`,
  'iSFP-sanierung-einzelmassnahmen-bafa-dena.jpg': `${BASE}/2025/04/iSFP-sanierung-einzelmassnahmen-bafa-dena.jpg`,
  'unsplash_01.png': `${BASE}/2025/04/unsplash_01.png`,
  'ms.profil-300x246.png': `${BASE}/2025/05/ms.profil-300x246.png`,
  'eee-300x73.png': `${BASE}/2025/05/eee-300x73.png`,
};

async function main() {
  await mkdir('assets', { recursive: true });

  // 1) Bilder herunterladen
  for (const [name, url] of Object.entries(images)) {
    process.stdout.write(`Lade ${name} … `);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      await writeBin(path.join('assets', name), buf);
      console.log(`ok (${(buf.length / 1024).toFixed(0)} KB)`);
    } catch (e) {
      console.log('FEHLER: ' + e.message);
    }
  }

  // 2) URLs in allen HTML-Dateien durch lokale Pfade ersetzen
  const files = (await readdir('.')).filter((f) => f.endsWith('.html'));
  for (const file of files) {
    let html = await readFile(file, 'utf8');
    let changed = false;
    for (const [name, url] of Object.entries(images)) {
      if (html.includes(url)) {
        html = html.split(url).join('assets/' + name);
        changed = true;
      }
    }
    if (changed) {
      await writeFile(file, html, 'utf8');
      console.log(`Aktualisiert: ${file}`);
    }
  }

  console.log('\nFertig. Die Bilder liegen jetzt in ./assets/ und werden lokal eingebunden.');
}

main();
