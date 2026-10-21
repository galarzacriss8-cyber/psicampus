import { get, insert, run } from './db.mjs';
import { nowISO, uid } from './util.mjs';

const TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

export function googleClientId() {
  const fromEnv = process.env.GOOGLE_CLIENT_ID || '';
  if (fromEnv) return fromEnv;
  try {
    const row = get("SELECT value FROM settings WHERE key = 'google'");
    if (row) {
      const cfg = JSON.parse(row.value || '{}');
      return cfg.clientId || '';
    }
  } catch { /* sin configuración */ }
  return '';
}

export function googleEnabled() {
  return !!googleClientId();
}

/**
 * Verifica un id_token de Google contra el endpoint oficial tokeninfo.
 * Lanza error si el token es inválido, expirado o no fue emitido para nuestra app.
 */
export async function verifyGoogleToken(idToken) {
  if (!idToken) throw new Error('Falta el credencial de Google');
  const res = await fetch(`${TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(/expired/i.test(body) ? 'La sesión de Google expiró, intentá de nuevo' : 'Credencial de Google inválida');
  }
  const info = await res.json();

  if (!info.email || info.email_verified === 'false') {
    throw new Error('El correo de Google no está verificado');
  }
  const clientId = googleClientId();
  if (clientId && info.aud && info.aud !== clientId) {
    throw new Error('Esta credencial de Google no pertenece a esta plataforma');
  }
  if (info.exp && Number(info.exp) * 1000 < Date.now()) {
    throw new Error('La credencial de Google expiró');
  }
  return {
    googleId: info.sub,
    email: String(info.email).toLowerCase(),
    name: info.name || info.email.split('@')[0],
    picture: info.picture || null,
    givenName: info.given_name || null,
  };
}

function adminEmails() {
  const raw = process.env.GOOGLE_ADMIN_EMAILS || '';
  return raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

/**
 * Resuelve el rol según el estado real en la base:
 *  - correo en GOOGLE_ADMIN_EMAILS o ya admin  -> admin
 *  - solicitud aprobada (applications)       -> terapeuta
 *  - terapeuta ya vinculado                   -> terapeuta
 *  - resto                                   -> paciente
 */
function resolveRole(email, existingUser) {
  if (existingUser?.role) return existingUser.role;
  if (adminEmails().includes(email)) return 'admin';
  const app = get("SELECT * FROM applications WHERE lower(email) = ? AND status = 'aprobada' ORDER BY created_at DESC LIMIT 1", email);
  if (app) return 'terapeuta';
  const therapist = get('SELECT * FROM therapists WHERE lower(email) = ? LIMIT 1', email);
  if (therapist) return 'terapeuta';
  return 'paciente';
}

export function provisionGoogleUser(profile) {
  const email = profile.email;
  let user = get('SELECT * FROM users WHERE lower(email) = ?', email);

  if (!user) {
    const userId = uid('usr_');
    insert('users', {
      id: userId,
      email,
      password_hash: null,
      role: 'paciente',
      name: profile.name,
      phone: null,
      active: 1,
      google_id: profile.googleId,
      google_email: email,
      avatar: profile.picture,
      created_at: nowISO(),
    });
    user = get('SELECT * FROM users WHERE id = ?', userId);
  } else {
    run('UPDATE users SET google_id = ?, google_email = ?, last_login = ? WHERE id = ?',
      profile.googleId, email, nowISO(), user.id);
    if (!user.name) run('UPDATE users SET name = ? WHERE id = ?', profile.name, user.id);
    if (!user.avatar && profile.picture) run('UPDATE users SET avatar = ? WHERE id = ?', profile.picture, user.id);
  }

  const role = resolveRole(email, user);
  if (role !== user.role) run('UPDATE users SET role = ? WHERE id = ?', role, user.id);
  user = get('SELECT * FROM users WHERE id = ?', user.id);

  // Paciente: vincular o crear ficha
  if (role === 'paciente') {
    const patient = get('SELECT * FROM patients WHERE user_id = ? OR lower(email) = ? LIMIT 1', user.id, email);
    if (patient) {
      run('UPDATE patients SET user_id = ?, status = ? WHERE id = ?', user.id, patient.status === 'inactivo' ? 'inactivo' : 'activo', patient.id);
    } else {
      insert('patients', {
        id: uid('pat_'), user_id: user.id, name: profile.name, email, phone: null,
        gender: null, birthdate: null, university: null, career: null,
        semester: null, city: null, referred_by: 'Registro con Google', notes: null, tags: '[]',
        tier_code: null, assigned_price: null, status: 'activo', risk: 'bajo', created_at: nowISO(),
      });
    }
  }

  // Terapeuta: vincular perfil profesional
  if (role === 'terapeuta') {
    const therapist = get('SELECT * FROM therapists WHERE user_id = ? OR lower(email) = ? LIMIT 1', user.id, email);
    if (therapist) {
      run('UPDATE therapists SET user_id = ?, active = 1 WHERE id = ?', user.id, therapist.id);
    } else {
      const app = get("SELECT * FROM applications WHERE lower(email) = ? AND status = 'aprobada' ORDER BY created_at DESC LIMIT 1", email);
      if (app) {
        const tid = uid('ter_');
        insert('therapists', {
          id: tid, user_id: user.id, name: app.name, email, phone: app.phone || null,
          degree: app.degree || null, university: app.university || null, gender: app.gender || null,
          approaches: JSON.stringify(app.approaches || []), modality: app.modality || 'presencial',
          bio: app.description || null, price: app.price || null, active: 1, featured: 0,
          created_at: nowISO(),
        });
        run('UPDATE applications SET user_id = ? WHERE id = ?', user.id, app.id);
      }
    }
  }

  return get('SELECT id, email, role, name, phone, avatar, active FROM users WHERE id = ?', user.id);
}
