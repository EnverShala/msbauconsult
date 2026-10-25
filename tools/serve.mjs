// Minimal same-origin static server for local verification (dev only).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';

const TYPES = {
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  json: 'application/json',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  woff2: 'font/woff2',
  txt: 'text/plain; charset=utf-8',
};

// Validation rules of sendMail.php. The mock below must be kept in sync with sendMail.php;
// the parity group of tools/interactcheck.mjs guards the regex sources and limits.
export const MAIL_RULES = {
  NAME_RE: /^(?=(?:.*\p{L}){2})[\p{L}\p{M} .'’\-]+$/u,
  PHONE_RE: /^\+?[0-9()\/\- ]+$/,
  EMAIL_RE: /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/,
  PHONE_MIN_DIGITS: 6,
  // PHP additionally runs filter_var(FILTER_VALIDATE_EMAIL): no leading/trailing dot in the local part,
  // no consecutive dots, local part <= 64, total <= 254. Mirrored here (and in main.js emailOk).
  emailOk(v) {
    if (!MAIL_RULES.EMAIL_RE.test(v) || v.length > 254) return false;
    const local = v.slice(0, v.lastIndexOf('@'));
    return local.length <= 64 && !local.startsWith('.') && !local.endsWith('.') && !local.includes('..');
  },
  MAX: { name: 100, email: 254, phone: 30, message: 5000 },
};

const RATE_LIMIT = 3;
const MSG = {
  invalid: 'Ungültige Anfrage.',
  rate: 'Zu viele Anfragen. Bitte versuchen Sie es in einigen Minuten erneut.',
  required: 'Bitte füllen Sie alle Pflichtfelder aus.',
  nameLen: 'Der Name darf höchstens 100 Zeichen lang sein.',
  email: 'Bitte geben Sie eine gültige E-Mail-Adresse an.',
  name: 'Bitte geben Sie Ihren Namen an (mindestens 2 Buchstaben; erlaubt sind Buchstaben, Leerzeichen, Punkt, Bindestrich und Apostroph).',
  phone: 'Bitte geben Sie eine gültige Telefonnummer an.',
  msgLen: 'Die Nachricht darf höchstens 5000 Zeichen lang sein.',
};

// PHP trim() strips only these ASCII characters (JS trim() also strips NBSP and other Unicode spaces)
const phpTrim = (s) => s.replace(/^[ \t\n\r\0\x0B]+|[ \t\n\r\0\x0B]+$/g, '');

// Emulates the POST branch of sendMail.php in the same order. Returns [status, body].
// Order matters: the rate limit counts only submissions that pass validation and the bot checks.
function mailDecision(state, contentType, raw) {
  // Exact media type, parameters (charset) ignored
  if (String(contentType || '').split(';')[0].trim().toLowerCase() !== 'application/json') return [400, { error: MSG.invalid }];
  let params;
  try { params = JSON.parse(raw); } catch { return [400, { error: MSG.invalid }]; }
  if (params === null || typeof params !== 'object' || Array.isArray(params)) return [400, { error: MSG.invalid }];
  const hp = params.hp_website;
  // Any non-empty string (also "0") counts as filled; non-string values other than null/undefined too
  const hpFilled = hp === undefined || hp === null ? false : typeof hp === 'string' ? phpTrim(hp) !== '' : true;
  const t = params.t;
  const numeric = (typeof t === 'number' && Number.isFinite(t)) || (typeof t === 'string' && t.trim() !== '' && Number.isFinite(Number(t)));
  if (hpFilled || !numeric || Number(t) < 3000) return [200, { success: true }];
  const f = (k) => (typeof params[k] === 'string' ? phpTrim(params[k]) : '');
  const name = f('name'), email = f('email'), phone = f('phone'), message = f('message');
  const len = (s) => [...s].length;
  const R = MAIL_RULES;
  if (!name || !email || !message) return [400, { error: MSG.required }];
  if (len(name) > R.MAX.name) return [400, { error: MSG.nameLen }];
  if (len(email) > R.MAX.email) return [400, { error: MSG.email }];
  if (!R.NAME_RE.test(name)) return [400, { error: MSG.name }];
  if (len(phone) > R.MAX.phone || (phone !== '' && (!R.PHONE_RE.test(phone) || (phone.match(/[0-9]/g) || []).length < R.PHONE_MIN_DIGITS))) {
    return [400, { error: MSG.phone }];
  }
  if (len(message) > R.MAX.message) return [400, { error: MSG.msgLen }];
  if (!R.emailOk(email)) return [400, { error: MSG.email }];
  state.count += 1;
  if (state.count > RATE_LIMIT) return [429, { error: MSG.rate }];
  state.mails.push({ name, email, phone, message });
  return [200, { success: true }];
}

// Single source of truth for the production mode: the "Header always set" lines of .htaccess.
export function htaccessHeaders(root) {
  const text = fs.readFileSync(path.join(path.resolve(root), '.htaccess'), 'utf8');
  const headers = {};
  for (const m of text.matchAll(/^\s*Header\s+always\s+set\s+([A-Za-z-]+)\s+"([^"]*)"\s*$/gm)) headers[m[1]] = m[2];
  return headers;
}

// Cache-Control, also read from .htaccess: the directory-level "Header set Cache-Control" is the
// fallback, the FilesMatch blocks override it in file order (later match wins, as in Apache).
// hardencheck asserts the resulting values against its own expected matrix (the spec).
export function htaccessCache(root) {
  const text = fs.readFileSync(path.join(path.resolve(root), '.htaccess'), 'utf8');
  const blockRe = /<FilesMatch\s+"([^"]+)">\s*Header\s+set\s+Cache-Control\s+"([^"]*)"\s*<\/FilesMatch>/g;
  const rules = [...text.matchAll(blockRe)].map((m) => ({ re: new RegExp(m[1]), value: m[2] }));
  const fallback = text.replace(blockRe, '').match(/^\s*Header\s+set\s+Cache-Control\s+"([^"]*)"\s*$/m)?.[1];
  if (!fallback || rules.length === 0) throw new Error('.htaccess: Cache-Control rules not found');
  return { fallback, rules };
}

