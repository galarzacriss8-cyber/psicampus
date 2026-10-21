import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const BASE = 'http://localhost:4321';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ['--no-sandbox', '--hide-scrollbars'],
  defaultViewport: { width: 1440, height: 980 },
});
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));

async function clickText(text, selector = 'button') {
  const ok = await page.evaluate(({ text, selector }) => {
    const el = [...document.querySelectorAll(selector)].find((b) => b.textContent.trim().toLowerCase().includes(text.toLowerCase()));
    if (el) { el.click(); return true; }
    return false;
  }, { text, selector });
  if (!ok) throw new Error('No button with text: ' + text);
  await wait(700);
}

// Login
await page.goto(BASE + '/#/login', { waitUntil: 'networkidle2' });
await page.type('input[name=identifier]', 'Admin12');
await page.type('input[type=password]', 'AmieteCrisstequiero1');
await Promise.all([page.waitForFunction(() => location.hash.startsWith('#/admin')), page.click('button.btn.btn-block')]);
await page.waitForSelector('.kpi-grid');

// Session context / PWA
const pwa = await page.evaluate(async () => {
  const manifest = document.querySelector('link[rel=manifest]')?.getAttribute('href');
  const mres = manifest ? await fetch(manifest) : null;
  const mjson = mres ? await mres.json() : null;
  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
  return { manifest, status: mres?.status, type: mres?.headers.get('content-type'), name: mjson?.name, icons: mjson?.icons?.length, sw: !!reg, scope: reg?.scope };
});
console.log('PWA:', JSON.stringify(pwa));

// New patient modal
await page.goto(BASE + '/#/admin/pacientes', { waitUntil: 'networkidle2' });
await page.waitForSelector('table.data tbody tr');
await clickText('Nuevo paciente');
await page.waitForSelector('.modal');
await page.screenshot({ path: '_capturas/23-modal-paciente.png' });
const inputs = await page.$$('.modal input');
await inputs[0].type('Paciente de Prueba UI');
await inputs[1].type('ui.test@universidad.edu.ec');
await clickText('Crear paciente', '.modal button');
await wait(900);
const created = await page.evaluate(() => document.body.innerText.includes('Paciente de Prueba UI'));
console.log('Paciente creado visible:', created);
await page.screenshot({ path: '_capturas/24-pacientes-lista.png' });

// New appointment modal
await page.goto(BASE + '/#/admin/citas', { waitUntil: 'networkidle2' });
await page.waitForSelector('table.data');
await clickText('Nueva cita');
await page.waitForSelector('.modal');
await wait(900);
await page.screenshot({ path: '_capturas/25-modal-cita.png' });
const modalText = await page.evaluate(() => document.querySelector('.modal')?.innerText.slice(0, 200));
console.log('Modal cita:', modalText?.replace(/\n/g, ' | '));
await page.keyboard.press('Escape');

// Payments queue
await page.goto(BASE + '/#/admin/pagos', { waitUntil: 'networkidle2' });
await page.waitForSelector('.segmented');
await wait(700);
await page.screenshot({ path: '_capturas/26-pagos.png' });

// Mobile booking step 2
const m = await browser.newPage();
await m.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
m.on('pageerror', (e) => errors.push('MOBILE ' + e.message));
await m.goto(BASE + '/#/agendar', { waitUntil: 'networkidle2' });
await m.waitForSelector('.pick-card');
await m.click('.pick-card');
await wait(300);
await m.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Continuar'))?.click());
await wait(1200);
await m.waitForSelector('.time-grid');
await m.screenshot({ path: '_capturas/27-mobile-horarios.png' });
console.log('mobile slots:', await m.evaluate(() => document.querySelectorAll('.time-chip').length));

console.log('errores:', errors.length ? [...new Set(errors)].join(' | ') : 'ninguno');
await browser.close();
