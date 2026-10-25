// Usage: node tools/interactcheck.mjs [group ...]  -> exit 0 iff no FAIL
// Interaction checks against the dev server with the sendMail.php mock.
// Groups: server, mock, parity, paths, dialogs, deeplinks, legal, form, anchors, menu, consent.
// Flag --online (consent group only, not used by verify.sh): loads the real heizreport script, INFO only.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from './node_modules/playwright/index.mjs';
import { startServer, MAIL_RULES } from './serve.mjs';

const root = path.resolve(import.meta.dirname, '..');
let fails = 0;
function report(ok, name, detail = '') {
  if (!ok) fails += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${!ok && detail ? ' ' + detail : ''}`);
}

const server = await startServer(root, { mockMail: true });
const origin = `http://127.0.0.1:${server.port}`;
let browser = null;
async function newContext(viewport = { width: 1440, height: 900 }) {
  browser ??= await chromium.launch({ channel: 'chrome' });
  return browser.newContext({ viewport });
}

const post = (body, headers = { 'Content-Type': 'application/json' }) =>
  fetch(origin + '/sendMail.php', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));

const valid = () => ({
  name: 'Jo', email: 'jo@example.de', phone: '+49 (0) 711/123-45', message: 'Hallo', hp_website: '', t: 4000,
});

