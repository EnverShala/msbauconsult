// Usage: node tools/netcheck.mjs <pagePath>  -> exit 0 iff no foreign request
import path from 'node:path';
import { chromium } from './node_modules/playwright/index.mjs';
import { startServer } from './serve.mjs';

const pagePath = process.argv[2];
if (!pagePath) {
  console.error('usage: node tools/netcheck.mjs <pagePath>');
  process.exit(2);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = await startServer(path.resolve(import.meta.dirname, '..'));
const browser = await chromium.launch({ channel: 'chrome' });
const origin = `http://127.0.0.1:${server.port}`;
const urls = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('request', (r) => urls.push(r.url()));
  await page.goto(origin + (pagePath === '/' ? '/' : '/' + pagePath.replace(/^\/+/, '')), {
    waitUntil: 'networkidle',
  });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(1000);
  await page.waitForLoadState('networkidle');
  await ctx.close();
} finally {
  await browser.close();
  await server.close();
}
const foreign = urls.filter(
  (u) => !u.startsWith(origin + '/') && u !== origin && !u.startsWith('data:') && !u.startsWith('blob:'),
);
console.log(`requests=${urls.length} foreign=${foreign.length}`);
for (const u of foreign) console.log(u);
process.exit(foreign.length === 0 ? 0 : 1);
