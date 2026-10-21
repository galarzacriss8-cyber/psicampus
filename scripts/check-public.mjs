import puppeteer from 'puppeteer-core';

const URL = 'https://show-weighted-none-satin.trycloudflare.com';
const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--hide-scrollbars'],
  defaultViewport: { width: 1360, height: 900 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(URL + '/#/', { waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForSelector('.hero', { timeout: 30000 });
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({ path: '_capturas/28-publico.png' });
console.log('title:', await page.title());
console.log('therapists:', await page.$$eval('.therapist-card', (els) => els.length));
console.log('sw:', await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())));
console.log('https:', await page.evaluate(() => location.protocol));

await page.goto(URL + '/#/login', { waitUntil: 'networkidle2' });
await page.type('input[name=identifier]', 'Admin12');
await page.type('input[type=password]', 'AmieteCrisstequiero1');
await Promise.all([page.waitForFunction(() => location.hash.startsWith('#/admin')), page.click('button.btn.btn-block')]);
await page.waitForSelector('.kpi-grid', { timeout: 20000 });
console.log('admin ok:', await page.evaluate(() => document.querySelector('.kpi .value')?.textContent));
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
await browser.close();