// "RedirectMatch 404" patterns of .htaccess (dev paths are not served in prod mode either)
export function htaccessBlocked(root) {
  const text = fs.readFileSync(path.join(path.resolve(root), '.htaccess'), 'utf8');
  return [...text.matchAll(/^\s*RedirectMatch\s+404\s+"([^"]+)"\s*$/gm)].map((m) => new RegExp(m[1]));
}

function cacheControl(cache, file) {
  const base = path.basename(file);
  let value = cache.fallback;
  for (const r of cache.rules) if (r.re.test(base)) value = r.value;
  return value;
}

const COMPRESSIBLE = new Set(['html', 'css', 'js', 'mjs', 'svg', 'json', 'xml', 'txt']);

export function startServer(rootDir, { mockMail = false, prod = false, port = 0 } = {}) {
  const root = path.resolve(rootDir);
  const state = { count: 0, mails: [] };
  const secHeaders = prod ? htaccessHeaders(root) : {};
  const cache = prod ? htaccessCache(root) : null;
  const blocked = prod ? htaccessBlocked(root) : [];
  const server = http.createServer((req, res) => {
    // Prod: every response (also 4xx) carries the .htaccess headers, like "Header always set"
    for (const [k, v] of Object.entries(secHeaders)) res.setHeader(k, v);
    let pathname;
    try {
      pathname = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
    } catch {
      res.writeHead(400).end('Bad request');
      return;
    }
    if (pathname.includes('\0')) {
      res.writeHead(400).end('Bad request');
      return;
    }
    if (blocked.some((re) => re.test(pathname))) {
      res.writeHead(404, { 'Cache-Control': cache.fallback }).end('Not found');
      return;
    }
    if (pathname === '/') pathname = '/index.html';
    // Mirrors .htaccess rule 4 (legal paths are served as index.html)
    if (['/impressum', '/datenschutz'].includes(pathname.replace(/\/+$/, '').toLowerCase())) pathname = '/index.html';
    if (mockMail && req.method === 'POST' && pathname === '/sendMail.php') {
      const chunks = [];
      let size = 0;
      req.on('data', (c) => { size += c.length; if (size <= 65536) chunks.push(c); });
      req.on('end', () => {
        const [status, body] = mailDecision(state, req.headers['content-type'], Buffer.concat(chunks).toString('utf8'));
        if (prod) res.setHeader('Cache-Control', 'no-cache');
        res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(body));
      });
      return;
    }
    const file = path.resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) {
        res.writeHead(404, prod ? { 'Cache-Control': 'no-cache' } : {}).end('Not found');
        return;
      }
      const ext = path.extname(file).slice(1).toLowerCase();
      const type = TYPES[ext] || 'application/octet-stream';
      if (!prod) {
        res.writeHead(200, { 'Content-Type': type });
        fs.createReadStream(file).pipe(res);
        return;
      }
      fs.readFile(file, (rerr, buf) => {
        if (rerr) { res.writeHead(404).end('Not found'); return; }
        const headers = { 'Content-Type': type, 'Cache-Control': cacheControl(cache, file) };
        if (COMPRESSIBLE.has(ext)) {
          const ae = String(req.headers['accept-encoding'] || '');
          headers.Vary = 'Accept-Encoding';
          if (ae.split(',').some((x) => x.trim().split(';')[0] === 'br')) {
            buf = zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } });
            headers['Content-Encoding'] = 'br';
          } else if (ae.split(',').some((x) => x.trim().split(';')[0] === 'gzip')) {
            buf = zlib.gzipSync(buf, { level: 6 });
            headers['Content-Encoding'] = 'gzip';
          }
        }
        headers['Content-Length'] = buf.length;
        res.writeHead(200, headers);
        res.end(buf);
      });
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      resolve({
        port: server.address().port,
        mails: state.mails,
        resetMail: () => { state.count = 0; state.mails.length = 0; },
        close: () => new Promise((r) => { server.close(r); server.closeAllConnections?.(); }),
      });
    });
  });
}

// CLI: node tools/serve.mjs [--prod] [--mock-mail] [--port N]
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const pi = args.indexOf('--port');
  const prod = args.includes('--prod');
  const srv = await startServer(path.resolve(import.meta.dirname, '..'), {
    prod,
    mockMail: args.includes('--mock-mail'),
    port: pi >= 0 ? Number(args[pi + 1]) : 8080,
  });
  console.log(`serving http://127.0.0.1:${srv.port}/ (${prod ? 'prod' : 'dev'})`);
}
