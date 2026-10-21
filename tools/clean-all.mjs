import { run } from '../server/db.mjs';
for (const t of ['applications', 'payments', 'expenses', 'exceptions', 'notifications', 'surveys', 'session_notes']) {
  try { run(`DELETE FROM ${t}`); console.log('limpiado:', t); } catch (e) { console.log('error', t, e.message); }
}
console.log('cero total');
