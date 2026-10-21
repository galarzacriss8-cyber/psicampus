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
  const user = get('SELECT * FROM users WHERE lower(email) = lower(?)', String(email).trim());
  if (!user || !user.active) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  if (!verifyPassword(password, user.password_hash)) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  run('UPDATE users SET last_login = ? WHERE id = ?', nowISO(), user.id);
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
      tier_code: null, assigned_price: null, status: 'activo', risk: 'bajo', created_at: nowISO(),
    });
    patient = get('SELECT * FROM patients WHERE id = ?', pid);
  }
  notify({
    userId, audience: 'user', title: 'Tu cuenta está lista',
    body: 'Ya puedes agendar, ver tus citas y subir comprobantes desde tu portal.', kind: 'success', link: '/portal',
  });

  try {
    await sendMail({
      to: normalized,
      subject: '¡Bienvenido a Psyconova! Tu proceso comienza hoy',
      html: `<p>Hola <b>${String(name).trim()}</b>,</p><p>Te saludan con mucho cariño desde <b>Psyconova</b>.</p><p>Gracias por confiar en nosotros para acompañarte en este proceso. Tu registro fue exitoso y ya puedes acceder a tu portal para agendar, ver tus citas y subir comprobantes.</p><p>Empezar tu proceso es un paso valiente. Estamos aquí para escucharte sin juicios.</p>`,
      text: `Hola ${String(name).trim()}, te saludan desde Psyconova. Gracias por confiar en nosotros. Tu registro fue exitoso y ya puedes acceder a tu portal.`
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
  run('UPDATE users SET active = 1, password_hash = ? WHERE id = ?', hashPassword(password), user.id);
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
