// Take the Hearth Ledger screenshots with headless Chromium.
// Serves app/ locally first (run `node serve.ts --port 8901` in the entry dir).
// Fails the run if any console/page error occurs or any non-localhost
// network request is made.
import { chromium } from 'playwright-core';

const EXE = '/home/hatch/.cache/ms-playwright/chromium-1148/chrome-linux/chrome';
const BASE = 'http://localhost:8901/index.html';
const OUT = '/home/hatch/workspace/makefun/household-budget-site-entry/screenshots';

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const errors = [];
const external = [];

async function shot(file, hash, width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(file + ' :: ' + m.text()); });
  page.on('pageerror', (e) => errors.push(file + ' :: PAGEERROR ' + e.message));
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith('http://localhost:8901') && !u.startsWith('data:')) external.push(file + ' :: ' + u);
  });
  page.on('requestfailed', (r) => errors.push(file + ' :: FAILED ' + r.url()));
  await page.goto(BASE + hash, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.screenshot({ path: OUT + '/' + file, type: 'jpeg', quality: 82 });
  await page.close();
  console.log('shot:', file, hash, width + 'x' + height);
}

// 1 — cover: desktop dashboard
await shot('1-dashboard.jpg', '#/dashboard', 1280, 800);
// 2 — desktop transactions page
await shot('2-transactions.jpg', '#/transactions', 1280, 800);
// 3 — phone dashboard
await shot('3-dashboard-phone.jpg', '#/dashboard', 390, 844);
// 4 — desktop reports page
await shot('4-reports.jpg', '#/reports', 1280, 800);

await browser.close();
console.log('console/page errors:', errors.length ? errors : 'none');
console.log('external requests:', external.length ? external : 'none');
if (errors.length || external.length) process.exit(1);
console.log('SHOTS-OK');
