import nodemailer from 'nodemailer';
import { settings } from './db.mjs';

export function smtpConfig() {
  const smtp = settings().smtp || {};
  const envUser = process.env.SMTP_USER || '';
  const envPass = process.env.SMTP_PASS || '';
  const envFrom = process.env.SMTP_FROM || '';
  const envHost = process.env.SMTP_HOST || '';
  const envPort = process.env.SMTP_PORT || '';
  const envEnabled = process.env.SMTP_ENABLED || '';
  // Las variables de entorno tienen prioridad:它们 son la fuente de verdad en produccion
  const host = envHost || smtp.host || '';
  const user = envUser || smtp.user || '';
  const pass = envPass || smtp.pass || '';
  const port = Number(envPort || smtp.port || 465);
  const from = envFrom || smtp.from || user;
  const enabled = envEnabled ? envEnabled !== 'false' : (smtp.enabled !== undefined ? !!smtp.enabled : !!(host && user && pass));
  return {
    host,
    port,
    secure: smtp.secure !== undefined ? !!smtp.secure : port === 465,
    user,
    pass,
    from,
    replyTo: smtp.replyTo || undefined,
    enabled,
  };
}

export function mailConfigured() {
  const c = smtpConfig();
  return !!(c.enabled && c.host && c.user && c.pass);
}

function transport() {
  const c = smtpConfig();
  return nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.secure,
    auth: { user: c.user, pass: c.pass },
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 15000,
  });
}

export async function sendMail({ to, subject, html, text, replyTo }) {
  if (!mailConfigured()) {
    return { sent: false, error: 'El correo saliente no está configurado todavía.' };
  }
  try {
    const c = smtpConfig();
    const info = await transport().sendMail({
      from: c.from || c.user,
      to,
      subject,
      html,
      text,
      replyTo: replyTo || c.replyTo,
    });
    return { sent: true, id: info.messageId };
  } catch (e) {
    return { sent: false, error: e.message || 'No se pudo enviar el correo' };
  }
}

export function invitationEmail({ name, code, expiresAt, link, clinic }) {
  const expires = new Date(expiresAt).toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' });
  return `<!doctype html>
<html lang="es"><body style="margin:0;background:#f6f1e6;font-family:Helvetica,Arial,sans-serif;color:#14231f">
  <div style="max-width:560px;margin:0 auto;padding:28px 18px">
    <div style="background:#0f3b33;border-radius:18px;padding:26px 24px;color:#f6f1e6">
      <div style="font-family:Georgia,serif;font-size:24px">Psyconova</div>
      <div style="font-size:11px;letter-spacing:2px;opacity:.6;margin-top:4px">BIENESTAR UNIVERSITARIO</div>
    </div>
    <div style="background:#fffdf8;border:1px solid #e3ddcf;border-radius:18px;padding:28px 24px;margin-top:12px">
      <h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 10px">Tu solicitud fue aprobada</h1>
      <p style="font-size:14px;line-height:1.6;color:#3a4642;margin:0 0 16px">Hola ${name}, ${clinic} aceptó tu perfil para formar parte del equipo de terapeutas. Usa este código para crear tu cuenta:</p>
      <div style="text-align:center;background:#e3ebdd;border-radius:14px;padding:20px;margin:18px 0">
        <div style="font-size:11px;letter-spacing:2px;color:#64746f;margin-bottom:6px">CÓDIGO DE INVITACIÓN</div>
        <div style="font-family:Georgia,serif;font-size:34px;letter-spacing:5px;color:#0f3b33">${code}</div>
        <div style="font-size:11px;color:#64746f;margin-top:8px">Vence el ${expires}</div>
      </div>
      <p style="font-size:14px;line-height:1.6;color:#3a4642">Crea tu cuenta aquí:</p>
      <p style="text-align:center;margin:18px 0">
        <a href="${link}" style="background:#0f3b33;color:#fffdf8;text-decoration:none;border-radius:40px;padding:13px 24px;font-size:14px;font-weight:bold;display:inline-block">Activar mi cuenta</a>
      </p>
      <p style="font-size:12px;line-height:1.6;color:#64746f">Si el botón no funciona, copia este enlace en tu navegador:<br>${link}</p>
      <p style="font-size:12px;line-height:1.6;color:#64746f">Si no solicitaste unirte a Psyconova, ignora este correo.</p>
    </div>
    <p style="text-align:center;font-size:11px;color:#8a948f;margin-top:14px">Psyconova · Bienestar universitario</p>
  </div>
</body></html>`;
}
