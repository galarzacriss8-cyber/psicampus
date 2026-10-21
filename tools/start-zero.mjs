import { run } from '../server/db.mjs';

// Limpiar datos clínicos para empezar de cero
const tables = [
  'appointments', 'patients', 'payments', 'expenses', 'exceptions', 'session_notes',
  'surveys', 'notifications', 'audit'
];
for (const t of tables) {
  try { run(`DELETE FROM ${t}`); console.log(`limpiado: ${t}`); } catch (e) { console.log(`error ${t}:`, e.message); }
}
console.log('base limpia');
