import nodemailer from 'nodemailer';
import fs from 'node:fs';

const env = {};
try { process.loadEnvFile('.env'); } catch {}
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const user = env.SMTP_USER;
const pass = env.SMTP_PASS;
console.log('usuario:', user);
console.log('clave:', pass ? pass.replace(/./g, '*') : '(vacio)');

const t = nodemailer.createTransport({
  host: env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(env.SMTP_PORT || 465),
  secure: env.SMTP_SECURE !== 'false',
  auth: { user, pass },
});

t.verify((err, ok) => {
  if (err) {
    console.log('FALLO:', err.message);
    if (err.responseCode) console.log('codigo:', err.responseCode);
  } else {
    console.log('SMTP OK ->', ok);
  }
  process.exit(0);
});
