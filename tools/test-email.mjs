import { smtpConfig, sendMail } from '../server/mailer.mjs';

try { process.loadEnvFile('.env'); } catch {}

const cfg = smtpConfig();
console.log('SMTP config:', cfg.enabled ? 'SI' : 'NO', cfg.host, cfg.user, cfg.from);

try {
  await sendMail({ to: 'galarzacriss8@gmail.com', subject: 'Psicampus - Prueba SMTP', text: 'Este es un correo de prueba desde Psicampus.' });
  console.log('CORREO ENVIADO OK');
} catch (e) {
  console.log('ERROR:', e.message);
}
