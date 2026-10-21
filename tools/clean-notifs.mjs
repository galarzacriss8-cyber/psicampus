import { run, get } from '../server/db.mjs';
run(`DELETE FROM notifications WHERE body LIKE '%Profesional Temporal%' OR body LIKE '%TRF-TEST%' OR body LIKE '%Prueba%'`);
console.log('Notificaciones limpias');
console.log('Restantes:', get(`SELECT COUNT(*) c FROM notifications`).c);
