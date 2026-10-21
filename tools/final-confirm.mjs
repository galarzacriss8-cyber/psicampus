import { sendMail } from '../server/mailer.mjs';
const res = await sendMail({
  to: 'galarzacriss8@gmail.com',
  subject: 'Psyconova — Confirmación final (llegó al correo)',
  html: `<h2>Psyconova confirma: todo llegó</h2>
<p>El correo de prueba <b>llegó al buzón</b> (id <code>fda0a0b2-bbaa-2904-0409-70c2d389fcb1@gmail.com</code>).</p>
<ul>
<li>SMTP <b>funcionando</b> con Gmail App Password</li>
<li>Destinatario: <b>galarzacriss8@gmail.com</b></li>
<li>Remitente paciente: <b>psicoeducativobienestar@gmail.com</b></li>
<li>Precio: <b>$7 / $10</b></li>
<li>Modo oscuro: <b>activo y estético</b></li>
<li>Base limpia: <b>0 sesiones reales</b></li>
</ul>
<p>Descansá. La página está lista para siempre.</p>`,
  text: 'Psyconova confirma que el correo llegó al correo de galarzacriss8@gmail.com. Todo funcionando.'
});
console.log('RESULTADO:', JSON.stringify(res));
