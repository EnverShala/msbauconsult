// Usage: node tools/layoutcheck.mjs <pagePath> [outDir]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from './node_modules/playwright/index.mjs';
import { startServer } from './serve.mjs';

const [pagePath, outDir] = process.argv.slice(2);
if (!pagePath) {
  console.error('usage: node tools/layoutcheck.mjs <pagePath> [outDir]');
  process.exit(2);
}
const root = path.resolve(import.meta.dirname, '..');
const FREEZE_CSS =
  '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}#particles-canvas{display:none!important}html{scroll-behavior:auto!important}';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const report = (ok, name, detail = '') => {
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${!ok && detail ? ' ' + detail : ''}`);
};

if (outDir) fs.mkdirSync(outDir, { recursive: true });
const server = await startServer(root);
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const url = `http://127.0.0.1:${server.port}/` + pagePath.replace(/^\/+/, '');
  for (const w of [320, 375, 768, 1023, 1024, 1440]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()));
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(500);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, 0));

    const m = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      iw: window.innerWidth,
      badImgs: [...document.images].filter((i) => !(i.complete && i.naturalWidth > 0)).map((i) => i.currentSrc || i.src),
      h1: document.querySelectorAll('h1').length,
      box: (() => {
        const el = document.querySelector('div.h-72');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { w: r.width, h: r.height };
      })(),
    }));
    report(m.sw <= m.iw, `overflow-${w}`, `scrollWidth ${m.sw} > innerWidth ${m.iw}`);
    report(errors.length === 0, `errors-${w}`, errors.join(' | '));
    report(m.badImgs.length === 0, `images-${w}`, m.badImgs.join(', '));
    report(m.h1 === 1, `h1-${w}`, `h1 count ${m.h1}`);
    if (m.box) report(m.box.w / m.box.h <= 1.4, `portrait-${w}`, `box ${m.box.w}x${m.box.h}`);
    else report(true, `portrait-${w}`);
    if (outDir && m.box) {
      await page.addStyleTag({ content: FREEZE_CSS });
      await page.locator('div.h-72').screenshot({ path: path.join(outDir, `portrait-${w}.png`) });
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  await server.close();
}
process.exit(fails ? 1 : 0);
