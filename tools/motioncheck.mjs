// Usage: node tools/motioncheck.mjs <pagePath>  -> exit 0 iff all checks PASS
import path from 'node:path';
import { chromium } from './node_modules/playwright/index.mjs';
import { startServer } from './serve.mjs';

const pagePath = process.argv[2];
if (!pagePath) {
  console.error('usage: node tools/motioncheck.mjs <pagePath>');
  process.exit(2);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = await startServer(path.resolve(import.meta.dirname, '..'));
const browser = await chromium.launch({ channel: 'chrome' });
const url = `http://127.0.0.1:${server.port}${pagePath === '/' ? '/' : '/' + pagePath.replace(/^\/+/, '')}`;
const results = [];
const check = (name, ok) => results.push([name, !!ok]);

try {
  // (a) reduced motion
  {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await sleep(500);
    const a = await page.screenshot();
    await sleep(1000);
    const b = await page.screenshot();
    check('reduced-static', Buffer.compare(a, b) === 0);
    const names = await page.evaluate(() => [
      getComputedStyle(document.querySelector('.shimmer-text-light')).animationName,
      getComputedStyle(document.querySelector('.border-beam-container'), '::before').animationName,
      getComputedStyle(document.querySelector('.animate-pulse')).animationName,
    ]);
    check('reduced-anim-none', names.every((n) => n === 'none'));
    await ctx.close();
  }
  // (b) rAF loop + visibility
  {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'no-preference',
    });
    await ctx.addInitScript(() => {
      window.__raf = 0;
      const orig = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => {
        window.__raf++;
        return orig(cb);
      };
    });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await sleep(500);
    check('raf-running', (await page.evaluate(() => window.__raf)) > 0);
    const setHidden = (hidden) =>
      page.evaluate((hidden) => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          get: () => (hidden ? 'hidden' : 'visible'),
        });
        document.dispatchEvent(new Event('visibilitychange'));
      }, hidden);
    await setHidden(true);
    await sleep(100);
    const c2 = await page.evaluate(() => window.__raf);
    await sleep(1000);
    const c3 = await page.evaluate(() => window.__raf);
    check('raf-paused-hidden', c3 - c2 <= 1);
    await setHidden(false);
    await sleep(500);
    const c4 = await page.evaluate(() => window.__raf);
    check('raf-resumed-visible', c4 > c3);
    await ctx.close();
  }
} finally {
  await browser.close();
  await server.close();
}
for (const [n, ok] of results) console.log(`${ok ? 'PASS' : 'FAIL'} ${n}`);
process.exit(results.every(([, ok]) => ok) ? 0 : 1);
