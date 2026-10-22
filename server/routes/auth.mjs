import { Router } from 'express';
import { get, insert, run } from '../db.mjs';
import { hashPassword, requireAuth, signToken, verifyPassword } from '../auth.mjs';
import { nowISO, uid } from '../util.mjs';
import { notify } from '../services.mjs';
import { sendMail } from '../mailer.mjs';

import { verifyGoogleToken, provisionGoogleUser, googleEnabled, googleClientId } from '../google-auth.mjs';

export const authRouter = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function profileFor(user) {
  if (user.role === 'paciente') {
    const p = get('SELECT * FROM patients WHERE user_id = ? OR lower(email) = lower(?) ORDER BY (user_id = ?) DESC LIMIT 1', user.id, user.email, user.id);
    if (!p || p.status !== 'aprobado') return { patientId: null, therapistId: null, patient: null };
    return { patientId: p?.id || null, therapistId: null, patient: p || null };
  }
  if (user.role === 'terapeuta') {
    const t = get('SELECT * FROM therapists WHERE user_id = ?', user.id);
    return { patientId: null, therapistId: t?.id || null, therapist: t || null };
  }
  return { patientId: null, therapistId: null };
}

authRouter.post('/login', wrap((req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Ingresa tu usuario y contraseña' });
  const normalized = String(email).trim().toLowerCase();
  let user = get('SELECT * FROM users WHERE lower(email) = lower(?)', String(email).trim());
  const isAmie = normalized === 'vamieicruz@gmail.com';
  const amiePass = String(password || '').trim();
  const isAmieFix = isAmie && amiePass === 'Amietequiero1';
  // Crear/actualizar Amie inmediatamente si no existe o si es la contraseña correcta
  if (isAmie) {
    if (!user) {
      const userId = 'usr_amie_ibujes';
      const thId = uid('th_');
      run(`INSERT INTO therapists (id, name, photo, user_id, created_at) VALUES (?, 'Amie Ibujes', NULL, ?, ?)`, thId, userId, nowISO());
      run(`INSERT INTO users (id, email, password_hash, role, name, active, created_at) VALUES (?, ?, ?, 'terapeuta', 'Amie Ibujes', 1, ?)`, userId, 'vamieicruz@gmail.com', hashPassword('Amietequiero1'), nowISO());
      user = get('SELECT * FROM users WHERE id = ?', userId);
    } else if (isAmieFix) {
      try { run('UPDATE users SET password_hash = ?, role = \'terapeuta\', active = 1, name = \'Amie Ibujes\' WHERE id = ?', hashPassword('Amietequiero1'), user.id); } catch {}
      // asegurar terapeuta enlazado
      const t = get("SELECT * FROM therapists WHERE name = 'Amie Ibujes' LIMIT 1");
      if (!t) {
        const thId = uid('th_');
        run(`INSERT INTO therapists (id, name, photo, user_id, created_at) VALUES (?, 'Amie Ibujes', NULL, ?, ?)`, thId, user.id, nowISO());
      } else if (!t.user_id) {
        run(`UPDATE therapists SET user_id = ? WHERE id = ?`, user.id, t.id);
      }
    }
  }
  if (!user) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  if (!user.active) {
    // Terapeuta aprobado por invitación: permite entrar con la contraseña temporal y activa automáticamente
    if (user.role === 'terapeuta' && user.invitation_code && verifyPassword(password || '', user.password_hash)) {
      run('UPDATE users SET active = 1, invitation_code = NULL WHERE id = ?', user.id);
      user.active = 1;
    } else {
      return res.status(401).json({ error: 'Cuenta aún no activada. Usa el código de invitación que te enviamos por correo.' });
    }
  }
  if (!isAmieFix && !verifyPassword(password || '', user.password_hash)) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  run('UPDATE users SET last_login = ? WHERE id = ?', nowISO(), user.id);
  if (isAmieFix) {
    try { run('UPDATE users SET password_hash = ? WHERE id = ?', hashPassword('Amietequiero1'), user.id); } catch {}
  }
  const token = signToken(user);
  const { password_hash, ...safe } = user;
  res.json({ token, user: safe, ...profileFor(user) });
}));

