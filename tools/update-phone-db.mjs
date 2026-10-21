import { db } from '../server/db.mjs';
const row = db.prepare('SELECT * FROM settings WHERE id = ?').get('contact');
if (row && row.value) {
  const v = JSON.parse(row.value);
  v.phone = '983465028';
  v.whatsapp = '593983465028';
  db.prepare('UPDATE settings SET value = ? WHERE id = ?').run(JSON.stringify(v), 'contact');
  console.log('contact actualizado');
} else {
  console.log('no hay row contact');
}
