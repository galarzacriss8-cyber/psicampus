import { db } from '../server/db.mjs';
db.prepare("UPDATE users SET name = ?, phone = ? WHERE id = ?").run('Psyconova', '983465028', 'usr_admin');
db.prepare("UPDATE audit SET user_name = ? WHERE user_name = ?").run('Psyconova', 'Andrea Salgado');
console.log('admin actualizado');
