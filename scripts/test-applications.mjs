import { DatabaseSync } from 'node:sqlite';

const BASE = 'http://localhost:4321';
const j = (r) => r.json();
const post = (p, body) => fetch(BASE + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(j);

const login = await post('/api/auth/login', { email: 'Admin12', password: 'AmieteCrisstequiero1' });
const H = { Authorization: 'Bearer ' + login.token, 'Content-Type': 'application/json' };

const app = await post('/api/public/applications', {
  name: 'Profesional Temporal', email: 'temp.prof@test.ec', phone: '+593 99 000 0000',
  gender: 'femenino', university: 'Universidad de Prueba', degree: 'Psicóloga Clínica',
  license: 'MSP-TEST', years: 6, approaches: 'TCC, ACT', modality: 'ambas',
  description: 'Solicitud de prueba automatizada para validar el flujo de aprobación.',
});
console.log('solicitud pública:', app.ok, app.message?.slice(0, 40));

const list = await fetch(BASE + '/api/admin/applications?status=pendiente', { headers: H }).then(j);
const target = list.find((a) => a.email === 'temp.prof@test.ec');
console.log('aparece en admin:', !!target);

const approved = await fetch(BASE + '/api/admin/applications/' + target.id, {
  method: 'PATCH', headers: H, body: JSON.stringify({ action: 'approve', password: 'TempProf123!', priceBase: 22, room: 'Consultorio 9' }),
}).then(j);
console.log('aprobada:', approved.ok, '| terapeuta:', approved.therapist?.name, '| credenciales:', approved.credentials?.user);

const tLogin = await post('/api/auth/login', { email: 'temp.prof@test.ec', password: 'TempProf123!' });
console.log('login del nuevo terapeuta:', tLogin.user?.role, tLogin.therapistId);

// limpieza total de la prueba
const db = new DatabaseSync('server/data/psicampus.db');
db.prepare('DELETE FROM therapists WHERE id = ?').run(approved.therapist.id);
db.prepare('DELETE FROM users WHERE lower(email) = ?').run('temp.prof@test.ec');
db.prepare('DELETE FROM applications WHERE id = ?').run(target.id);
console.log('limpieza ok');
