import { db } from './db.mjs';
const row = db.prepare('SELECT * FROM settings WHERE id = ?').get('smtp');
console.log('DB smtp:', JSON.stringify(row));
if (row && row.value) {
  const v = JSON.parse(row.value);
  v.enabled = true;
  const r = db.prepare('UPDATE settings SET value = ? WHERE id = ?').run(JSON.stringify(v), 'smtp');
  console.log('DB actualizado, cambios:', r.changes);
}
