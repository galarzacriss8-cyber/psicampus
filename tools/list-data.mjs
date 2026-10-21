import { all } from '../server/db.mjs';

const apps = all(`SELECT id, name, email, status, created_at, reviewed_at FROM applications ORDER BY created_at DESC`);
console.log('APLICACIONES:');
for (const a of apps) console.log(`- [${a.status}] ${a.name} <${a.email}> creada:${a.created_at} revisada:${a.reviewed_at}`);

const pats = all(`SELECT id, name, email, tier_code, assigned_price, status FROM patients ORDER BY created_at DESC`);
console.log('\nPACIENTES:');
for (const p of pats) console.log(`- ${p.name} <${p.email}> tier:${p.tier_code} precio:${p.assigned_price} ${p.status}`);

const apts = all(`SELECT id, code, date, status, price, modality FROM appointments ORDER BY date DESC LIMIT 20`);
console.log('\nCITAS:');
for (const x of apts) console.log(`- ${x.code} ${x.date} ${x.status} $${x.price} ${x.modality}`);

const notifs = all(`SELECT id, title, body, created_at FROM notifications ORDER BY created_at DESC LIMIT 20`);
console.log('\nNOTIFICACIONES:');
for (const n of notifs) console.log(`- ${n.title} :: ${n.body}`);