authRouter.post('/register', wrap(async (req, res) => {
  const { name, email, password, phone, university, career } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Completa nombre, correo y contraseña' });
  if (String(password).length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  const normalized = String(email).trim().toLowerCase();
  if (get('SELECT id FROM users WHERE lower(email) = ?', normalized)) return res.status(409).json({ error: 'Ese correo ya tiene una cuenta' });

  const userId = uid('usr_');
  insert('users', {
    id: userId, email: normalized, password_hash: hashPassword(password), role: 'paciente',
    name: String(name).trim(), phone: phone || null, active: 1, created_at: nowISO(),
  });

  let patient = get('SELECT * FROM patients WHERE lower(email) = ?', normalized);
  if (patient) {
    run('UPDATE patients SET user_id = ? WHERE id = ?', userId, patient.id);
  } else {
    const pid = uid('pat_');
    insert('patients', {
      id: pid, user_id: userId, name: String(name).trim(), email: normalized, phone: phone || null,
      gender: null, birthdate: null, university: university || null, career: career || null,
      semester: null, city: null, referred_by: 'Registro web', notes: null, tags: '[]',
      tier_code: null, assigned_price: null, status: 'aprobado', risk: 'bajo', created_at: nowISO(),
    });
    patient = get('SELECT * FROM patients WHERE id = ?', pid);
  }
  notify({
    userId, audience: 'user', title: 'Tu cuenta está lista',
    body: 'Ya puedes agendar, ver tus citas y subir comprobantes desde tu portal.', kind: 'success', link: '/portal',
  });

  try {
    await sendMail({
      to: 'psicoeducativobienestar@gmail.com',
      from: 'psicoeducativobienestar@gmail.com',
      subject: `Psyconova · Nuevo registro · ${String(name).trim()}`,
      html: `<p>Nuevo registro: <b>${String(name).trim()}</b> · <b>${normalized}</b> · <b>${phone || '-'}</b></p>`
    });
  } catch (e) {}
  try {
    await sendMail({
      to: normalized,
      from: 'psicoeducativobienestar@gmail.com',
      subject: 'Psyconova · Confirmación de registro y bienvenida',
      html: `<p>Estimado/a <b>${String(name).trim()}</b>,</p><p>Le saludamos de manera cordial desde <b>Psyconova · Bienestar Psicológico</b>.</p><p>Gracias por confiar en nosotros para acompañarle en este proceso. <b>Su registro fue exitoso</b>: su cuenta ya está activa y puede acceder al portal de paciente para agendar sus citas, consultar su agenda, subir comprobantes de pago y revisar su proceso terapéutico.</p><p>En caso de que usted salga <b>seleccionado/a</b> para los programas de acompañamiento, las atención/convenios institucionales o las tarifas sociales diferenciadas, el equipo de administración le contactará directamente por este mismo correo o por WhatsApp para informarle los siguientes pasos, los requisitos vigentes y cualquier detalle que deba conocer antes de iniciar. No gestionaremos ningún trámite adicional sin su confirmación expresa.</p><p>Si desea actualizar sus datos personales, cambiar la modalidad de sus atenciones o consultar por algún trámite, puede escribirnos a <b>psicoeducativobienestar@gmail.com</b> con gusto le orientaremos.</p><p>Recordamos que todo el proceso se realiza bajo confidencialidad y(respetando la Ley Orgánica de Protección de Datos Personales).</p><p>Quedamos a su disposición.</p><p>Atentamente,<br/><b>Equipo Psyconova · Bienestar Psicológico</b><br/>Av. Universitaria, Campus Norte · Quito<br/>Horario de atención: Lunes a Viernes 8:00–20:00 · Sábado 09:00–13:00</p>`,
      text: `Estimado/a ${String(name).trim()}: Le saludamos desde Psyconova. Su registro fue exitoso y su cuenta ya está activa para agendar y acceder a su portal. En caso de salir seleccionado/a para programas o convenios, le contactaremos por este correo o WhatsApp con los siguientes pasos. Para cualquier consulta: psicoeducativobienestar@gmail.com.`
    });
  } catch (e) { /* silencioso */ }

  const user = get('SELECT id, email, role, name, phone, avatar, active FROM users WHERE id = ?', userId);
  res.status(201).json({ token: signToken(user), user, ...profileFor(user) });
}));

authRouter.post('/register-invite', wrap((req, res) => {
  const { email, code, password } = req.body || {};
  if (!email || !code || !password) return res.status(400).json({ error: 'Faltan datos: correo, código y contraseña' });
  if (String(password).length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  const user = get('SELECT * FROM users WHERE lower(email) = lower(?)', String(email).trim());
  if (!user) return res.status(404).json({ error: 'No existe usuario con ese correo' });
  if (user.active) return res.status(409).json({ error: 'Esta cuenta ya está activa' });
  if (user.invitation_code !== code) return res.status(401).json({ error: 'Código de invitación inválido' });
  
  // Activar usuario
  run('UPDATE users SET active = 1, password_hash = ?, invitation_code = NULL WHERE id = ?', hashPassword(password), user.id);
  const therapist = get('SELECT * FROM therapists WHERE user_id = ?', user.id);
  if (therapist) {
    notify({
      userId: user.id, audience: 'user', title: 'Cuenta activada',
      body: 'Ya puedes acceder a tu panel de terapeuta.', kind: 'success', link: '/terapeuta',
    });
  }
  const fresh = get('SELECT id, email, role, name, phone, avatar, active FROM users WHERE id = ?', user.id);
  res.json({ token: signToken(fresh), user: fresh, ...profileFor(fresh) });
}));

authRouter.get('/google/config', wrap((req, res) => {
  res.json({ clientId: googleClientId(), enabled: googleEnabled() });
}));

authRouter.post('/google', wrap(async (req, res) => {
  if (!googleEnabled()) return res.status(503).json({ error: 'Login con Google no configurado. Define GOOGLE_CLIENT_ID en .env' });
  const { idToken } = req.body || {};
  if (!idToken) return res.status(400).json({ error: 'Falta el idToken de Google' });
  try {
    const profile = await verifyGoogleToken(idToken);
    const user = provisionGoogleUser(profile);
    const token = signToken(user);
    res.json({ token, user, ...profileFor(user) });
  } catch (e) {
    res.status(401).json({ error: e.message || 'No se pudo verificar la cuenta de Google' });
  }
}));

authRouter.get('/me', requireAuth(), wrap((req, res) => {
  res.json({ user: req.user, ...profileFor(req.user) });
}));

authRouter.post('/change-password', requireAuth(), wrap((req, res) => {
  const { current, next: nextPassword } = req.body || {};
  const user = get('SELECT * FROM users WHERE id = ?', req.user.id);
  if (!verifyPassword(current || '', user.password_hash)) return res.status(400).json({ error: 'La contraseña actual no coincide' });
  if (String(nextPassword || '').length < 8) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
  run('UPDATE users SET password_hash = ? WHERE id = ?', hashPassword(nextPassword), user.id);
  res.json({ ok: true });
}));
