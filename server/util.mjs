import crypto from 'node:crypto';

export const uid = (prefix = '') => prefix + crypto.randomUUID().replace(/-/g, '').slice(0, 20);

export const nowISO = () => new Date().toISOString();

export function todayISO(d = new Date()) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return todayISO(d);
}

export function addMonths(iso, n) {
  const d = new Date(iso + 'T12:00:00');
  d.setMonth(d.getMonth() + n);
  return todayISO(d);
}

export const DOW = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DOW_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function weekdayOf(iso) {
  return new Date(iso + 'T12:00:00').getDay();
}

export function prettyDate(iso, short = false) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  const m = MESES[d.getMonth()];
  return short ? `${d.getDate()} ${m.slice(0, 3)}` : `${d.getDate()} de ${m} de ${d.getFullYear()}`;
}

export function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${MESES[m - 1]} ${y}`;
}

export function minutes(t) {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
}

export function toTime(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function overlap(aStart, aEnd, bStart, bEnd) {
  return minutes(aStart) < minutes(bEnd) && minutes(bStart) < minutes(aEnd);
}

export const money = (n) => Number(n || 0);

export function parseJSON(v, fallback) {
  if (v === null || v === undefined || v === '') return fallback;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fallback; }
}

export function csv(rows, headers) {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [headers.map((h) => esc(h.label)).join(',')];
  for (const r of rows) lines.push(headers.map((h) => esc(typeof h.value === 'function' ? h.value(r) : r[h.key])).join(','));
  return '\ufeff' + lines.join('\r\n');
}

export function safeFileName(name) {
  return String(name || 'archivo').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-').slice(-60);
}

export const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function bookingCode() {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
  return 'PC-' + s;
}

export function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

export function ageFrom(birthdate) {
  if (!birthdate) return null;
  const b = new Date(birthdate + 'T12:00:00');
  const t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return a;
}
