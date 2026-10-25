// Testversion in einem Unterordner einer fremden Domain (z. B. enver-shala.de/msbauconsult).
// Aufruf: node tools/dist-subdir.mjs msbauconsult
// Baut dist/ (tools/dist.sh) und erzeugt daraus dist-staging/ mit:
// - allen Root-Pfaden (/assets, /impressum, /sendMail.php …) auf den Unterordner umgeschrieben
// - .htaccess ohne Weiterleitung auf ms-bauconsult.de, ohne HSTS, mit noindex
// - robots.txt, die alles sperrt
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Ordnername ohne führenden Schrägstrich übergeben (Git Bash würde /x in einen Windows-Pfad umwandeln)
const base = '/' + (process.argv[2] || '').replace(/^\/+|\/+$/g, '');
if (!/^\/[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/.test(base)) {
  console.error('Aufruf: node tools/dist-subdir.mjs unterordner');
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, '..');
execFileSync('sh', ['tools/dist.sh'], { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] });

const src = path.join(root, 'dist');
const out = path.join(root, 'dist-staging');
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(src, out, { recursive: true });

const edit = (rel, fn) => {
  const f = path.join(out, rel);
  const before = fs.readFileSync(f, 'utf8');
  const after = fn(before);
  if (after === before) throw new Error(`${rel}: nichts ersetzt`);
  fs.writeFileSync(f, after);
};

// HTML: Attribute und srcset-Einträge, die mit / beginnen (absolute https-URLs bleiben)
edit('index.html', (s) =>
  s.replace(/(="|, )\/(assets|favicon\.svg|impressum|datenschutz)/g, `$1${base}/$2`));

// JS: Formular-Endpoint und URL-Logik der Rechtsdialoge relativ zum Unterordner
edit('assets/js/main.js', (s) => s
  .replace("fetch('/sendMail.php'", `fetch('${base}/sendMail.php'`)
  .replaceAll('location.pathname', `(location.pathname.slice(${base.length}) || '/')`)
  .replace("history.replaceState(null, '', '/')", `history.replaceState(null, '', '${base}/')`));

// .htaccess: keine Host-/HTTPS-Weiterleitung, Pfade im Unterordner, kein HSTS, noindex
edit('.htaccess', (s) => s
  .split('\n')
  .filter((l) => !/RewriteCond %\{HTTPS\} !=on|RewriteCond %\{HTTP_HOST\}|RewriteRule \^ https:\/\/www\.ms-bauconsult\.de|Strict-Transport-Security/.test(l))
  .map((l) => l
    .replace('ErrorDocument 404 /index.html', `ErrorDocument 404 ${base}/index.html`)
    .replace('RewriteRule ^(impressum|datenschutz)/?$ /index.html', `RewriteRule ^(impressum|datenschutz)/?$ ${base}/index.html`)
    .replace(/^(\s*)Header always set X-Content-Type-Options/, '$1Header always set X-Robots-Tag "noindex, nofollow"\n$1Header always set X-Content-Type-Options'))
  .join('\n'));

fs.writeFileSync(path.join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
console.log(`dist-staging/ für ${base}/ erstellt – Inhalt nach <Domain>${base}/ hochladen.`);
