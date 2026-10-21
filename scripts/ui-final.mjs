import puppeteer from 'puppeteer-core';

const BASE = 'http://localhost:4321';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--hide-scrollbars'], defaultViewport: { width: 1440, height: 980 } });

const page = await browser.newPage();
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(BASE + '/#/', { waitUntil: 'networkidle2' });
await page.waitForSelector('.hero-visual');
await wait(900);
await page.screenshot({ path: '_capturas/01-home.png', fullPage: true });
console.log('hero image:', await page.evaluate(() => {
  const img = document.querySelector('.hero-arch img');
  return { w: img?.naturalWidth, src: img?.getAttribute('src'), visible: img?.getBoundingClientRect().width > 100 };
}));

await page.goto(BASE + '/#/login', { waitUntil: 'networkidle2' });
await page.type('input[name=identifier]', 'Admin12');
await page.type('input[type=password]', 'AmieteCrisstequiero1');
await Promise.all([page.waitForFunction(() => location.hash.startsWith('#/admin')), page.click('button.btn.btn-block')]);
await page.waitForSelector('.kpi-grid');
await wait(900);
await page.screenshot({ path: '_capturas/05-admin-dashboard.png' });

const m = await browser.newPage();
await m.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
m.on('pageerror', (e) => errors.push('M ' + e.message));
await m.goto(BASE + '/#/agendar', { waitUntil: 'networkidle2' });
await m.waitForSelector('.pick-card');
await m.click('.pick-card');
await wait(300);
await m.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Continuar'))?.click());
await wait(1300);
await m.waitForSelector('.time-grid');
const overflow = await m.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, card: document.querySelector('.booking-card')?.getBoundingClientRect().width }));
console.log('mobile overflow:', JSON.stringify(overflow));
await m.screenshot({ path: '_capturas/27-mobile-horarios.png' });

console.log('errores:', errors.length ? errors.join(' | ') : 'ninguno');
await browser.close();
