// Usage: node tools/hardencheck.mjs [group ...]  -> exit 0 iff no FAIL
// Phase-4 runtime checks against the production-mode dev server (serve.mjs --prod, headers from .htaccess).
// Groups: headers (later plans add more). No group given = all groups.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import zlib from 'node:zlib';
import { startServer, htaccessHeaders } from './serve.mjs';

const root = path.resolve(import.meta.dirname, '..');
let fails = 0;
function report(ok, name, detail = '') {
  if (!ok) fails += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${!ok && detail ? ' ' + detail : ''}`);
}

// Raw request: no automatic decompression, headers as received
function request(port, urlPath, { method = 'GET', headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: urlPath, method, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, raw: res.rawHeaders, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const countHeader = (raw, name) => raw.filter((v, i) => i % 2 === 0 && v.toLowerCase() === name.toLowerCase()).length;
const directive = (csp, name) => {
  const d = csp.split(';').map((x) => x.trim()).find((x) => x.split(/\s+/)[0] === name);
  return d ? d.split(/\s+/).slice(1) : null;
};
const sameSet = (a, b) => a && a.length === b.length && b.every((x) => a.includes(x));

const SEC = ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options', 'X-Frame-Options',
  'Referrer-Policy', 'Permissions-Policy', 'Cross-Origin-Opener-Policy'];

const groups = {
  async headers() {
    const expected = htaccessHeaders(root);
    report(sameSet(Object.keys(expected), SEC), 'headers: .htaccess defines exactly the 7 security headers', Object.keys(expected).join(','));

    const csp = expected['Content-Security-Policy'] || '';
    for (const d of ['default-src', 'frame-src', 'object-src', 'base-uri', 'frame-ancestors']) {
      report(sameSet(directive(csp, d), ["'none'"]), `csp: ${d} 'none'`);
    }
    const script = directive(csp, 'script-src') || [];
    report(sameSet(script, ["'self'", 'https://heizreport.de/js/heizreport_3.js']), 'csp: script-src self + exact widget path', script.join(' '));
    report(!script.some((x) => /unsafe-inline|unsafe-eval|\*/.test(x)), "csp: script-src without 'unsafe-*' and wildcard");
    report(sameSet(directive(csp, 'connect-src'), ["'self'", 'https://heizreport.de/web/']), 'csp: connect-src self + /web/');
    report(sameSet(directive(csp, 'img-src'), ["'self'", 'https://heiz.report']), 'csp: img-src self + heiz.report');
    report(!/data:/.test(csp), 'csp: no data:');
    report(!/preload/.test(expected['Strict-Transport-Security'] || ''), 'hsts: no preload');

    const server = await startServer(root, { prod: true, mockMail: true });
    try {
      const idx = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
      const cssUrl = idx.match(/\/assets\/css\/main\.css\?v=[0-9a-f]{8}/)?.[0];
      const jsUrl = idx.match(/\/assets\/js\/main\.js\?v=[0-9a-f]{8}/)?.[0];
      report(Boolean(cssUrl && jsUrl), 'headers: index.html carries ?v= stamps');
      const IMMUTABLE = 'public, max-age=31536000, immutable';
      const targets = [
        ['/', 200, 'no-cache', 'index.html'],
        ['/impressum', 200, 'no-cache', 'index.html'],
        ['/index.html', 200, 'no-cache', 'index.html'],
        [cssUrl, 200, IMMUTABLE, 'assets/css/main.css'],
        [jsUrl, 200, IMMUTABLE, 'assets/js/main.js'],
        ['/assets/fonts/pjs.woff2', 200, IMMUTABLE, null],
        ['/assets/img/portrait-800.avif', 200, IMMUTABLE, null],
        ['/favicon.svg', 200, 'public, max-age=604800', 'favicon.svg'],
        ['/robots.txt', 200, 'no-cache', 'robots.txt'],
        ['/does-not-exist', 404, null, null],
      ];
      for (const [url, status, cc, file] of targets) {
        if (!url) continue;
        const r = await request(server.port, url, { headers: { 'Accept-Encoding': 'identity' } });
        const tag = `headers: ${url}`;
        report(r.status === status, `${tag} status ${status}`, String(r.status));
        for (const h of SEC) {
          report(countHeader(r.raw, h) === 1 && r.headers[h.toLowerCase()] === expected[h], `${tag} ${h} once, equals .htaccess`);
        }
        if (cc) report(r.headers['cache-control'] === cc, `${tag} Cache-Control`, String(r.headers['cache-control']));
        if (file) {
          const disk = fs.readFileSync(path.join(root, file));
          const compressible = /\.(html|css|js|svg|txt|xml|json)$/.test(file);
          if (compressible) {
            const br = await request(server.port, url, { headers: { 'Accept-Encoding': 'br, gzip' } });
            report(br.headers['content-encoding'] === 'br' && /Accept-Encoding/i.test(br.headers.vary || '') && zlib.brotliDecompressSync(br.body).equals(disk), `${tag} br`);
            const gz = await request(server.port, url, { headers: { 'Accept-Encoding': 'gzip' } });
            report(gz.headers['content-encoding'] === 'gzip' && zlib.gunzipSync(gz.body).equals(disk), `${tag} gzip`);
            const id = await request(server.port, url);
            report(!id.headers['content-encoding'] && id.body.equals(disk), `${tag} identity`);
          } else {
            report(!r.headers['content-encoding'] && r.body.equals(disk), `${tag} identity body equals disk`);
          }
        }
      }
      // 404 still gets security headers
      const nf = await request(server.port, '/does-not-exist');
      report(SEC.every((h) => countHeader(nf.raw, h) === 1), 'headers: 404 carries all security headers once');

      const post = await request(server.port, '/sendMail.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      report(SEC.every((h) => countHeader(post.raw, h) === 1 && post.headers[h.toLowerCase()] === expected[h]), 'headers: POST /sendMail.php security headers once');
      report(post.headers['cache-control'] === 'no-cache', 'headers: POST /sendMail.php no-cache');
    } finally {
      await server.close();
    }

    const dev = await startServer(root);
    try {
      const r = await request(dev.port, '/');
      report(SEC.every((h) => r.headers[h.toLowerCase()] === undefined) && !r.headers['content-encoding'], 'headers: dev mode sends no security headers/compression');
    } finally {
      await dev.close();
    }
  },
};

const selected = process.argv.slice(2);
for (const g of selected.length ? selected : Object.keys(groups)) {
  if (!groups[g]) { report(false, `unknown group ${g}`); continue; }
  await groups[g]();
}
process.exit(fails ? 1 : 0);
