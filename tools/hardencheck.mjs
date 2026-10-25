// Usage: node tools/hardencheck.mjs [group ...]  -> exit 0 iff no FAIL
// Phase-4 runtime checks against the production-mode dev server (serve.mjs --prod, headers from .htaccess).
// Groups: headers, csp, storage (later plans add more). No group given = all groups.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import zlib from 'node:zlib';
import { chromium } from './node_modules/playwright/index.mjs';
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

// Stub for the (consent-gated) heizreport widget: exercises every CSP relaxation the real widget needs
const WIDGET_STUB = `document.addEventListener('DOMContentLoaded', () => {
  const st = document.createElement('style'); st.textContent = '.x{color:#1A1C23}'; document.head.appendChild(st);
  document.getElementById('wp_check_script').innerHTML = '<p style="color:#1A1C23">stub-ok</p><img src="https://heiz.report/assets/images/x.jpg" alt="">';
  fetch('https://heizreport.de/web/track.php?x=1').catch(() => {});
  fetch('https://heizreport.de/web/wpCheckIntegration.php', { method: 'POST', body: '{}' }).catch(() => {});
});`;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

async function stubbedContext(browser, viewport) {
  const ctx = await browser.newContext({ viewport });
  ctx.violations = [];
  // Collected in Node so that violations survive page navigations
  await ctx.exposeFunction('__viol', (x) => ctx.violations.push(x));
  await ctx.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => window.__viol(e.violatedDirective + ' ' + e.blockedURI));
  });
  await ctx.route(/heizreport\.de\/js\/heizreport_3\.js/, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: WIDGET_STUB }));
  await ctx.route(/heizreport\.de\/web\/|heiz\.report\//, (r) => (/heiz\.report/.test(r.request().url())
    ? r.fulfill({ status: 200, contentType: 'image/png', body: PNG })
    : r.fulfill({ status: 200, contentType: 'application/json', body: '{}' })));
  return ctx;
}

// Full user flow; callers inspect window.__v afterwards
async function userFlow(page, origin, narrow) {
  await page.goto(origin + '/', { waitUntil: 'load' });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  await page.evaluate(() => window.scrollTo(0, 0));
  if (narrow) {
    await page.click('#menu-toggle');
    await page.waitForTimeout(300);
    await page.click('#menu-toggle');
    await page.waitForTimeout(300);
  }
  for (const name of ['impressum', 'datenschutz']) {
    const link = page.locator('footer a[data-dialog="' + name + '"]');
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await page.waitForFunction((n) => document.getElementById('dlg-' + n).open, name);
    await page.keyboard.press('Escape');
    await page.waitForFunction((n) => !document.getElementById('dlg-' + n).open, name);
  }
  await page.goto(origin + '/impressum', { waitUntil: 'load' });
  await page.waitForFunction(() => document.getElementById('dlg-impressum').open);
  await page.keyboard.press('Escape');
  await page.goto(origin + '/', { waitUntil: 'load' });
  for (const [k, v] of [['name', 'Jo Test'], ['email', 'jo@example.de'], ['phone', ''], ['message', 'Hallo, bitte um Rueckruf.']]) await page.fill('#f-' + k, v);
  await page.click('#contact-form button[type="submit"]');
  await page.waitForSelector('#form-status[data-state="success"]', { timeout: 15000 });
  await page.locator('#wp-load').scrollIntoViewIfNeeded();
  await page.click('#wp-load');
  await page.waitForFunction(() => document.getElementById('wp_check_script')?.textContent.includes('stub-ok'), null, { timeout: 8000 });
  await page.waitForTimeout(600);
}

groups.csp = async function csp() {
  const server = await startServer(root, { prod: true, mockMail: true });
  const origin = `http://127.0.0.1:${server.port}`;
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    for (const [w, h] of [[1440, 900], [375, 800]]) {
      const ctx = await stubbedContext(browser, { width: w, height: h });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
      page.on('console', (m) => { if (m.type() === 'error' && /Content Security Policy|violat/i.test(m.text())) errors.push(m.text()); });
      let flowErr = null;
      try { await userFlow(page, origin, w < 600); } catch (e) { flowErr = e.message.split('\n')[0]; }
      report(!flowErr, `csp@${w}: full user flow completes (load, scroll, menu, dialogs, /impressum, form, widget)`, flowErr || '');
      const v = ctx.violations.slice();
      report(v.length === 0, `csp@${w}: 0 securitypolicyviolation events`, v.join(' | '));
      report(errors.length === 0, `csp@${w}: no CSP console errors / page errors`, errors.join(' | '));
      if (w === 1440) {
        ctx.violations.length = 0;
        await page.evaluate(() => fetch('https://example.com/').catch(() => {}));
        await page.evaluate(() => { const s = document.createElement('script'); s.textContent = 'window.__inl=1'; document.body.appendChild(s); });
        await page.waitForTimeout(300);
        const nv = { v: ctx.violations.slice(), inl: await page.evaluate(() => window.__inl) };
        report(nv.v.some((x) => x.startsWith('connect-src')), 'csp: foreign fetch produces a connect-src violation', nv.v.join(' | '));
        report(nv.v.some((x) => x.startsWith('script-src')) && nv.inl === undefined, 'csp: inline script produces a script-src violation and does not run', nv.v.join(' | '));
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }
};

groups.storage = async function storage() {
  const server = await startServer(root, { prod: true, mockMail: true });
  const origin = `http://127.0.0.1:${server.port}`;
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    const ctx = await stubbedContext(browser, { width: 1440, height: 900 });
    const page = await ctx.newPage();
    const setCookie = [];
    page.on('response', (r) => { if (r.url().startsWith(origin) && r.headers()['set-cookie']) setCookie.push(r.url()); });
    const snapshot = async (label) => {
      const s = await page.evaluate(async () => ({
        cookie: document.cookie,
        ls: localStorage.length,
        ss: sessionStorage.length,
        idb: (await indexedDB.databases()).length,
        caches: (await caches.keys()).length,
        sw: (await navigator.serviceWorker.getRegistrations()).length,
      }));
      const jar = (await ctx.cookies()).length;
      report(s.cookie === '' && jar === 0, `storage ${label}: no cookies`, JSON.stringify({ doc: s.cookie, jar }));
      report(s.ls === 0 && s.ss === 0, `storage ${label}: localStorage/sessionStorage empty`, JSON.stringify(s));
      report(s.idb === 0 && s.caches === 0 && s.sw === 0, `storage ${label}: no IndexedDB, Cache Storage, service worker`, JSON.stringify(s));
    };
    await page.goto(origin + '/', { waitUntil: 'load' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await snapshot('after load and scroll');
    await userFlow(page, origin, false);
    await snapshot('after widget load and form submit');
    report(setCookie.length === 0, 'storage: no Set-Cookie on any response', setCookie.join(' '));
    await ctx.close();
  } finally {
    await browser.close();
    await server.close();
  }
};

const selected = process.argv.slice(2);
for (const g of selected.length ? selected : Object.keys(groups)) {
  if (!groups[g]) { report(false, `unknown group ${g}`); continue; }
  await groups[g]();
}
process.exit(fails ? 1 : 0);
