// Usage: node tools/lighthouse.mjs [--runs N] [--batch K]
// Dev-only acceptance: Lighthouse 13.5.0 (pinned, via npx, never a project dependency), mobile, median of N (default 5)
// runs against serve.mjs --prod (headers from .htaccess). Output: tools/out/lighthouse/ (gitignored).
// Exit: 0 = all four medians 100 (PASS); 3 = A11y/BP/SEO 100 and Performance 99 (WARN); 1 = FAIL.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { startServer } from './serve.mjs';

const root = path.resolve(import.meta.dirname, '..');
const outRoot = path.join(root, 'tools', 'out', 'lighthouse');
const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? Number(process.argv[i + 1]) : def;
};
const runs = arg('--runs', 5);

fs.mkdirSync(outRoot, { recursive: true });
let batch = arg('--batch', 0);
if (!batch) {
  batch = 1;
  while (fs.existsSync(path.join(outRoot, `batch-${batch}`))) batch += 1;
}
const dir = path.join(outRoot, `batch-${batch}`);
fs.mkdirSync(dir, { recursive: true });

const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if (!process.env.CHROME_PATH && fs.existsSync(chromePath)) process.env.CHROME_PATH = chromePath;

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function runOnce(url, file) {
  return new Promise((resolve, reject) => {
    const args = ['--yes', 'lighthouse@13.5.0', url, '--form-factor=mobile',
      '--only-categories=performance,accessibility,best-practices,seo', '--quiet',
      '--chrome-flags="--headless=new"', '--output=json', `--output-path="${file}"`];
    const p = spawn('npx', args, { shell: true, stdio: ['ignore', 'inherit', 'inherit'], cwd: root });
    p.on('error', reject);
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`lighthouse exit ${code}`))));
  });
}

const server = await startServer(root, { prod: true });
const url = `http://127.0.0.1:${server.port}/`;
const results = [];
let version = '';
let chrome = '';
try {
  for (let i = 1; i <= runs; i += 1) {
    const file = path.join(dir, `run-${i}.json`);
    await runOnce(url, file);
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    version = j.lighthouseVersion;
    chrome = j.environment?.hostUserAgent ?? '';
    const a = j.audits;
    const r = {
      run: i,
      performance: Math.round(j.categories.performance.score * 100),
      accessibility: Math.round(j.categories.accessibility.score * 100),
      bestPractices: Math.round(j.categories['best-practices'].score * 100),
      seo: Math.round(j.categories.seo.score * 100),
      fcpMs: Math.round(a['first-contentful-paint'].numericValue),
      lcpMs: Math.round(a['largest-contentful-paint'].numericValue),
      tbtMs: Math.round(a['total-blocking-time'].numericValue),
      cls: Number(a['cumulative-layout-shift'].numericValue.toFixed(3)),
      speedIndexMs: Math.round(a['speed-index'].numericValue),
      bytes: Math.round(a['total-byte-weight'].numericValue),
      requests: a['network-requests'].details.items.length,
    };
    r.noise = r.tbtMs > 500;
    results.push(r);
    console.log(`run ${i}: P=${r.performance} A=${r.accessibility} BP=${r.bestPractices} SEO=${r.seo} FCP=${r.fcpMs} LCP=${r.lcpMs} TBT=${r.tbtMs} CLS=${r.cls} SI=${r.speedIndexMs} bytes=${r.bytes} req=${r.requests}${r.noise ? ' (noise: TBT > 500 ms)' : ''}`);
  }
} finally {
  await server.close();
}

const med = {};
for (const k of ['performance', 'accessibility', 'bestPractices', 'seo', 'fcpMs', 'lcpMs', 'tbtMs', 'cls', 'speedIndexMs', 'bytes', 'requests']) {
  med[k] = median(results.map((r) => r[k]));
}
const others = med.accessibility === 100 && med.bestPractices === 100 && med.seo === 100;
let verdict = 'FAIL';
if (others && med.performance === 100) verdict = 'PASS';
else if (others && med.performance >= 99) verdict = 'WARN';

const summary = { date: new Date().toISOString(), batch, lighthouseVersion: version, chrome, runs: results, median: med, verdict };
fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(summary, null, 2));
fs.copyFileSync(path.join(dir, 'summary.json'), path.join(outRoot, 'summary.json'));
const bf = path.join(outRoot, 'batches.json');
const all = fs.existsSync(bf) ? JSON.parse(fs.readFileSync(bf, 'utf8')) : [];
all.push({ batch, date: summary.date, median: med, verdict });
fs.writeFileSync(bf, JSON.stringify(all, null, 2));

console.log(`median (batch ${batch}, Lighthouse ${version}): ${JSON.stringify(med)}`);
console.log(`${verdict} lighthouse performance median=${med.performance}`);
process.exit(verdict === 'PASS' ? 0 : verdict === 'WARN' ? 3 : 1);
