// Usage: node tools/sectionshot.mjs <pagePath> <selector> <width> <outFile>
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from './node_modules/playwright/index.mjs';
import { startServer } from './serve.mjs';

const [pagePath, selector, widthArg, outFile] = process.argv.slice(2);
if (!pagePath || !selector || !widthArg || !outFile) {
  console.error('usage: node tools/sectionshot.mjs <pagePath> <selector> <width> <outFile>');
  process.exit(2);
}
const width = Number(widthArg);
const root = path.resolve(import.meta.dirname, '..');
const FREEZE_CSS =
  '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}#particles-canvas{display:none!important}html{scroll-behavior:auto!important}';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await startServer(root);
const browser = await chromium.launch({ channel: 'chrome' });
let code = 0;
try {
  const url = `http://127.0.0.1:${server.port}/${pagePath.replace(/^\/+/, '')}`;
  const ctx = await browser.newContext({
    viewport: { width, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 200));
    window.scrollTo(0, 0);
  });
  await page.addStyleTag({ content: FREEZE_CSS });
  await sleep(300);
  const loc = page.locator(selector).first();
  if ((await loc.count()) === 0) {
    console.error(`selector not found: ${selector}`);
    code = 1;
  } else {
    fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
    const buf = await loc.screenshot({ path: outFile });
    console.log(`${outFile} ${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`);
  }
  await ctx.close();
} finally {
  await browser.close();
  await server.close();
}
process.exit(code);
