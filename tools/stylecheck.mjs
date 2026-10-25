// Design-drift guard (replaces pixel parity once texts change).
// Usage: node tools/stylecheck.mjs index.html --record   (record baseline using OLD selectors)
//        node tools/stylecheck.mjs index.html            (compare using NEW selectors)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from './node_modules/playwright/index.mjs';
import { startServer } from './serve.mjs';

const args = process.argv.slice(2);
const record = args.includes('--record');
const pagePath = args.find((a) => !a.startsWith('--'));
if (!pagePath) {
  console.error('usage: node tools/stylecheck.mjs <pagePath> [--record]');
  process.exit(2);
}
const root = path.resolve(import.meta.dirname, '..');
const BASELINE = path.join(root, '.planning/phases/02-inhalte-neue-sektionen/baseline/styles.json');
const FREEZE_CSS =
  '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}#hero-canvas{visibility:hidden!important}html{scroll-behavior:auto!important}';

const BTN = ['paddingTop', 'paddingLeft', 'borderTopColor', 'borderTopWidth', 'borderTopLeftRadius', 'boxShadow', 'color', 'backgroundColor', 'fontWeight'];
// Deliberate omissions (intentional design changes): hero badge text color (gold-700),
// kicker color, statValue at 375 (mobile stats change). Everything else must stay identical.
const KEYS = [
  { key: 'navPill', old: 'nav > div > div', neu: 'nav > div > div', props: ['backgroundColor', 'borderTopLeftRadius', 'paddingTop', 'paddingLeft', 'boxShadow', 'borderTopColor'] },
  { key: 'h1', old: 'h1', neu: 'h1', props: ['fontFamily', 'fontSize', 'lineHeight', 'fontWeight', 'color', 'letterSpacing'] },
  { key: 'shimmer', old: '.shimmer-text-light', neu: '.shimmer-text-light', props: ['animationName', 'backgroundImage', 'fontStyle', 'fontWeight'] },
  { key: 'heroBadge', old: '.inline-flex.rounded-full.glass-card-light', neu: '.inline-flex.rounded-full.glass-card-light', props: ['paddingTop', 'paddingLeft', 'borderTopLeftRadius', 'backgroundImage', 'borderTopColor'] },
  { key: 'statValue', old: '.grid.grid-cols-3 > div > div:first-child', neu: '.grid.grid-cols-3 > div > div:first-child', props: ['fontFamily', 'fontSize', 'fontWeight', 'color'], vw: [1440] },
  { key: 'portraitBox', old: 'div.h-72', neu: 'div.h-72', props: ['width', 'height', 'borderTopLeftRadius'] },
  { key: 'beam', old: '.border-beam-container', neu: '.border-beam-container', props: ['borderTopLeftRadius', 'paddingTop', 'boxShadow'] },
  { key: 'serviceCard', old: '.spotlight-card', neu: '.spotlight-card', props: ['paddingTop', 'paddingLeft', 'borderTopLeftRadius', 'backgroundImage', 'boxShadow', 'borderTopColor'] },
  { key: 'iconTile', old: '.spotlight-card > div:first-child', neu: '.spotlight-card > div:first-child', props: ['width', 'height', 'borderTopLeftRadius', 'backgroundColor', 'color', 'borderTopColor'] },
  { key: 'serviceH3', old: '.spotlight-card h3', neu: '.spotlight-card h3', props: ['fontFamily', 'fontSize', 'fontWeight', 'color', 'lineHeight'] },
  { key: 'serviceP', old: '.spotlight-card p', neu: '.spotlight-card p', props: ['fontSize', 'lineHeight', 'color'] },
  { key: 'sectionH2', old: '#services h2', neu: '#services h2', props: ['fontFamily', 'fontSize', 'fontWeight', 'color'] },
  { key: 'kicker', old: '#services span.font-mono', neu: '#services span.font-mono', props: ['fontFamily', 'fontSize', 'letterSpacing', 'textTransform', 'fontWeight'] },
  { key: 'btnPrimary', old: '.vbc-btn-c-primary-light', neu: '.btn-primary', props: BTN },
  { key: 'btnSecondary', old: '.vbc-btn-c-secondary-light', neu: '.btn-secondary', props: BTN },
  { key: 'footer', old: 'footer', neu: 'footer', props: ['backgroundColor', 'borderTopColor', 'borderTopWidth', 'paddingTop', 'fontSize', 'color'] },
  { key: 'body', old: 'body', neu: 'body', props: ['backgroundColor', 'color', 'fontFamily'] },
];

const server = await startServer(root);
const browser = await chromium.launch({ channel: 'chrome' });
const actual = {};
try {
  const url = `http://127.0.0.1:${server.port}/` + pagePath.replace(/^\/+/, '');
  for (const w of [1440, 375]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: FREEZE_CSS });
    for (const k of KEYS) {
      if (k.vw && !k.vw.includes(w)) continue;
      actual[`${k.key}@${w}`] = await page.evaluate(
        ({ sel, props }) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const cs = getComputedStyle(el);
          return Object.fromEntries(props.map((p) => [p, cs[p]]));
        },
        { sel: record ? k.old : k.neu, props: k.props },
      );
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  await server.close();
}

if (record) {
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(BASELINE, JSON.stringify(actual, null, 2) + '\n');
  console.log(`recorded ${Object.keys(actual).length} keys -> ${path.relative(root, BASELINE)}`);
  process.exit(0);
}
if (!fs.existsSync(BASELINE)) {
  console.error('baseline missing: run with --record on the unchanged Phase-1 page first');
  process.exit(2);
}
const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
let fail = 0;
for (const [id, exp] of Object.entries(base)) {
  const act = actual[id];
  if (!act) {
    console.log(`FAIL styles ${id} element missing`);
    fail++;
    continue;
  }
  if (!exp) {
    console.log(`FAIL styles ${id} baseline element was missing`);
    fail++;
    continue;
  }
  const diffs = Object.keys(exp).filter((p) => exp[p] !== act[p]);
  if (diffs.length) {
    fail++;
    for (const p of diffs) console.log(`FAIL styles ${id} ${p}: ${exp[p]} != ${act[p]}`);
  } else console.log(`PASS styles ${id}`);
}
process.exit(fail ? 1 : 0);
