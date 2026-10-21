import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:4321';
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.resolve('_capturas');
fs.mkdirSync(OUT, { recursive: true });

const errors = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars', '--force-device-scale-factor=1'],
  defaultViewport: { width: 1440, height: 980, deviceScaleFactor: 1 },
});

async function newPage(context, viewport) {
  const page = await context.newPage();
  if (viewport) await page.setViewport(viewport);
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  page.on('requestfailed', (r) => { if (!r.url().includes('favicon')) errors.push(`[request] ${r.url()} ${r.failure()?.errorText}`); });
  return page;
}

async function shot(page, name, fullPage = false) {
  await wait(1100);
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage });
  console.log('shot', name);
}

const ctx = await browser.createBrowserContext();
const page = await newPage(ctx);

await page.goto(BASE + '/#/', { waitUntil: 'networkidle2' });
await page.waitForSelector('.hero');
await shot(page, '01-home', true);

await page.goto(BASE + '/#/terapeutas', { waitUntil: 'networkidle2' });
await page.waitForSelector('.therapist-card');
await shot(page, '02-terapeutas');

await page.goto(BASE + '/#/encuesta', { waitUntil: 'networkidle2' });
await page.waitForSelector('.survey-card');
await shot(page, '03-encuesta');

await page.goto(BASE + '/#/agendar', { waitUntil: 'networkidle2' });
await page.waitForSelector('.booking-card');
await shot(page, '04-agendar');

// Login admin
await page.goto(BASE + '/#/login', { waitUntil: 'networkidle2' });
await page.waitForSelector('input[name=identifier]');
await page.type('input[name=identifier]', 'Admin12');
await page.type('input[type=password]', 'AmieteCrisstequiero1');
await Promise.all([
  page.waitForFunction(() => location.hash.startsWith('#/admin'), { timeout: 15000 }),
  page.click('button.btn.btn-block'),
]);
await page.waitForSelector('.kpi-grid');
await shot(page, '05-admin-dashboard');
await shot(page, '05b-admin-dashboard-full', true);

const routes = [
  ['/admin/agenda', '.week-grid', '06-agenda'],
  ['/admin/citas', 'table.data', '07-citas'],
  ['/admin/pacientes', 'table.data', '08-pacientes'],
  ['/admin/terapeutas', '.grid-3', '09-terapeutas-admin'],
  ['/admin/horarios', '.day-col', '10-horarios'],
  ['/admin/pagos', '.segmented', '11-pagos'],
  ['/admin/contabilidad', '.chart', '12-contabilidad'],
  ['/admin/tarifas', '.table-wrap', '13-tarifas'],
  ['/admin/contenido', '.tabs-line', '14-contenido'],
  ['/admin/configuracion', '.tabs-line', '15-configuracion'],
];

for (const [route, sel, name] of routes) {
  await page.goto(BASE + '/#' + route, { waitUntil: 'networkidle2' });
  await page.waitForSelector(sel, { timeout: 15000 });
  await shot(page, name);
}

// Admin: open patient detail drawer
await page.goto(BASE + '/#/admin/pacientes', { waitUntil: 'networkidle2' });
await page.waitForSelector('table.data tbody tr');
await page.click('table.data tbody tr');
await page.waitForSelector('.drawer');
await shot(page, '16-paciente-detalle');

// Patient portal
const ctx2 = await browser.createBrowserContext();
const p2 = await newPage(ctx2);
await p2.goto(BASE + '/#/login', { waitUntil: 'networkidle2' });
await p2.waitForSelector('input[name=identifier]');
await p2.type('input[name=identifier]', 'sofia.morales@universidad.edu.ec');
await p2.type('input[type=password]', 'Demo1234!');
await Promise.all([
  p2.waitForFunction(() => location.hash.startsWith('#/portal'), { timeout: 15000 }),
  p2.click('button.btn.btn-block'),
]);
await p2.waitForSelector('.portal-grid');
await shot(p2, '17-portal');
await p2.goto(BASE + '/#/portal/citas', { waitUntil: 'networkidle2' });
await wait(900);
await shot(p2, '18-portal-citas');

// Therapist panel
const ctx3 = await browser.createBrowserContext();
const p3 = await newPage(ctx3);
await p3.goto(BASE + '/#/login', { waitUntil: 'networkidle2' });
await p3.waitForSelector('input[name=identifier]');
await p3.type('input[name=identifier]', 'camila@psicampus.ec');
await p3.type('input[type=password]', 'Demo1234!');
await Promise.all([
  p3.waitForFunction(() => location.hash.startsWith('#/terapeuta'), { timeout: 15000 }),
  p3.click('button.btn.btn-block'),
]);
await p3.waitForSelector('.kpi-grid');
await shot(p3, '19-terapeuta');

// Mobile
const ctx4 = await browser.createBrowserContext();
const m = await newPage(ctx4, { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await m.goto(BASE + '/#/', { waitUntil: 'networkidle2' });
await m.waitForSelector('.hero');
await shot(m, '20-mobile-home', false);
await m.goto(BASE + '/#/agendar', { waitUntil: 'networkidle2' });
await m.waitForSelector('.booking-card');
await shot(m, '21-mobile-agendar');
await m.goto(BASE + '/#/terapeutas', { waitUntil: 'networkidle2' });
await m.waitForSelector('.therapist-card');
await shot(m, '22-mobile-terapeutas');

console.log('\n--- errores ---');
console.log(errors.length ? [...new Set(errors)].join('\n') : 'ninguno');
await browser.close();
