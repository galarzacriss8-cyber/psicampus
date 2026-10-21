import { run, get } from '../server/db.mjs';

// Eliminar datos de prueba
run(`DELETE FROM applications WHERE name LIKE '%Prueba%' OR email LIKE '%prueba%' OR lower(description) LIKE '%prueba%'`);
run(`DELETE FROM patients WHERE name LIKE '%Prueba%' OR email LIKE '%prueba%'`);
run(`DELETE FROM surveys WHERE answers LIKE '%prueba%'`);
run(`DELETE FROM notifications WHERE title LIKE '%prueba%' OR body LIKE '%prueba%'`);

// Mantener datos reales (terapeutas, precios, config, roles)
console.log('DB limpiado de datos de prueba');
console.log('Aplicaciones rechazadas restantes:', get(`SELECT COUNT(*) c FROM applications WHERE status='rechazada'`).c);
