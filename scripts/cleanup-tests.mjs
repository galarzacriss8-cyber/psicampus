import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('server/data/psicampus.db');
const emails = ['prueba.smoke@universidad.edu.ec', 'ui.test@universidad.edu.ec', 'temp.prof@test.ec'];
for (const email of emails) {
  const p = db.prepare('SELECT id FROM patients WHERE lower(email) = ?').get(email);
  if (p) {
    db.prepare('DELETE FROM payments WHERE patient_id = ?').run(p.id);
    db.prepare('DELETE FROM surveys WHERE patient_id = ?').run(p.id);
    db.prepare('DELETE FROM appointments WHERE patient_id = ?').run(p.id);
    db.prepare('DELETE FROM users WHERE lower(email) = ?').run(email);
    db.prepare('DELETE FROM patients WHERE id = ?').run(p.id);
  }
  db.prepare('DELETE FROM users WHERE lower(email) = ?').run(email);
  db.prepare('DELETE FROM therapists WHERE lower(name) = ?').run('profesional temporal');
}
console.log('pacientes:', db.prepare('SELECT COUNT(*) c FROM patients').get().c);
console.log('citas:', db.prepare('SELECT COUNT(*) c FROM appointments').get().c);
console.log('solicitudes:', db.prepare('SELECT COUNT(*) c FROM applications').get().c);
console.log('terapeutas:', db.prepare('SELECT COUNT(*) c FROM therapists').get().c);
console.log('usuarios admin:', db.prepare("SELECT email FROM users WHERE role='admin'").all().map((u) => u.email).join(','));
