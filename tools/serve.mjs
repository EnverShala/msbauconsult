// Minimal same-origin static server for local verification (dev only).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

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
  NAME_RE: /^(?=(?:.*\p{L}){2})[\p{L}\p{M} .'\-]+$/u,
  PHONE_RE: /^\+?[0-9()\/\- ]+$/,
  EMAIL_RE: /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/,
  PHONE_MIN_DIGITS: 6,
  MAX: { name: 100, email: 254, phone: 30, message: 5000 },
};

const RATE_LIMIT = 3;
const MSG = {
  invalid: 'Ungültige Anfrage.',
  rate: 'Zu viele Anfragen. Bitte versuchen Sie es in einigen Minuten erneut.',
  required: 'Bitte füllen Sie alle Pflichtfelder aus.',
  nameLen: 'Der Name darf höchstens 100 Zeichen lang sein.',
  email: 'Bitte geben Sie eine gültige E-Mail-Adresse an.',
  name: 'Bitte geben Sie Ihren Namen an (mindestens 2 Buchstaben).',
  phone: 'Bitte geben Sie eine gültige Telefonnummer an.',
  msgLen: 'Die Nachricht darf höchstens 5000 Zeichen lang sein.',
};

// Emulates the POST branch of sendMail.php in the same order. Returns [status, body].
function mailDecision(state, contentType, raw) {
  state.count += 1;
  if (state.count > RATE_LIMIT) return [429, { error: MSG.rate }];
  if (!String(contentType || '').includes('application/json')) return [400, { error: MSG.invalid }];
  let params;
  try { params = JSON.parse(raw); } catch { return [400, { error: MSG.invalid }]; }
  if (params === null || typeof params !== 'object' || Array.isArray(params)) return [400, { error: MSG.invalid }];
  const hp = params.hp_website;
  const hpFilled = hp === true || (typeof hp === 'string' && hp !== '' && hp !== '0') || (typeof hp === 'number' && hp !== 0);
  const t = params.t;
  const numeric = (typeof t === 'number' && Number.isFinite(t)) || (typeof t === 'string' && t.trim() !== '' && Number.isFinite(Number(t)));
  if (hpFilled || !numeric || Number(t) < 3000) return [200, { success: true }];
  const f = (k) => (typeof params[k] === 'string' ? params[k].trim() : '');
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
  if (!R.EMAIL_RE.test(email)) return [400, { error: MSG.email }];
  state.mails.push({ name, email, phone, message });
  return [200, { success: true }];
}

export function startServer(rootDir, { mockMail = false } = {}) {
  const root = path.resolve(rootDir);
  const state = { count: 0, mails: [] };
  const server = http.createServer((req, res) => {
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
    if (pathname === '/') pathname = '/index.html';
    // Mirrors .htaccess rule 4 (legal paths are served as index.html)
    if (['/impressum', '/datenschutz'].includes(pathname.replace(/\/+$/, '').toLowerCase())) pathname = '/index.html';
    if (mockMail && req.method === 'POST' && pathname === '/sendMail.php') {
      const chunks = [];
      let size = 0;
      req.on('data', (c) => { size += c.length; if (size <= 65536) chunks.push(c); });
      req.on('end', () => {
        const [status, body] = mailDecision(state, req.headers['content-type'], Buffer.concat(chunks).toString('utf8'));
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
        res.writeHead(404).end('Not found');
        return;
      }
      const ext = path.extname(file).slice(1).toLowerCase();
      res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      resolve({
        port: server.address().port,
        mails: state.mails,
        resetMail: () => { state.count = 0; state.mails.length = 0; },
        close: () => new Promise((r) => { server.close(r); server.closeAllConnections?.(); }),
      });
    });
  });
}