const groups = {
  async server() {
    for (const p of ['/impressum', '/impressum/', '/datenschutz', '/DATENSCHUTZ']) {
      const r = await fetch(origin + p);
      const body = await r.text();
      report(
        r.status === 200 && (r.headers.get('content-type') || '').includes('text/html') && body.includes('<title>MS Bauconsult'),
        `server ${p} -> index.html`,
        `status=${r.status}`,
      );
    }
    const nf = await fetch(origin + '/gibtsnicht');
    report(nf.status === 404, 'server /gibtsnicht -> 404', `status=${nf.status}`);
  },

  async mock() {
    const ok = (r) => r.status === 200 && r.json?.success === true;
    server.resetMail();
    let r = await post(valid());
    report(ok(r) && server.mails.length === 1 && server.mails[0].phone === '+49 (0) 711/123-45', 'mock valid body accepted, phone preserved');
    server.resetMail();
    r = await post({ ...valid(), t: 100 });
    report(ok(r) && server.mails.length === 0, 'mock t<3000 fake success');
    server.resetMail();
    const noT = valid();
    delete noT.t;
    r = await post(noT);
    report(ok(r) && server.mails.length === 0, 'mock missing t fake success');
    server.resetMail();
    r = await post({ ...valid(), hp_website: 'x' });
    report(ok(r) && server.mails.length === 0, 'mock honeypot fake success');
    server.resetMail();
    r = await post(JSON.stringify(valid()), { 'Content-Type': 'text/plain' });
    report(r.status === 400, 'mock text/plain -> 400', `status=${r.status}`);
    server.resetMail();
    r = await post('{nope');
    report(r.status === 400, 'mock invalid JSON -> 400', `status=${r.status}`);
    const NAME = 'Bitte geben Sie Ihren Namen an (mindestens 2 Buchstaben).';
    const EMAIL = 'Bitte geben Sie eine gültige E-Mail-Adresse an.';
    const PHONE = 'Bitte geben Sie eine gültige Telefonnummer an.';
    const bad = async (label, patch, msg) => {
      server.resetMail();
      const x = await post({ ...valid(), ...patch });
      report(x.status === 400 && x.json?.error === msg, `mock ${label} -> 400`, `status=${x.status} ${x.json?.error}`);
    };
    await bad('name "A"', { name: 'A' }, NAME);
    await bad('name " "', { name: ' ' }, 'Bitte füllen Sie alle Pflichtfelder aus.');
    await bad('name "12"', { name: '12' }, NAME);
    await bad('email a@b', { email: 'a@b' }, EMAIL);
    await bad('email a@b.c', { email: 'a@b.c' }, EMAIL);
    await bad('phone 12345', { phone: '12345' }, PHONE);
    await bad('phone abc123456', { phone: 'abc123456' }, PHONE);
    server.resetMail();
    r = await post({ ...valid(), message: 'ä'.repeat(5000) });
    report(ok(r), 'mock message 5000 chars accepted', `status=${r.status}`);
    server.resetMail();
    r = await post({ ...valid(), message: 'ä'.repeat(5001) });
    report(r.status === 400, 'mock message 5001 chars -> 400', `status=${r.status}`);
    server.resetMail();
    const codes = [];
    let last;
    for (let i = 0; i < 4; i += 1) {
      last = await post(valid());
      codes.push(last.status);
    }
    report(codes.join() === '200,200,200,429' && last.json?.error?.startsWith('Zu viele Anfragen'), 'mock 4th POST -> 429', codes.join());
    server.resetMail();
  },

  // Comparison with the regexes/limits in sendMail.php. Plan 03-03 extends this group
  // to the constants in assets/js/main.js.
  async parity() {
    const php = fs.readFileSync(path.join(root, 'sendMail.php'), 'utf8');
    const grab = (re) => php.match(re)?.[1];
    const unq = (s) => s?.replace(/\\'/g, "'");
    const nameSrc = unq(grab(/preg_match\('\/(\^\(\?=.*?)\/u', \$name\)/));
    const phoneSrc = unq(grab(/preg_match\('\/(\^\\\+\?.*?)\/', \$phone\)/));
    const emailSrc = unq(grab(/\$emailPattern = '\/(.*)\/';/));
    report(nameSrc === MAIL_RULES.NAME_RE.source, 'parity name regex', `${nameSrc} vs ${MAIL_RULES.NAME_RE.source}`);
    report(MAIL_RULES.NAME_RE.flags.includes('u') && /\/u', \$name\)/.test(php), 'parity name regex flag u');
    report(phoneSrc === MAIL_RULES.PHONE_RE.source, 'parity phone regex', `${phoneSrc} vs ${MAIL_RULES.PHONE_RE.source}`);
    report(emailSrc === MAIL_RULES.EMAIL_RE.source, 'parity email regex', `${emailSrc} vs ${MAIL_RULES.EMAIL_RE.source}`);
    report(/preg_match_all\('\/\[0-9\]\/', \$phone\) < 6/.test(php) && MAIL_RULES.PHONE_MIN_DIGITS === 6, 'parity phone digit minimum');
    for (const [k, v] of Object.entries(MAIL_RULES.MAX)) {
      report(new RegExp(`\\$len\\(\\$${k}\\) > ${v}\\b`).test(php), `parity limit ${k}=${v}`);
    }
    const js = fs.readFileSync(path.join(root, 'assets/js/main.js'), 'utf8');
    const lit = (n) => { const m = js.match(new RegExp('const ' + n + ' = /(.*)/([a-z]*);')); return m ? new RegExp(m[1], m[2]) : null; };
    for (const n of ['NAME_RE', 'EMAIL_RE', 'PHONE_RE']) {
      const r = lit(n);
      report(!!r && r.source === MAIL_RULES[n].source && r.flags === MAIL_RULES[n].flags, 'parity js ' + n, String(r));
    }
    report(/const PHONE_MIN_DIGITS = 6;/.test(js) && MAIL_RULES.PHONE_MIN_DIGITS === 6, 'parity js PHONE_MIN_DIGITS');
  },

  async paths() {
    for (const p of ['/impressum/', '/datenschutz']) {
      const ctx = await newContext();
      const page = await ctx.newPage();
      const bad = [];
      const wrong = [];
      page.on('response', (res) => {
        if (res.status() >= 400) bad.push(`${res.status()} ${res.url()}`);
        const rp = new URL(res.url()).pathname;
        if (rp.startsWith('/impressum/') && rp !== '/impressum/') wrong.push(res.url());
      });
      await page.goto(origin + p, { waitUntil: 'networkidle' });
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      report(bad.length === 0, `paths ${p} no response >= 400`, bad.join(' '));
      report(wrong.length === 0, `paths ${p} no request below /impressum/`, wrong.join(' '));
      report(bg === 'rgb(251, 251, 249)', `paths ${p} CSS loaded (alabaster)`, bg);
      await ctx.close();
    }
  },

  async dialogs() {
    const ctx = await newContext();
    const page = await ctx.newPage();
    await page.goto(origin + '/', { waitUntil: 'load' });
    const settle = () => page.waitForTimeout(550);
    const isOpen = (id) => page.evaluate((i) => document.getElementById(i).open, id);
    const footerLink = (name) => page.locator(`footer a[data-dialog="${name}"]`);
    const openVia = async (name) => {
      const l = footerLink(name);
      await l.scrollIntoViewIfNeeded();
      await l.click();
      await settle();
    };
    for (const name of ['impressum', 'datenschutz']) {
      const id = `dlg-${name}`;
      await footerLink(name).scrollIntoViewIfNeeded();
      const widthBefore = await page.evaluate(() => document.documentElement.clientWidth);
      await openVia(name);
      report(await isOpen(id), `dialogs ${name} opens via footer`);
      const focusOk = await page.evaluate((i) => document.activeElement === document.querySelector(`#${i} [data-close]`), id);
      report(focusOk, `dialogs ${name} focus on close button`);
      const loc = await page.evaluate(() => ({ p: location.pathname, h: location.hash }));
      report(loc.p === '/' && loc.h === '', `dialogs ${name} location stays /`, JSON.stringify(loc));
      const y0 = await page.evaluate(() => window.scrollY);
      await page.mouse.move(40, 300);
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(300);
      const y1 = await page.evaluate(() => window.scrollY);
      report(y0 === y1, `dialogs ${name} page scroll locked`, `${y0} -> ${y1}`);
      const widthOpen = await page.evaluate(() => document.documentElement.clientWidth);
      report(widthOpen === widthBefore, `dialogs ${name} no gutter jump`, `${widthBefore} -> ${widthOpen}`);
      // Esc closes, focus back on trigger, location exactly origin + "/"
      await page.keyboard.press('Escape');
      await settle();
      report(!(await isOpen(id)), `dialogs ${name} Esc closes`);
      const back = await page.evaluate(() => document.activeElement?.getAttribute('data-dialog'));
      report(back === name, `dialogs ${name} focus returns to footer link`, String(back));
      const href = await page.evaluate(() => location.href);
      report(href === origin + '/', `dialogs ${name} after Esc location is origin + "/"`, href);
      // Backdrop click closes
      await openVia(name);
      await page.mouse.click(40, 300);
      await settle();
      report(!(await isOpen(id)), `dialogs ${name} backdrop click closes`);
      // Close button closes
      await openVia(name);
      await page.locator(`#${id} [data-close]`).click();
      await settle();
      report(!(await isOpen(id)), `dialogs ${name} close button closes`);
    }
    for (const sel of ['#contact-form a[data-dialog="datenschutz"]', '#waermepumpe a[data-dialog="datenschutz"]']) {
      const l = page.locator(sel).first();
      await l.scrollIntoViewIfNeeded();
      await l.click();
      await settle();
      report(await isOpen('dlg-datenschutz'), `dialogs ${sel} opens datenschutz`);
      await page.keyboard.press('Escape');
      await settle();
    }
    // Modified click is not intercepted
    const prevented = await page.evaluate(() => {
      let dp = null;
      const a = document.querySelector('footer a[data-dialog="impressum"]');
      document.addEventListener('click', (e) => { dp = e.defaultPrevented; e.preventDefault(); }, { once: true });
      a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true, button: 0 }));
      return { dp, open: document.getElementById('dlg-impressum').open };
    });
    report(prevented.dp === false && prevented.open === false, 'dialogs ctrl-click not intercepted', JSON.stringify(prevented));
    await ctx.close();

    const rctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const rp = await rctx.newPage();
    await rp.goto(origin + '/', { waitUntil: 'load' });
    await rp.locator('footer a[data-dialog="impressum"]').click();
    await rp.waitForTimeout(200);
    const td = await rp.evaluate(() => getComputedStyle(document.getElementById('dlg-impressum')).transitionDuration);
    report(td === '0s', 'dialogs reduced motion transitionDuration 0s', td);
    await rctx.close();
  },

  async deeplinks() {
    const cases = [
      ['/impressum', 'impressum'], ['/impressum/', 'impressum'], ['/datenschutz', 'datenschutz'],
      ['/#impressum', 'impressum'], ['/#datenschutz', 'datenschutz'],
    ];
    for (const [p, want] of cases) {
      const ctx = await newContext();
      const page = await ctx.newPage();
      const bad = [];
      page.on('response', (res) => { if (res.status() >= 400) bad.push(`${res.status()} ${res.url()}`); });
      await page.goto(origin + p, { waitUntil: 'load' });
      let cleaned = true;
      await page.waitForFunction(() => location.pathname === '/' && location.hash === '', null, { timeout: 3000 }).catch(() => { cleaned = false; });
      const st = await page.evaluate(() => ({
        imp: document.getElementById('dlg-impressum').open,
        ds: document.getElementById('dlg-datenschutz').open,
        href: location.href,
      }));
      report(cleaned && st.href === origin + '/', `deeplinks ${p} URL cleaned to /`, st.href);
      report(st.imp === (want === 'impressum') && st.ds === (want === 'datenschutz'), `deeplinks ${p} opens ${want} only`, JSON.stringify(st));
      report(bad.length === 0, `deeplinks ${p} no response >= 400`, bad.join(' '));
      await ctx.close();
    }
    {
      const ctx = await newContext();
      const page = await ctx.newPage();
      await page.goto(origin + '/#contact', { waitUntil: 'load' });
      await page.waitForFunction(() => location.hash === '', null, { timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(1200);
      const st = await page.evaluate(() => ({
        y: window.scrollY,
        top: document.getElementById('contact').getBoundingClientRect().top,
        vh: window.innerHeight,
        hash: location.hash,
        imp: document.getElementById('dlg-impressum').open || document.getElementById('dlg-datenschutz').open,
      }));
      report(st.y > 0 && st.top < st.vh && st.top > -st.vh / 2 && st.hash === '' && !st.imp, '/#contact scrolls, hash removed', JSON.stringify(st));
      await ctx.close();
    }
    {
      const ctx = await newContext();
      const page = await ctx.newPage();
      await page.goto(origin + '/index.html', { waitUntil: 'load' });
      await page.waitForFunction(() => location.pathname === '/', null, { timeout: 3000 }).catch(() => {});
      const href = await page.evaluate(() => location.href);
      report(href === origin + '/', '/index.html -> /', href);
      await ctx.close();
    }
  },

  async legal() {
    const ctx = await newContext();
    const page = await ctx.newPage();
    await page.goto(origin + '/', { waitUntil: 'load' });
    const tx = (id) => page.evaluate((i) => document.getElementById(i).textContent.replace(/\s+/g, ' '), id);
    const imp = await tx('dlg-impressum');
    for (const s of ['Stettener Str. 24', '70734 Fellbach', '+49 (0) 172 232 14 82', 'info@ms-bauconsult.de', 'Verbraucherstreitbeilegung', 'Quelle: e-recht24.de', 'Deutsche Energie-Agentur (dena)']) {
      report(imp.includes(s), `legal impressum contains "${s}"`);
    }
    report(!/Adobe Stock|Shutterstock/.test(imp), 'legal impressum without old image line');
    const ds = await tx('dlg-datenschutz');
    for (const s of ['Verantwortlicher Anbieter', 'Kontaktformular – technische Verarbeitung', 'Hosting und Server-Logfiles', 'Wärmepumpen-Check (heizreport.de)', 'Schriftarten (lokal)', 'Cookies, Tracking und lokaler Speicher', 'in gehashter Form', 'heiz.report', '§ 25 Abs. 1 TDDDG']) {
      report(ds.includes(s), `legal datenschutz contains "${s}"`);
    }
    const href = await page.evaluate(() => document.querySelector('#dlg-datenschutz a[href^="https://"]')?.getAttribute('href'));
    const rel = await page.evaluate(() => document.querySelector('#dlg-datenschutz a[href^="https://"]')?.getAttribute('rel'));
    report(href === 'https://heizreport.de/datenschutz' && rel === 'noopener noreferrer', 'legal heizreport link with rel', `${href} ${rel}`);
    await ctx.close();
  },
  async form() {
    const ctx = await newContext();
    const page = await ctx.newPage();
    const posts = [];
    page.on('request', (r) => { if (r.method() === 'POST' && r.url().endsWith('/sendMail.php')) posts.push(r); });
    await page.goto(origin + '/');
    server.resetMail();
    const txt = (sel) => page.evaluate((s) => document.querySelector(s)?.textContent ?? null, sel);
    const vis = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return !!e && !e.hidden && e.getClientRects().length > 0; }, sel);
    const inv = (id) => page.getAttribute('#' + id, 'aria-invalid');
    const fillAll = async (o = {}) => {
      const v = { name: 'Jo Müller', email: 'jo@example.de', phone: '+49 711 123456', message: 'Hallo', ...o };
      for (const k of Object.keys(v)) await page.fill('#f-' + k, v[k]);
    };
    const submit = () => page.click('#contact-form button[type="submit"]');
    const statusStarts = (s) => page.waitForFunction((x) => document.getElementById('form-status').textContent.startsWith(x), s, { timeout: 8000 }).catch(() => {});

    // Empty submit
    await submit();
    report(posts.length === 0, 'form empty submit sends no request');
    for (const k of ['name', 'email', 'message']) {
      report((await inv('f-' + k)) === 'true' && (await vis('#f-' + k + '-err')) && (await txt('#f-' + k + '-err')).length > 5, `form empty ${k} invalid with message`);
    }
    report((await txt('#form-status')) === 'Bitte prüfen Sie Ihre Eingaben.', 'form empty status text');
    report((await page.evaluate(() => document.activeElement.id)) === 'f-name', 'form empty focuses first invalid field');

    // Name cases
    for (const n of ['A', ' ', '12']) {
      await fillAll({ name: n });
      await submit();
      report(posts.length === 0 && (await inv('f-name')) === 'true' && (await txt('#f-name-err')) === 'Bitte geben Sie Ihren Namen an (mindestens 2 Buchstaben).', `form name "${n}" rejected`);
    }
    await fillAll({ name: 'Jo', phone: '' });
    await page.evaluate(() => document.getElementById('f-name').blur());
    report((await inv('f-name')) === 'false' && !(await vis('#f-name-err')), 'form name "Jo" accepted');

    // E-mail cases
    for (const m of ['a@b', 'a@b.c']) {
      await fillAll({ email: m });
      await submit();
      report(posts.length === 0 && (await txt('#f-email-err')) === 'Bitte geben Sie eine gültige E-Mail-Adresse an.', `form email "${m}" rejected`);
    }

    // Phone filter
    await page.fill('#f-phone', '');
    await page.focus('#f-phone');
    await page.keyboard.type('abc');
    report((await page.inputValue('#f-phone')) === '', 'form phone "abc" typed vanishes');
    await page.keyboard.type('0711 12a34b56');
    report((await page.inputValue('#f-phone')) === '0711 123456', 'form phone letters filtered while typing', await page.inputValue('#f-phone'));
    await page.fill('#f-phone', '0711 1234');
    await page.evaluate(() => document.getElementById('f-phone').setSelectionRange(4, 4));
    await page.keyboard.type('x');
    const caret = await page.evaluate(() => [document.getElementById('f-phone').value, document.getElementById('f-phone').selectionStart]);
    report(caret[0] === '0711 1234' && caret[1] === 4, 'form phone caret kept', JSON.stringify(caret));
    await page.fill('#f-phone', '+49 abc 711');
    report((await page.inputValue('#f-phone')) === '+49  711', 'form phone pasted letters removed', await page.inputValue('#f-phone'));
    await fillAll({ phone: '12345' });
    await submit();
    report(posts.length === 0 && (await txt('#f-phone-err')) === 'Bitte geben Sie eine gültige Telefonnummer an (nur Ziffern).', 'form phone "12345" rejected');

    // Valid submit
    server.resetMail();
    await fillAll();
    await submit();
    await page.waitForFunction(() => document.getElementById('contact-form').getAttribute('aria-busy') === 'true');
    const busy = await page.evaluate(() => { const b = document.querySelector('#contact-form button[type="submit"]'); return [b.disabled, b.textContent]; });
    report(busy[0] === true && busy[1] === 'Wird gesendet…', 'form busy state', JSON.stringify(busy));
    await page.waitForSelector('#form-status[data-state="success"]');
    report(posts.length === 1, 'form valid submit sends one request', String(posts.length));
    const sent = JSON.parse(posts[0].postData());
    report(Object.keys(sent).sort().join() === 'email,hp_website,message,name,phone,t', 'form body keys', Object.keys(sent).join());
    report(sent.hp_website === '' && sent.t >= 3000, 'form honeypot empty and t >= 3000', `t=${sent.t}`);
    report((await txt('#form-status')).startsWith('Vielen Dank!'), 'form success text');
    const after = await page.evaluate(() => ['name', 'email', 'phone', 'message'].map((k) => document.getElementById('f-' + k).value).join(''));
    report(after === '', 'form reset after success');
    report(server.mails.length === 1 && server.mails[0].phone === '+49 711 123456', 'form mail with phone received', JSON.stringify(server.mails));
    const btn = await page.evaluate(() => { const b = document.querySelector('#contact-form button[type="submit"]'); return [b.disabled, b.textContent]; });
    report(btn[0] === false && btn[1] === 'Nachricht senden', 'form button restored');

    // Honeypot
    await fillAll();
    await page.evaluate(() => { document.getElementById('f-hp_website').value = 'http://spam.example'; document.getElementById('form-status').textContent = ''; });
    const mailsBefore = server.mails.length;
    await submit();
    await statusStarts('Vielen Dank');
    report(server.mails.length === mailsBefore && (await txt('#form-status')).startsWith('Vielen Dank'), 'form honeypot fake success without mail');
    const hp = await page.evaluate(() => { const w = document.getElementById('f-hp_website').parentElement; const r = w.getBoundingClientRect(); return [r.right <= 0, w.getAttribute('aria-hidden')]; });
    report(hp[0] === true && hp[1] === 'true', 'form honeypot off-screen and aria-hidden', JSON.stringify(hp));

    // Rate limit
    server.resetMail();
    for (let i = 0; i < 3; i++) {
      await fillAll();
      await page.evaluate(() => { document.getElementById('form-status').textContent = ''; });
      await submit();
      await statusStarts('Vielen Dank');
    }
    await fillAll();
    await page.evaluate(() => { document.getElementById('form-status').textContent = ''; });
    await submit();
    await statusStarts('Zu viele');
    report((await txt('#form-status')) === 'Zu viele Anfragen – bitte in einigen Minuten erneut versuchen.' && (await page.getAttribute('#form-status', 'data-state')) === 'error', '429 message', await txt('#form-status'));
    await page.waitForFunction(() => !document.querySelector('#contact-form button[type="submit"]').disabled);

    // 400 text safety
    await page.route('**/sendMail.php', (r) => r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: '<b>x</b>' }) }));
    await fillAll();
    await submit();
    await statusStarts('<b>x');
    report((await txt('#form-status')) === '<b>x</b>' && !(await page.$('#form-status b')), '400 server text rendered as plain text');
    await page.unroute('**/sendMail.php');

    // 500 and network error
    for (const [label, handler] of [['500', (r) => r.fulfill({ status: 500, body: 'x' })], ['network', (r) => r.abort()]]) {
      await page.route('**/sendMail.php', handler);
      await fillAll();
      await page.evaluate(() => { document.getElementById('form-status').textContent = ''; });
      await submit();
      await statusStarts('Senden fehlgeschlagen');
      const t = (await txt('#form-status')) || '';
      report(t.includes('+49 172 232 14 82') && t.includes('info@ms-bauconsult.de'), `${label} error points to phone and e-mail`);
      await page.waitForFunction(() => !document.querySelector('#contact-form button[type="submit"]').disabled);
      report(await page.isEnabled('#contact-form button[type="submit"]'), `${label} button usable again`);
      await page.unroute('**/sendMail.php');
    }

    // FORM-07 regression
    await page.click('#contact-form a[data-dialog="datenschutz"]');
    report(await page.evaluate(() => document.getElementById('dlg-datenschutz').open), 'form privacy link opens dialog');

    const st = await page.evaluate(() => [localStorage.length, sessionStorage.length, document.cookie]);
    report(st[0] === 0 && st[1] === 0 && st[2] === '', 'form no storage and no cookies', JSON.stringify(st));
    await ctx.close();
  },
  async anchors() {
    const settle = async (page) => {
      let prev = -1;
      for (let i = 0; i < 40; i += 1) {
        const y = await page.evaluate(() => window.scrollY);
        if (y === prev) return;
        prev = y;
        await page.waitForTimeout(120);
      }
    };
    const topOf = (page, id) => page.evaluate((i) => document.getElementById(i).getBoundingClientRect().top, id);
    const near = (v, c, tol) => Math.abs(v - c) <= tol;
    const ctx = await newContext();
    const page = await ctx.newPage();

    // Deep link -> close dialog -> nav click keeps location exactly origin + "/"
    await page.goto(origin + '/#impressum', { waitUntil: 'load' });
    await page.waitForFunction(() => location.hash === '', null, { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(600);
    report(await page.evaluate(() => document.getElementById('dlg-impressum').open), 'anchors deep link /#impressum opens dialog');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(550);
    await page.click('nav a[href="#services"]');
    await settle(page);
    const href0 = await page.evaluate(() => location.href);
    report(href0 === origin + '/', 'anchors after /#impressum + close + nav click location is origin + "/"', href0);

    // Fresh page: nav link
    await page.goto(origin + '/', { waitUntil: 'load' });
    await page.click('nav a[href="#services"]');
    await settle(page);
    const st = await page.evaluate(() => ({ href: location.href, act: document.activeElement.id }));
    report(st.href === origin + '/', 'anchors nav "Leistungen" leaves no hash', st.href);
    const t1 = await topOf(page, 'services');
    report(near(t1, 112, 40), 'anchors #services top near 112 px (scroll-mt-28)', String(t1));
    report(st.act === 'services', 'anchors focus moves to #services', st.act);

    // Card button
    const card = page.locator('#services a.btn-secondary').first();
    await card.scrollIntoViewIfNeeded();
    const cardHref = await card.getAttribute('href');
    await card.click();
    await settle(page);
    const st2 = await page.evaluate(() => ({ href: location.href, act: document.activeElement.id }));
    const t2 = await topOf(page, 'contact');
    report(cardHref === '#contact' && st2.href === origin + '/' && st2.act === 'contact' && near(t2, 112, 40), 'anchors card button -> #contact, no hash, focus', JSON.stringify({ cardHref, ...st2, t2 }));

    // Brand link from a scrolled position
    await page.click('nav a[href="#top"]');
    await settle(page);
    const st3 = await page.evaluate(() => ({ y: window.scrollY, href: location.href }));
    report(st3.y < 5 && st3.href === origin + '/', 'anchors brand link scrolls to top, no hash', JSON.stringify(st3));

    // Skip link
    await page.goto(origin + '/', { waitUntil: 'load' });
    await page.keyboard.press('Tab');
    const onSkip = await page.evaluate(() => document.activeElement.getAttribute('href'));
    await page.keyboard.press('Enter');
    await settle(page);
    const st4 = await page.evaluate(() => ({ act: document.activeElement.id, href: location.href }));
    report(onSkip === '#main' && st4.act === 'main' && st4.href === origin + '/', 'anchors skip link focuses main, no hash', JSON.stringify({ onSkip, ...st4 }));

    // Ctrl-click not intercepted
    const dp = await page.evaluate(() => {
      let v = null;
      const a = document.querySelector('nav a[href="#about"]');
      document.addEventListener('click', (e) => { v = e.defaultPrevented; e.preventDefault(); }, { once: true });
      a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true, button: 0 }));
      return v;
    });
    report(dp === false, 'anchors ctrl-click not intercepted', String(dp));
    await ctx.close();

    // Reduced motion: instant jump
    const rctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const rp = await rctx.newPage();
    await rp.goto(origin + '/', { waitUntil: 'load' });
    await rp.click('nav a[href="#contact"]');
    await rp.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const rt = await topOf(rp, 'contact');
    report(near(rt, 112, 40), 'anchors reduced motion jumps instantly', String(rt));
    await rctx.close();
  },

  async menu() {
    const ctx = await newContext({ width: 375, height: 800 });
    const page = await ctx.newPage();
    await page.goto(origin + '/', { waitUntil: 'load' });
    const exp = () => page.getAttribute('#menu-toggle', 'aria-expanded');
    const panelVisible = () => page.isVisible('#mobile-menu');
    report(await page.isVisible('#menu-toggle'), 'menu toggle visible at 375');
    report((await exp()) === 'false' && !(await panelVisible()), 'menu closed initially');
    await page.click('#menu-toggle');
    report((await exp()) === 'true' && (await panelVisible()), 'menu opens, aria-expanded true');
    const links = await page.$$eval('#mobile-menu a', (as) => as.map((a) => a.getAttribute('href') + '|' + a.textContent.trim()));
    report(links.join() === '#about|Über mich,#services|Leistungen,#waermepumpe|Wärmepumpe,#contact|Kontakt,#contact|Projekt anfragen', 'menu has 4 section links + Projekt anfragen', links.join());
    report(await page.isVisible('#mobile-menu a.btn-primary'), 'menu "Projekt anfragen" visible at 375');
    await page.click('#mobile-menu a[href="#services"]');
    await page.waitForTimeout(900);
    const st = await page.evaluate(() => ({ href: location.href, act: document.activeElement.id }));
    report(!(await panelVisible()) && (await exp()) === 'false' && st.href === origin + '/' && st.act === 'services', 'menu link closes panel, no hash, #services focused', JSON.stringify(st));
    await page.click('#menu-toggle');
    await page.keyboard.press('Escape');
    const act = await page.evaluate(() => document.activeElement.id);
    report(!(await panelVisible()) && act === 'menu-toggle' && (await exp()) === 'false', 'menu Esc closes and focuses toggle', act);
    await page.click('#menu-toggle');
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.waitForTimeout(150);
    report(!(await panelVisible()) && !(await page.isVisible('#menu-toggle')) && (await exp()) === 'false', 'menu closes when viewport grows to 1100');
    await ctx.close();

    for (const w of [320, 360, 375]) {
      const c = await newContext({ width: w, height: 800 });
      const p = await c.newPage();
      await p.goto(origin + '/', { waitUntil: 'load' });
      const m = await p.evaluate(() => {
        const de = document.documentElement;
        const pill = document.querySelector('nav > div > div').getBoundingClientRect();
        const t = document.getElementById('menu-toggle').getBoundingClientRect();
        const n = [...document.querySelectorAll('nav span')].find((e) => e.textContent === 'MUHAMED SHALA');
        const lh = parseFloat(getComputedStyle(n).lineHeight);
        return { sw: de.scrollWidth, cw: de.clientWidth, gap: pill.right - t.right, h: n.getBoundingClientRect().height, lh };
      });
      report(m.sw <= m.cw, `menu no horizontal overflow at ${w}`, JSON.stringify(m));
      report(m.gap >= 8, `menu toggle inside pill (>= 8 px) at ${w}`, JSON.stringify(m));
      report(m.h <= 1.5 * m.lh, `menu brand name on one line at ${w}`, JSON.stringify(m));
      await c.close();
    }
  },

  async consent() {
    const TP = /heizreport\.de|heiz\.report/;
    const STUB = "document.addEventListener('DOMContentLoaded', () => { document.getElementById('wp_check_script').textContent = 'stub-ok'; });";
    const open = async (handler) => {
      const ctx = await newContext();
      const counter = { n: 0 };
      await ctx.route(TP, (route) => { counter.n += 1; return handler(route); });
      const page = await ctx.newPage();
      const log = [];
      page.on('request', (r) => { if (TP.test(r.url())) log.push(r.url()); });
      await page.goto(origin + '/', { waitUntil: 'load' });
      return { ctx, page, counter, log };
    };
    const stubbed = (route) => (/heizreport_3\.js/.test(route.request().url())
      ? route.fulfill({ status: 200, contentType: 'application/javascript', body: STUB })
      : route.abort());

    const { ctx, page, counter, log } = await open(stubbed);
    await page.locator('#waermepumpe').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    report(counter.n === 0 && log.length === 0, 'consent no third-party request before click (route counter + request log)', `${counter.n}/${log.length}`);
    await page.locator('#wp-load').scrollIntoViewIfNeeded();
    await page.click('#wp-load');
    await page.waitForFunction(() => document.getElementById('wp_check_script')?.textContent === 'stub-ok', null, { timeout: 5000 }).catch(() => {});
    const w = await page.evaluate(() => {
      const b = document.getElementById('wp_check_script');
      return {
        text: b?.textContent,
        color: b?.getAttribute('data-primary-color'),
        user: b?.getAttribute('data-heizreport-user'),
        ans: b?.getAttribute('data-heizreport-ansprache'),
        cls: b?.className,
        native: document.addEventListener.toString().includes('[native code]'),
        consentHidden: document.getElementById('wp-consent').hidden,
      };
    });
    report(w.color === '#85650F' && w.user === 'info@ms-bauconsult.de' && w.ans === 'sie' && w.cls === 'heizreport', 'consent widget container attributes', JSON.stringify(w));
    report(w.text === 'stub-ok', 'consent widget initialised despite late load (DOMContentLoaded replay)', String(w.text));
    report(w.native, 'consent document.addEventListener native again');
    report(w.consentHidden && !(await page.isVisible('#wp-consent')), 'consent box hidden after click');
    await page.evaluate(() => document.getElementById('wp-load').click());
    await page.waitForTimeout(200);
    const scripts = await page.evaluate(() => document.querySelectorAll('script[src="https://heizreport.de/js/heizreport_3.js"]').length);
    report(scripts === 1, 'consent exactly one heizreport script after second click', String(scripts));
    const stor = await page.evaluate(() => [localStorage.length, sessionStorage.length, document.cookie]);
    report(stor[0] === 0 && stor[1] === 0 && stor[2] === '', 'consent no storage and no cookies', JSON.stringify(stor));
    const before = counter.n;
    counter.n = 0;
    log.length = 0;
    await page.reload({ waitUntil: 'load' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    report(before >= 1, 'consent script request went through route after click', String(before));
    report((await page.isVisible('#wp-consent')) && counter.n === 0 && log.length === 0, 'consent box visible again after reload, no third-party request', `${counter.n}/${log.length}`);
    await ctx.close();

    // Error path
    const err = await open((route) => route.abort());
    await err.page.locator('#wp-load').scrollIntoViewIfNeeded();
    await err.page.click('#wp-load');
    await err.page.waitForSelector('#wp-error:not([hidden])', { timeout: 5000 }).catch(() => {});
    const e = await err.page.evaluate(() => ({
      consent: !document.getElementById('wp-consent').hidden,
      enabled: !document.getElementById('wp-load').disabled,
      msg: document.getElementById('wp-error').textContent,
      errVisible: !document.getElementById('wp-error').hidden,
      native: document.addEventListener.toString().includes('[native code]'),
      empty: document.getElementById('wp-check').children.length === 0,
    }));
    report(e.consent && e.enabled && e.errVisible && e.msg === 'Der Wärmepumpen-Check konnte nicht geladen werden. Bitte versuchen Sie es später erneut.' && e.native && e.empty, 'consent error path restores box, button, message', JSON.stringify(e));
    await err.ctx.close();

    if (process.argv.includes('--online')) {
      const octx = await newContext();
      await octx.route(/heizreport\.de\/web\//, (route) => route.abort());
      const op = await octx.newPage();
      try {
        await op.goto(origin + '/', { waitUntil: 'load' });
        await op.locator('#wp-load').scrollIntoViewIfNeeded();
        await op.click('#wp-load');
        await op.waitForFunction(() => document.querySelector('#wp_check_script')?.children.length > 0, null, { timeout: 15000 });
        console.log('INFO consent --online: real widget rendered child elements within 15 s');
      } catch (x) {
        console.log(`INFO consent --online: widget did not render within 15 s (${String(x.message).split('\n')[0]})`);
      }
      await octx.close();
    }
  },
};

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const selected = args.length ? args : Object.keys(groups);
try {
  for (const g of selected) {
    if (!groups[g]) {
      report(false, `group ${g}`, 'unknown');
      continue;
    }
    server.resetMail();
    await groups[g]();
  }
} finally {
  await browser?.close();
  await server.close();
}
process.exit(fails === 0 ? 0 : 1);
