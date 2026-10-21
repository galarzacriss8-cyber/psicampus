import { sendMail, smtpConfig, mailConfigured } from '../server/mailer.mjs';
try { process.loadEnvFile('.env'); } catch (e) { console.log('loadEnvFile:', e.message); }

console.log('configured:', mailConfigured());
const c = smtpConfig();
console.log('host:', c.host, '| port:', c.port, '| user:', c.user, '| from:', c.from, '| passLen:', (c.pass || '').length);

const res = await sendMail({
  to: 'galarzacriss8@gmail.com',
  subject: 'Psyconova — Prueba de correo (diagnóstico)',
  html: '<p>Prueba de correo de Psyconova. Si lees esto, el SMTP funciona.</p>',
  text: 'Prueba de correo de Psyconova.',
});
console.log('RESULTADO:', JSON.stringify(res));
