// Usage: node tools/interactcheck.mjs [group ...]  -> exit 0 iff no FAIL
// Interaction checks against the dev server with the sendMail.php mock.
// Later plans add groups: dialogs, deeplinks, form, anchors, menu, consent.
// The flag --online is reserved (checks against a live host).
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
