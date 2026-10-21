import puppeteer from 'puppeteer-core';

const BASE = 'http://localhost:4321';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true, args: ['--no-sandbox', '--hide-scrollbars'],
  defaultViewport: { width: 1440, height: 980 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(BASE + '/#/', { waitUntil: 'networkidle2' });
await page.waitForSelector('.hero');
await wait(800);
console.log('universidades:', await page.$$eval('.universities', (e) => e.length));
console.log('hero floats anim:', await page.$$eval('.hero-float', (e) => e.map((x) => getComputedStyle(x).animationName)));
await page.screenshot({ path: '_capturas/30-home-final.png' });

await page.goto(BASE + '/#/login', { waitUntil: 'networkidle2' });
await page.waitForSelector('input[name=identifier]');
await page.screenshot({ path: '_capturas/31-login-admin.png' });
console.log('campo:', await page.$eval('label', (e) => e.textContent.trim()));

await page.type('input[name=identifier]', 'Admin12');
await page.type('input[type=password]', 'AmieteCrisstequiero1');
await Promise.all([page.waitForFunction(() => location.hash.startsWith('#/admin')), page.click('button.btn.btn-block')]);
await page.waitForSelector('.kpi-grid');
await page.goto(BASE + '/#/admin/solicitudes', { waitUntil: 'networkidle2' });
await page.waitForSelector('.panel');
await wait(700);
await page.screenshot({ path: '_capturas/32-solicitudes.png' });
console.log('solicitudes visibles:', await page.$$eval('.panel .panel-body strong', (e) => e.slice(0, 3).map((x) => x.textContent)));

await page.goto(BASE + '/#/trabaja-con-nosotros', { waitUntil: 'networkidle2' });
await page.waitForSelector('form');
await wait(700);
await page.screenshot({ path: '_capturas/33-trabaja.png', fullPage: true });

console.log('errores:', errors.length ? [...new Set(errors)].join(' | ') : 'ninguno');
await browser.close();
