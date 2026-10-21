import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('server/data/psicampus.db');
const q = (s) => db.prepare(s).get();
console.log('pacientes', q('select count(*) c from patients').c, '| citas', q('select count(*) c from appointments').c, '| pagos', q('select count(*) c from payments').c, '| egresos', q('select count(*) c from expenses').c);
console.log('test patients', q("select count(*) c from patients where email like '%prueba%' or email like 'ui.test%'").c);
console.log('inactivos', q("select count(*) c from patients where status='inactivo'").c);
