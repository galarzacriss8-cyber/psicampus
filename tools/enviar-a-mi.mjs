import { sendMail } from '../server/mailer.mjs';
try { process.loadEnvFile('.env'); } catch {}

await sendMail({
  to: 'galarzacriss8@gmail.com',
  subject: 'Psyconova — Todo listo, verificación final',
  html: `<h2>Psyconova · Confirmación</h2>
<p>Hola,</p>
<p>El sitio está completo con estas funciones confirmadas:</p>
<ul>
<li>Nombre: <b>Psyconova</b></li>
<li>Precio base: <b>$7 virtual / $10 presencial</b></li>
<li>Correo de bienvenida automático al registrarse</li>
<li>Confirmación al agendar</li>
<li>Recordatorio 15 min antes</li>
<li>Modo oscuro estético</li>
<li>SMTP Gmail funcionando (<b>psicoeducativobienestar@gmail.com</b>)</li>
<li>Datos de cero (base limpia)</li>
</ul>
<p>Gracias por confiar. Descansá.</p>`,
  text: 'Psyconova — Confirmación final. Todo listo: precios $7/$10, modo oscuro, correos automáticos, SMTP funcionando.'
});
console.log('ENVIADO');
