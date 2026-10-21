import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SETTINGS, DEFAULT_TIERS } from './defaults.mjs';
import { parseJSON } from './util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');
export const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'data');
export const UPLOAD_DIR = process.env.DATA_DIR ? path.join(DATA_DIR, 'uploads') : path.join(__dirname, 'uploads');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, 'psicampus.db'));
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'paciente',
  name TEXT NOT NULL,
  phone TEXT,
  avatar TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  last_login TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS therapists (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  gender TEXT,
  birthdate TEXT,
  university TEXT,
  degree TEXT,
  approaches TEXT DEFAULT '[]',
  description TEXT,
  photo TEXT,
  price_base REAL DEFAULT 20,
  modality TEXT DEFAULT 'ambas',
  languages TEXT DEFAULT 'Español',
  license TEXT,
  room TEXT,
  years INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  gender TEXT,
  birthdate TEXT,
  university TEXT,
  career TEXT,
  semester TEXT,
  city TEXT,
  referred_by TEXT,
  notes TEXT,
  tags TEXT DEFAULT '[]',
  tier_code TEXT,
  assigned_price REAL,
  status TEXT DEFAULT 'activo',
  risk TEXT DEFAULT 'bajo',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  gender TEXT,
  birthdate TEXT,
  university TEXT,
  degree TEXT,
  license TEXT,
  years INTEGER DEFAULT 0,
  approaches TEXT DEFAULT '[]',
  modality TEXT DEFAULT 'ambas',
  description TEXT,
  photo TEXT,
  status TEXT DEFAULT 'pendiente',
  note TEXT,
  therapist_id TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS availability (
  id TEXT PRIMARY KEY,
  therapist_id TEXT NOT NULL,
  weekday INTEGER NOT NULL,
  start TEXT NOT NULL,
  end TEXT NOT NULL,
  slot_minutes INTEGER DEFAULT 50,
  modality TEXT DEFAULT 'ambas',
  room TEXT,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS exceptions (
  id TEXT PRIMARY KEY,
  therapist_id TEXT NOT NULL,
  date TEXT NOT NULL,
  all_day INTEGER DEFAULT 1,
  start TEXT,
  end TEXT,
  kind TEXT DEFAULT 'bloqueo',
  reason TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  patient_id TEXT NOT NULL,
  therapist_id TEXT NOT NULL,
  date TEXT NOT NULL,
  start TEXT NOT NULL,
  "end" TEXT NOT NULL,
  modality TEXT DEFAULT 'presencial',
  status TEXT DEFAULT 'pendiente',
  price REAL DEFAULT 0,
  payment_status TEXT DEFAULT 'pendiente',
  reason TEXT,
  notes TEXT,
  cancel_reason TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_app_dt ON appointments(therapist_id, date);
CREATE INDEX IF NOT EXISTS idx_app_patient ON appointments(patient_id, date);
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  appointment_id TEXT,
  patient_id TEXT NOT NULL,
  amount REAL NOT NULL,
  method TEXT DEFAULT 'transferencia',
  reference TEXT,
  receipt TEXT,
  status TEXT DEFAULT 'en_revision',
  note TEXT,
  verified_by TEXT,
  created_at TEXT NOT NULL,
  verified_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_pay_status ON payments(status);
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  amount REAL NOT NULL,
  method TEXT DEFAULT 'transferencia',
  receipt TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS surveys (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  answers TEXT NOT NULL,
  score REAL NOT NULL,
  tier_code TEXT,
  suggested_price REAL,
  declared_price REAL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tiers (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  min_score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  color TEXT,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  audience TEXT DEFAULT 'user',
  title TEXT NOT NULL,
  body TEXT,
  kind TEXT DEFAULT 'info',
  link TEXT,
  read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS session_notes (
  id TEXT PRIMARY KEY,
  appointment_id TEXT,
  patient_id TEXT NOT NULL,
  therapist_id TEXT NOT NULL,
  content TEXT NOT NULL,
  mood TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  detail TEXT,
  created_at TEXT NOT NULL
);
`);

// Migraciones ligeras para bases ya creadas
const applicationColumns = db.prepare('PRAGMA table_info(applications)').all().map((c) => c.name);
for (const [name, ddl] of [
  ['code', 'TEXT'],
  ['code_expires_at', 'TEXT'],
  ['activated_at', 'TEXT'],
  ['user_id', 'TEXT'],
  ['email_sent_at', 'TEXT'],
]) {
  if (!applicationColumns.includes(name)) db.exec(`ALTER TABLE applications ADD COLUMN ${name} ${ddl}`);
}

// Migración: codigo de invitación para profesionales (columna en users)
const userColumns = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
if (!userColumns.includes('invitation_code')) {
  db.exec('ALTER TABLE users ADD COLUMN invitation_code TEXT');
}
// Migración: acceso con Google (id de cuenta e email verificado)
if (!userColumns.includes('google_id')) {
  db.exec('ALTER TABLE users ADD COLUMN google_id TEXT');
}
if (!userColumns.includes('google_email')) {
  db.exec('ALTER TABLE users ADD COLUMN google_email TEXT');
}

// Nuevas tablas para gestión avanzada de pacientes, IA, automatizaciones, roles, auditoría
const newTables = [
  `CREATE TABLE IF NOT EXISTS patient_actions (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, actor_id TEXT, actor_name TEXT, action TEXT NOT NULL, category TEXT DEFAULT 'general', detail TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS patient_restrictions (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, kind TEXT NOT NULL, reason TEXT, starts_at TEXT NOT NULL, ends_at TEXT, created_by TEXT, created_at TEXT NOT NULL, lifted_by TEXT, lifted_at TEXT, lifted_reason TEXT, active INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE IF NOT EXISTS automation_rules (id TEXT PRIMARY KEY, name TEXT NOT NULL, condition TEXT NOT NULL, action TEXT NOT NULL, recipients TEXT DEFAULT '[]', frequency TEXT DEFAULT 'on_event', active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, last_run TEXT, last_result TEXT, run_count INTEGER DEFAULT 0, fail_count INTEGER DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS automation_runs (id TEXT PRIMARY KEY, rule_id TEXT NOT NULL, status TEXT DEFAULT 'ok', detail TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS ai_logs (id TEXT PRIMARY KEY, user_id TEXT, mode TEXT DEFAULT 'consult', prompt TEXT, result TEXT, tools_used TEXT DEFAULT '[]', status TEXT DEFAULT 'ok', created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, permissions TEXT DEFAULT '{}', is_system INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS user_roles (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, role_id TEXT NOT NULL, assigned_by TEXT, assigned_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS integration_status (id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT DEFAULT 'ok', last_check TEXT, detail TEXT, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS system_diagnostics (id TEXT PRIMARY KEY, category TEXT NOT NULL, severity TEXT DEFAULT 'info', message TEXT, detail TEXT, resolved INTEGER DEFAULT 0, resolved_at TEXT, created_at TEXT NOT NULL)`,
];
for (const ddl of newTables) db.exec(ddl);

export const all = (sql, ...p) => db.prepare(sql).all(...p);
export const get = (sql, ...p) => db.prepare(sql).get(...p);
export const run = (sql, ...p) => db.prepare(sql).run(...p);
export const insert = (table, obj) => {
  const keys = Object.keys(obj);
  const stmt = db.prepare(`INSERT INTO ${table} (${keys.map((k) => `"${k}"`).join(',')}) VALUES (${keys.map(() => '?').join(',')})`);
  return stmt.run(...keys.map((k) => (obj[k] === undefined ? null : obj[k])));
};
export const update = (table, id, obj) => {
  const keys = Object.keys(obj);
  if (!keys.length) return;
  db.prepare(`UPDATE ${table} SET ${keys.map((k) => `"${k}" = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => (obj[k] === undefined ? null : obj[k])), id);
};

export function getSetting(key) {
  const row = get('SELECT value FROM settings WHERE key = ?', key);
  if (!row) return DEFAULT_SETTINGS[key];
  return parseJSON(row.value, DEFAULT_SETTINGS[key]);
}
export function setSetting(key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, JSON.stringify(value));
}
export function settings() {
  const out = { ...DEFAULT_SETTINGS };
  for (const row of all('SELECT key, value FROM settings')) {
    const def = DEFAULT_SETTINGS[row.key];
    if (Array.isArray(def)) out[row.key] = parseJSON(row.value, def);
    else if (def && typeof def === 'object') out[row.key] = { ...def, ...parseJSON(row.value, def) };
    else out[row.key] = parseJSON(row.value, def);
  }
  return out;
}
export function tiers(activeOnly = false) {
  return all(`SELECT * FROM tiers ${activeOnly ? 'WHERE active = 1' : ''} ORDER BY min_score ASC`);
}

export function isSeeded() {
  const row = get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
  if (!row) return false;
  return (get('SELECT COUNT(*) AS c FROM users')?.c || 0) > 0;
}

export function resetDatabase() {
  const tables = ['session_notes', 'audit', 'notifications', 'surveys', 'payments', 'appointments', 'expenses', 'exceptions', 'availability', 'patients', 'therapists', 'users', 'settings', 'tiers'];
  for (const t of tables) {
    try { db.exec(`DELETE FROM ${t}`); } catch {}
  }
  for (const t of tables) insertDefaultTiers();
}
function insertDefaultTiers() {}
export function ensureTiers() {
  const c = get('SELECT COUNT(*) AS c FROM tiers')?.c || 0;
  if (!c) for (const t of DEFAULT_TIERS) insert('tiers', { ...t, active: 1 });
}
