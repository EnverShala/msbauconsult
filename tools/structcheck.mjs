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
check('canvas-hidden', /<canvas id="particles-canvas"[^>]*aria-hidden="true"/.test(body) || /<canvas[^>]*aria-hidden="true"[^>]*id="particles-canvas"/.test(body));
const need = ['top', 'about', 'services', 'waermepumpe', 'contact', 'main', 'contact-form'];
check('required-ids', need.every((i) => ids.has(i)), 'missing: ' + need.filter((i) => !ids.has(i)).join(','));
const hrefs = [...body.matchAll(/href="#([^"]*)"/g)].map((m) => m[1]);
check('anchors', hrefs.every((h) => h && ids.has(h)) && !body.includes('href="#"'), 'dangling: ' + hrefs.filter((h) => !h || !ids.has(h)).join(','));
const title = dec((body.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '');
check('title', title.length > 0 && title.length <= 60 && title.includes('MS Bauconsult'), `"${title}" (${title.length})`);
const desc = dec(metaContent('name', 'description') || '');
check('meta-description', desc.length >= 110 && desc.length <= 160, `length ${desc.length}`);
check('canonical', /<link rel="canonical" href="https:\/\/www\.ms-bauconsult\.de\/">/.test(body));
const og = Object.fromEntries(['type', 'url', 'title', 'description', 'image'].map((k) => [k, metaContent('property', 'og:' + k)]));
const ORIGIN = 'https://www.ms-bauconsult.de/';
check('og', Object.values(og).every(Boolean) && og.image.startsWith(ORIGIN) && fs.existsSync(path.join(pageDir, og.image.slice(ORIGIN.length))), JSON.stringify(og));
const ld = [...body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
let ldOk = false;
if (ld.length === 1) {
  try {
    const j = JSON.parse(ld[0][1]);
    ldOk = j['@type'] === 'ProfessionalService' && j.telephone === '+491722321482' && j.address?.postalCode === '70734' && j.address?.streetAddress === 'Stettener Str. 24' && j.email === 'info@ms-bauconsult.de';
  } catch {}
}
check('json-ld', ldOk, `blocks=${ld.length}`);
const form = (body.match(/<form[^>]*\sid="contact-form"[\s\S]*?<\/form>/) || [''])[0];
const fields = [...form.matchAll(/<(input|textarea)\b[^>]*>/g)].map((m) => m[0]).filter((t) => /\sname="/.test(t));
const byName = Object.fromEntries(fields.map((t) => [t.match(/\sname="([^"]+)"/)[1], t]));
const names = Object.keys(byName).sort().join(',');
check(
  'form-fields',
  names === 'email,message,name,phone,website' &&
    ['name', 'email', 'message'].every((n) => /\srequired\b/.test(byName[n])) &&
    /type="email"/.test(byName.email || '') && /type="tel"/.test(byName.phone || '') &&
    /tabindex="-1"/.test(byName.website || '') && /autocomplete="off"/.test(byName.website || ''),
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
