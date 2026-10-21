import { sendMail } from '../server/mailer.mjs';
const res = await sendMail({
  to: 'galarzacriss8@gmail.com',
  subject: '¡Bienvenido a Psyconova! Tu proceso comienza hoy',
  html: `<p>Hola <b>galarzacriss8</b>,</p><p>Te saludan con mucho cariño desde <b>Psyconova</b>.</p><p>Gracias por confiar en nosotros para acompañarte en este proceso. Tu registro fue exitoso y ya puedes acceder a tu portal para agendar, ver tus citas y subir comprobantes.</p><p>Empezar tu proceso es un paso valiente. Estamos aquí para escucharte sin juicios.</p>`,
  text: `Hola galarzacriss8, te saludan con mucho cariño desde Psyconova. Gracias por confiar en nosotros para acompañarte en este proceso. Tu registro fue exitoso.`
});
console.log('RESULTADO:', JSON.stringify(res));
