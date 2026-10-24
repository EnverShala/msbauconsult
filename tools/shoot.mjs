// Usage: node tools/shoot.mjs <pagePath> <outDir> <label>
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from './node_modules/playwright/index.mjs';
import { startServer } from './serve.mjs';

const [pagePath, outDir, label] = process.argv.slice(2);
if (!pagePath || !outDir || !label) {
  console.error('usage: node tools/shoot.mjs <pagePath> <outDir> <label>');
  process.exit(2);
}
const root = path.resolve(import.meta.dirname, '..');
const FREEZE_CSS =
  '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}#particles-canvas{display:none!important}html{scroll-behavior:auto!important}';
const MASK_SELECTORS = ['div.h-72', 'nav a.group > div:first-child', 'footer div.w-8.h-8'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function pngSize(buf) {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

async function masks(page, withScroll) {
  return page.evaluate(
    ({ sels, withScroll }) => {
      const sx = withScroll ? window.scrollX : 0;
      const sy = withScroll ? window.scrollY : 0;
      const out = [];
      for (const s of sels) {
        const el = document.querySelector(s);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        out.push([
          Math.floor(r.x + sx) - 2,
          Math.floor(r.y + sy) - 2,
          Math.ceil(r.x + sx + r.width) + 2,
          Math.ceil(r.y + sy + r.height) + 2,
        ]);
      }
      return out;
    },
    { sels: MASK_SELECTORS, withScroll },
  );
}

function write(name, buf, m) {
  fs.writeFileSync(path.join(outDir, `${label}-${name}.png`), buf);
  const { width, height } = pngSize(buf);
  fs.writeFileSync(
    path.join(outDir, `${label}-${name}.json`),
    JSON.stringify({ width, height, masks: m }, null, 2) + '\n',
  );
  console.log(`${label}-${name}.png ${width}x${height}`);
}

fs.mkdirSync(outDir, { recursive: true });
const server = await startServer(root);
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const url = `http://127.0.0.1:${server.port}${pagePath === '/' ? '/' : '/' + pagePath.replace(/^\/+/, '')}`;
  for (const { w, h } of [{ w: 1440, h: 900 }, { w: 375, h: 900 }]) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: h },
      deviceScaleFactor: 1,
      reducedMotion: 'no-preference',
    });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: FREEZE_CSS });
    await sleep(300);
    const m = await masks(page, true);
    const buf = await page.screenshot({ fullPage: true });
    write(String(w), buf, m);

    if (w === 1440) {
      await page.evaluate(() =>
        document.querySelectorAll('.spotlight-card')[1].scrollIntoView({ block: 'center' }),
      );
      await sleep(200);
      const box = await page.evaluate(() => {
        const r = document.querySelectorAll('.spotlight-card')[1].getBoundingClientRect();
        return { x: r.x, y: r.y };
      });
      await page.mouse.move(box.x + 120, box.y + 90);
      await sleep(200);
      const hm = await masks(page, false);
      const hbuf = await page.screenshot({ fullPage: false });
      write('hover-1440', hbuf, hm);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  await server.close();
}
