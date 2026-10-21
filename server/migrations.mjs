import { DEFAULT_SETTINGS } from './defaults.mjs';
import { all, get, run, settings, setSetting } from './db.mjs';
import { hashPassword } from './auth.mjs';
import { uid } from './util.mjs';

/**
 * Migraciones ligeras que se aplican al arrancar.
 * Mantienen la base de datos alineada con la configuración vigente
 * aunque la base ya exista (por ejemplo, un disco persistente en Render).
 */
export function applyMigrations() {
  const changes = [];

  // 1) Precio mínimo y topes de tarifas
  const defPricing = DEFAULT_SETTINGS.pricing || {};
  const cur = settings().pricing || {};
  const next = { ...cur, ...defPricing };
  const mustForce = ['min', 'minVirtual', 'minPresencial', 'max', 'individualMax', 'coupleMax'];
  let changed = false;
  for (const k of mustForce) {
    if (defPricing[k] !== undefined && Number(next[k]) !== Number(defPricing[k])) changed = true;
    if (defPricing[k] !== undefined) next[k] = defPricing[k];
  }
  if (changed) {
    setSetting('pricing', next);
    changes.push(`pricing ${JSON.stringify(next)}`);
  }

  // 2) Ningún nivel por debajo del precio mínimo
  const min = Number(next.min || 7);
  const low = all(`SELECT code, price FROM tiers WHERE price < ?`, min);
  for (const t of low) {
    run(`UPDATE tiers SET price = ? WHERE code = ?`, min, t.code);
    changes.push(`tier ${t.code}: ${t.price} -> ${min}`);
  }

  // 3) El primer nivel (Solidaria) no puede ser el más barato
  const first = get(`SELECT code, price FROM tiers ORDER BY min_score ASC LIMIT 1`);
  if (first && Number(first.price) < min) {
    run(`UPDATE tiers SET price = ? WHERE code = ?`, min, first.code);
    changes.push(`tier ${first.code}: ${first.price} -> ${min}`);
  }

  // 4) Estadísticas públicas coherentes con el rango real de tarifas
  const defContent = DEFAULT_SETTINGS.content || {};
  if (Array.isArray(defContent.stats)) {
    const curContent = settings().content || {};
    if (JSON.stringify(curContent.stats) !== JSON.stringify(defContent.stats)) {
      setSetting('content', { ...curContent, stats: defContent.stats });
      changes.push('stats actualizadas');
    }
  }

  // 5) Contenido público vigente (copy general + hero) y datos de contacto
  const curSettings = settings();
  const defContent2 = DEFAULT_SETTINGS.content || {};
  const curContent2 = curSettings.content || {};
  const forcedKeys = ['heroBadge', 'heroTitle', 'heroHighlight', 'heroSubtitle', 'aboutTitle', 'aboutText'];
  const nextContent = { ...curContent2 };
  let contentChanged = false;
  for (const k of forcedKeys) {
    if (defContent2[k] !== undefined && curContent2[k] !== defContent2[k]) {
      nextContent[k] = defContent2[k];
      contentChanged = true;
    }
  }
  if (contentChanged) {
    setSetting('content', nextContent);
    changes.push('contenido público actualizado');
  }

  const defContact = DEFAULT_SETTINGS.contact || {};
  const curContact = curSettings.contact || {};
  const nextContact = { ...curContact };
  let contactChanged = false;
  for (const k of ['phone', 'whatsapp', 'email', 'address', 'hours']) {
    if (defContact[k] !== undefined && curContact[k] !== defContact[k]) {
      nextContact[k] = defContact[k];
      contactChanged = true;
    }
  }
  if (contactChanged) {
    setSetting('contact', nextContact);
    changes.push(`contacto ${JSON.stringify(nextContact)}`);
  }

  // 6) El usuario administrador se muestra como marca
  const adminRows = all(`SELECT id, name FROM users WHERE role = 'admin'`);
  for (const ad of adminRows || []) {
    if (ad.name !== 'Psyconova') {
      run(`UPDATE users SET name = 'Psyconova', phone = '983465028' WHERE id = ?`, ad.id);
      changes.push(`admin ${ad.id} -> Psyconova`);
    }
  }
  run(`UPDATE audit SET user_name = 'Psyconova' WHERE user_name = 'Andrea Salgado'`);

  // 7) Portal solo aprobado: convertir pacientes activos existentes
  const actives = all(`SELECT id FROM patients WHERE status = 'activo'`);
  for (const a of actives || []) {
    run(`UPDATE patients SET status = 'aprobado' WHERE id = ?`, a.id);
    changes.push(`paciente ${a.id} aprobado`);
  }

  // 8) Cuenta de acceso de la terapeuta Amie Ibujes (requisito del usuario)
  const EMAIL_T = 'vamieicruz@gmail.com';
  const PASS_T = process.env.AMIE_LOGIN_PASSWORD || 'Amietequiero1';
  const th = get(`SELECT id FROM therapists WHERE name = 'Amie Ibujes' LIMIT 1`);
  let thId = th ? th.id : null;
  if (!thId) {
    thId = uid('th_');
    run(`INSERT INTO therapists (id, name, photo, user_id, created_at) VALUES (?, 'Amie Ibujes', '', NULL, ?)`, thId, new Date().toISOString());
    changes.push('terapeuta Amie Ibujes creada');
  }
  const u = get(`SELECT id FROM users WHERE lower(email) = lower(?)`, EMAIL_T);
  if (!u) {
    const userId = 'usr_amie_ibujes';
    run(`INSERT INTO users (id, email, password_hash, role, name, active, created_at) VALUES (?, ?, ?, 'terapeuta', 'Amie Ibujes', 1, ?)`, userId, EMAIL_T, hashPassword(PASS_T), new Date().toISOString());
    run(`UPDATE therapists SET user_id = ?, university = 'Pontificia Universidad Católica del Ecuador', degree = 'Psicóloga Clínica', gender = 'femenino', active = 1 WHERE id = ?`, userId, thId);
    changes.push('cuenta Amie Ibujes creada');
  } else {
    run(`UPDATE users SET password_hash = ?, role = 'terapeuta', active = 1, name = 'Amie Ibujes' WHERE id = ?`, hashPassword(PASS_T), u.id);
    run(`UPDATE therapists SET user_id = ?, university = 'Pontificia Universidad Católica del Ecuador', degree = 'Psicóloga Clínica', gender = 'femenino', active = 1 WHERE id = ?`, u.id, thId);
    changes.push('cuenta Amie Ibujes actualizada');
  }

  if (changes.length) console.log('[psicampus] migraciones aplicadas:', changes.join(' | '));
  return changes;
}
