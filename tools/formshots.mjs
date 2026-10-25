// Usage: node tools/formshots.mjs  -> screenshots of the contact form states (error, busy, success, 429)
// at 1440 and 375 into .planning/phases/03-interaktion/review/ (uses the sendMail.php mock).
import path from 'node:path';
import fs from 'node:fs';
import { chromium } from './node_modules/playwright/index.mjs';
import { startServer } from './serve.mjs';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, '.planning/phases/03-interaktion/review');
fs.mkdirSync(out, { recursive: true });
const server = await startServer(root, { mockMail: true });
const origin = `http://127.0.0.1:${server.port}`;
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const w of [1440, 375]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(origin + '/');
    const shot = async (name) => {
      await page.locator('#contact-form').scrollIntoViewIfNeeded();
      await page.evaluate(() => document.getElementById('contact-form').scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(out, `form-${name}-${w}.png`) });
    };
    const fill = async () => {
      await page.fill('#f-name', 'Jo Müller');
      await page.fill('#f-email', 'jo@example.de');
      await page.fill('#f-phone', '+49 711 123456');
      await page.fill('#f-message', 'Ich interessiere mich für eine Energieberatung.');
    };
    server.resetMail();
    await page.fill('#f-email', 'a@b');
    await page.fill('#f-phone', '12345');
    await page.click('#contact-form button[type="submit"]');
    await shot('error');
    await fill();
    await page.click('#contact-form button[type="submit"]');
    await page.waitForFunction(() => document.getElementById('contact-form').getAttribute('aria-busy') === 'true');
    await shot('busy');
    await page.waitForSelector('#form-status[data-state="success"]');
    await shot('success');
    for (let i = 0; i < 2; i++) {
      await fill();
      await page.evaluate(() => { document.getElementById('form-status').textContent = ''; });
      await page.click('#contact-form button[type="submit"]');
      await page.waitForFunction(() => document.getElementById('form-status').textContent.startsWith('Vielen'));
    }
    await fill();
    await page.click('#contact-form button[type="submit"]');
    await page.waitForFunction(() => document.getElementById('form-status').textContent.startsWith('Zu viele'));
    await shot('429');
    await ctx.close();
  }
} finally {
  await browser.close();
  await server.close();
}
