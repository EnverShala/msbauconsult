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

// ---- Phase 4 plan 03: accessibility groups (dev server, no CSP) ----
const AXE_PATH = path.join(import.meta.dirname, 'node_modules/axe-core/axe.min.js');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

async function openMenu(page) {
  await page.click('#menu-toggle');
  await page.waitForFunction(() => document.getElementById('menu-toggle').getAttribute('aria-expanded') === 'true');
  await page.waitForTimeout(350);
}
async function openDialog(page, name) {
  const link = page.locator('footer a[data-dialog="' + name + '"]');
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await page.waitForFunction((n) => document.getElementById('dlg-' + n).open, name);
  // slide-in finished (transform back to identity)
  await page.waitForFunction((n) => { const t = getComputedStyle(document.getElementById('dlg-' + n)).transform; return t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)'; }, name);
  await page.waitForTimeout(100);
}
async function closeDialogs(page) {
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => ![...document.querySelectorAll('dialog')].some((d) => d.open));
}
async function submitEmptyForm(page) {
  const btn = page.locator('#contact-form button[type="submit"]');
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await page.waitForFunction(() => document.querySelector('#contact-form [aria-invalid="true"]'));
  await page.waitForTimeout(350);
}

groups.axe = async function axe() {
  const server = await startServer(root, { mockMail: true });
  const origin = `http://127.0.0.1:${server.port}`;
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    for (const [w, h] of [[375, 812], [1440, 900]]) {
      // bypassCSP only here: axe is injected as inline script; the csp group keeps the real header
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, bypassCSP: true });
      const page = await ctx.newPage();
      const fresh = async () => {
        await page.goto(origin + '/', { waitUntil: 'load' });
        await page.addScriptTag({ path: AXE_PATH });
      };
      const states = [
        ['page', async () => { await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(400); await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300); }],
        ...(w < 1024 ? [['menu open', async () => openMenu(page)]] : []),
        ['impressum dialog', async () => openDialog(page, 'impressum')],
        ['datenschutz dialog', async () => openDialog(page, 'datenschutz')],
        ['form error state', async () => submitEmptyForm(page)],
      ];
      for (const [name, enter] of states) {
        await fresh();
        await enter();
        const res = await page.evaluate((tags) => window.axe.run(document, { runOnly: { type: 'tag', values: tags } }), TAGS);
        const v = res.violations.map((x) => `${x.id}[${x.nodes.map((n) => n.target.join(' ')).slice(0, 3).join('; ')}]`);
        report(v.length === 0, `axe@${w} ${name}: 0 violations`, v.join(' | '));
        console.log(`INFO axe@${w} ${name}: incomplete=${res.incomplete.length} passes=${res.passes.length}`);
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }
};

const TARGET_SEL = 'a, button, input, textarea, select, summary, [tabindex]:not([tabindex="-1"])';
groups.targets = async function targets() {
  const server = await startServer(root, { mockMail: true });
  const origin = `http://127.0.0.1:${server.port}`;
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    for (const w of [320, 375, 1024, 1440]) {
      const page = await browser.newPage({ viewport: { width: w, height: 900 } });
      const states = [['page', async () => {}]];
      if (w < 1024) states.push(['menu open', async () => openMenu(page)]);
      for (const [name, enter] of states) {
        await page.goto(origin + '/', { waitUntil: 'load' });
        await enter();
        const bad = await page.evaluate((sel) => {
          const vis = (e) => {
            const r = e.getBoundingClientRect();
            const cs = getComputedStyle(e);
            return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !e.closest('[hidden], dialog:not([open])') && !e.closest('.sr-only') && !e.matches('.sr-only');
          };
          const list = [...document.querySelectorAll(sel)].filter(vis);
          // effective box includes an ::after hit-area helper (inset offsets)
          const box = (e) => {
            const r = e.getBoundingClientRect();
            const a = getComputedStyle(e, '::after');
            if (a.content !== 'none' && a.position === 'absolute') {
              const t = parseFloat(a.top), b = parseFloat(a.bottom), l = parseFloat(a.left), rr = parseFloat(a.right);
              if ([t, b, l, rr].every((n) => !Number.isNaN(n))) return { left: r.left + l, top: r.top + t, right: r.right - rr, bottom: r.bottom - b };
            }
            return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
          };
          const boxes = list.map((e) => ({ e, b: box(e) }));
          const out = [];
          for (const { e, b } of boxes) {
            if (b.right - b.left >= 23.5 && b.bottom - b.top >= 23.5) continue;
            const p = e.parentElement;
            const inSentence = e.tagName === 'A' && getComputedStyle(e).display === 'inline' && p && [...p.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
            if (inSentence) continue;
            const cx = (b.left + b.right) / 2, cy = (b.top + b.bottom) / 2;
            const clash = boxes.some((o) => {
              if (o.e === e || o.e.contains(e) || e.contains(o.e)) return false;
              const nx = Math.max(o.b.left, Math.min(cx, o.b.right)), ny = Math.max(o.b.top, Math.min(cy, o.b.bottom));
              return Math.hypot(nx - cx, ny - cy) < 12;
            });
            if (!clash) continue;
            out.push(`${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''} "${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 24)}" ${Math.round(b.right - b.left)}x${Math.round(b.bottom - b.top)}`);
          }
          return out;
        }, TARGET_SEL);
        report(bad.length === 0, `targets@${w} ${name}: all >= 24x24 or exception`, bad.join(' | '));
      }
      await page.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }
};

groups.clip = async function clip() {
  const server = await startServer(root, { mockMail: true });
  const origin = `http://127.0.0.1:${server.port}`;
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    for (const w of [320, 360, 375, 414, 768, 1024, 1280, 1440]) {
      const page = await browser.newPage({ viewport: { width: w, height: 900 } });
      const states = [['page', async () => {}]];
      if (w < 1024) states.push(['menu open', async () => openMenu(page)]);
      states.push(['datenschutz dialog', async () => openDialog(page, 'datenschutz')]);
      for (const [name, enter] of states) {
        await page.goto(origin + '/', { waitUntil: 'load' });
        await enter();
        const res = await page.evaluate(() => {
          const de = document.documentElement;
          const out = [];
          for (const e of document.body.querySelectorAll('*')) {
            if (e.closest('[aria-hidden="true"], [hidden], .sr-only, canvas, svg, script, style, dialog:not([open])')) continue;
            const hasText = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
            const ctl = /^(A|BUTTON|INPUT|TEXTAREA|SELECT|IMG)$/.test(e.tagName);
            if (!hasText && !ctl) continue;
            const cs = getComputedStyle(e);
            if (cs.visibility === 'hidden' || cs.display === 'none') continue;
            const r = e.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            if (r.left < -0.5 || r.right > innerWidth + 0.5) out.push(`${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''} ${Math.round(r.left)}..${Math.round(r.right)}`);
          }
          return { sw: de.scrollWidth, cw: de.clientWidth, out: out.slice(0, 5) };
        });
        report(res.sw <= res.cw && res.out.length === 0, `clip@${w} ${name}: no horizontal scroll, nothing outside viewport`, `scrollWidth=${res.sw} clientWidth=${res.cw} ${res.out.join(' | ')}`);
      }
      await page.close();
    }
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
