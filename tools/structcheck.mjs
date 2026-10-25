// Static Phase-2 structure checker. Usage: node tools/structcheck.mjs index.html
import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2];
if (!file) {
  console.error('usage: node tools/structcheck.mjs <page.html>');
  process.exit(2);
}
const root = path.resolve(import.meta.dirname, '..');
const pageDir = path.dirname(path.resolve(root, file));
const raw = fs.readFileSync(path.resolve(root, file), 'utf8');
const body = raw.replace(/<!--[\s\S]*?-->/g, '');
let fails = 0;
const check = (name, ok, detail = '') => {
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${!ok && detail ? ' ' + detail : ''}`);
};
const count = (re, s = body) => (s.match(re) || []).length;
const dec = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const metaContent = (attr, val) => {
  for (const m of body.matchAll(/<meta\b[^>]*>/g)) {
    if (new RegExp(`${attr}="${val}"`).test(m[0])) return (m[0].match(/content="([^"]*)"/) || [])[1];
  }
};
const ids = new Set([...body.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

check('lang', /<html[^>]*\slang="de"/.test(body));
check('landmarks', ['<h1', '<main', '<header', '<footer'].every((t) => count(new RegExp(t + '[\\s>]', 'g')) === 1) && /<main[^>]*\sid="main"/.test(body));
const skip = body.indexOf('<a href="#main"');
check('skip-link', skip >= 0 && skip < body.indexOf('<header'));
check('canvas-hidden', /<canvas id="hero-canvas" aria-hidden="true">/.test(body));
const need = ['top', 'about', 'services', 'waermepumpe', 'contact', 'main', 'contact-form'];
check('required-ids', need.every((i) => ids.has(i)), 'missing: ' + need.filter((i) => !ids.has(i)).join(','));
const hrefs = [...body.matchAll(/href="#([^"]*)"/g)].map((m) => m[1]);
check('anchors', hrefs.every((h) => h && ids.has(h)) && !body.includes('href="#"'), 'dangling: ' + hrefs.filter((h) => !h || !ids.has(h)).join(','));
const title = dec((body.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '');
check('title', title.length > 0 && title.length <= 60 && ['MS Bauconsult', 'Bau-', 'Energieberatung', 'Fellbach'].every((k) => title.includes(k)), `"${title}" (${title.length})`);
const desc = dec(metaContent('name', 'description') || '');
check('meta-description', desc.length >= 110 && desc.length <= 155 && desc.includes('Ingenieurbüro') && desc.includes('Bau- und Energieberatung'), `length ${desc.length}`);
const ORIGIN = 'https://www.ms-bauconsult.de/';
check('canonical', /<link rel="canonical" href="https:\/\/www\.ms-bauconsult\.de\/">/.test(body));
check('robots-meta', metaContent('name', 'robots') === 'index, follow' && !/noindex/i.test(raw));
const og = Object.fromEntries(['type', 'url', 'title', 'description', 'image', 'image:width', 'image:height', 'image:alt', 'image:type', 'locale', 'site_name'].map((k) => [k, metaContent('property', 'og:' + k)]));
check('og', Object.values(og).every(Boolean) && og.url === ORIGIN && og.image.startsWith(ORIGIN) && fs.existsSync(path.join(pageDir, og.image.slice(ORIGIN.length))), JSON.stringify(og));
function jpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}
let dims = null;
try { dims = jpegSize(fs.readFileSync(path.join(pageDir, (og.image || '').slice(ORIGIN.length)))); } catch {}
check('og-image-dims', Boolean(dims) && og['image:width'] === String(dims[0]) && og['image:height'] === String(dims[1]) && og['image:type'] === 'image/jpeg', JSON.stringify({ dims, w: og['image:width'], h: og['image:height'] }));
const tw = Object.fromEntries(['card', 'title', 'description', 'image', 'image:alt'].map((k) => [k, metaContent('name', 'twitter:' + k)]));
check('twitter', Object.values(tw).every(Boolean) && tw.card === 'summary_large_image' && tw.image === og.image, JSON.stringify(tw));
const ld = [...body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
let ldOk = false;
let ldDetail = `blocks=${ld.length}`;
if (ld.length === 1) {
  try {
    const j = JSON.parse(ld[0][1]);
    const a = j.address || {};
    const f = j.founder || {};
    const banned = ['geo', 'sameAs', 'aggregateRating', 'review', 'priceRange'];
    const walk = (o) => (o && typeof o === 'object' ? Object.keys(o).flatMap((k) => [k, ...walk(o[k])]) : []);
    const keys = walk(j);
    ldOk = j['@type'] === 'ProfessionalService' && j.name === 'MS Bauconsult' && j.url === ORIGIN && j.telephone === '+491722321482' && j.email === 'info@ms-bauconsult.de' &&
      a['@type'] === 'PostalAddress' && a.streetAddress === 'Stettener Str. 24' && a.postalCode === '70734' && a.addressLocality === 'Fellbach' && a.addressCountry === 'DE' &&
      Boolean(j.areaServed) && f['@type'] === 'Person' && f.name === 'Muhamed Shala' && f.honorificSuffix === 'M.Eng.' &&
      !keys.some((k) => banned.includes(k) || /^openingHours/.test(k));
    ldDetail = 'fields';
  } catch (e) { ldDetail = 'parse: ' + e.message; }
}
check('json-ld', ldOk, ldDetail);
// headings: one h1, no skipped level outside dialogs; inside each dialog h2 -> h3
const dialogs = [...body.matchAll(/<dialog\b[\s\S]*?<\/dialog>/g)].map((m) => m[0]);
const outside = body.replace(/<dialog\b[\s\S]*?<\/dialog>/g, '');
const levels = (s) => [...s.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
const skips = (lv, start) => lv.some((l, i) => l > (i ? lv[i - 1] : start) + 1);
check('headings', count(/<h1[\s>]/g) === 1 && !skips(levels(outside), 0) && dialogs.length === 2 && dialogs.every((d) => !skips(levels(d), 1) && levels(d)[0] === 2), JSON.stringify(levels(outside)));
const imgs = [...body.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
check('img-alt', imgs.length > 0 && imgs.every((t) => /\salt="/.test(t)), `imgs=${imgs.length}`);
const generic = /^(mehr|hier|weiter|klick|link|mehr erfahren|beratung anfragen)$/i;
const linkBad = [...body.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/g)].filter((m) => {
  const al = (m[2].match(/aria-label="([^"]*)"/) || [])[1];
  const text = m[3].replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (al) return generic.test(dec(al).trim());
  if (/<img\b[^>]*\salt="[^"]+"/.test(m[3])) return false;
  return !text || generic.test(text) && !al;
});
check('link-names', linkBad.length === 0, linkBad.map((m) => m[0].slice(0, 80)).join(' | '));
check('robots-sitemap-files', /^Allow: \/\s*$/m.test(fs.readFileSync(path.join(root, 'robots.txt'), 'utf8')) && fs.readFileSync(path.join(root, 'robots.txt'), 'utf8').includes('Sitemap: ' + ORIGIN + 'sitemap.xml') &&
  (() => { const x = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8'); return x.includes('<loc>' + ORIGIN + '</loc>') && /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(x); })());
const form = (body.match(/<form[^>]*\sid="contact-form"[\s\S]*?<\/form>/) || [''])[0];
const fields = [...form.matchAll(/<(input|textarea)\b[^>]*>/g)].map((m) => m[0]).filter((t) => /\sname="/.test(t));
const byName = Object.fromEntries(fields.map((t) => [t.match(/\sname="([^"]+)"/)[1], t]));
const names = Object.keys(byName).sort().join(',');
check(
  'form-fields',
  names === 'email,hp_website,message,name,phone' &&
    ['name', 'email', 'message'].every((n) => /\srequired\b/.test(byName[n])) &&
    /type="email"/.test(byName.email || '') && /type="tel"/.test(byName.phone || '') &&
    /tabindex="-1"/.test(byName.hp_website || '') && /autocomplete="off"/.test(byName.hp_website || ''),
  'fields=' + names,
);
const formTag = (form.match(/^<form[^>]*>/) || [''])[0];
check('form-no-get', /method="post"/i.test(formTag) && !/\saction=/.test(formTag));
const refs = [...body.matchAll(/\ssrc="([^"]+)"/g)].map((m) => m[1]);
for (const m of body.matchAll(/\ssrcset="([^"]+)"/g)) refs.push(...m[1].split(',').map((s) => s.trim().split(/\s+/)[0]));
for (const m of body.matchAll(/<(?:a|link)\b[^>]*\shref="([^"]+)"/g)) refs.push(m[1]);
const local = refs.filter((r) => r && !/^(https?:|#|mailto:|tel:|data:)/.test(r) && r !== '/impressum' && r !== '/datenschutz');
const missing = local.filter((r) => !fs.existsSync(path.join(pageDir, r.split(/[?#]/)[0].replace(/^\//, ''))));
check('assets-exist', missing.length === 0, 'missing: ' + missing.join(', '));
check(
  'hero-variant-comment',
  /<!--[\s\S]*?assets\/img\/hero\/hero-1600\.avif[\s\S]*?-->/.test(raw) || fs.existsSync(path.join(root, '.planning/phases/02-inhalte-neue-sektionen/HERO-VARIANT-OMITTED')),
);
const services = (body.match(/id="services"[\s\S]*?<\/section>/) || [''])[0];
const labelBad = [...services.matchAll(/<a\b[^>]*class="[^"]*btn-secondary[^"]*"[^>]*>([\s\S]*?)<\/a>/g)].filter((m) => {
  const al = (m[0].match(/aria-label="([^"]*)"/) || [])[1];
  const text = dec(m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  return al && !dec(al).startsWith(text);
});
check('card-labels', labelBad.length === 0 && count(/spotlight-card/g) === 6, `spotlight-card=${count(/spotlight-card/g)} badLabels=${labelBad.length}`);
const small = ['text-xs', 'text-[8px]', 'text-[10px]', 'text-[11px]', 'text-sm', 'font-mono'];
const goldBad = [...body.matchAll(/class="([^"]*)"/g)].map((m) => m[1].split(/\s+/)).filter((c) => (c.includes('text-gold-600') && small.some((s) => c.includes(s))) || c.some((t) => /^hover:text-gold-(500|600)$/.test(t)));
check('gold-small-text', goldBad.length === 0, `${goldBad.length} elements`);
process.exit(fails ? 1 : 0);
