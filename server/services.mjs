import { all, get, insert, run, settings, tiers } from './db.mjs';
import { addDays, clamp, minutes, overlap, toTime, todayISO, uid, weekdayOf } from './util.mjs';

export function tierForScore(score, serviceType = 'individual', modality = 'ambas') {
  const list = tiers(true);
  const cfg = settings().pricing || {};
  let tier = list.find((t) => score >= t.min_score && score <= t.max_score) || list[list.length - 1];
  const max = serviceType === 'pareja' ? (Number(cfg.coupleMax) || 40) : (Number(cfg.individualMax) || 30);
  const isPresencial = modality === 'presencial';
  const min = Number(isPresencial ? (cfg.minPresencial || 10) : (cfg.minVirtual || 7));
  if (tier && tier.price > max) {
    tier = [...list].filter((t) => t.price <= max).sort((a, b) => b.price - a.price)[0] || tier;
  }
  if (tier && tier.price < min) tier.price = min;
  return tier || list[list.length - 1];
}

export function scoreSurvey(answers) {
  const { SURVEY_QUESTIONS } = globalThis.__PSICAMPUS_DEFAULTS__ || {};
  return { answers };
}

export function notify({ userId, audience = 'user', title, body, kind = 'info', link }) {
  insert('notifications', {
    id: uid('ntf_'), user_id: userId || null, audience, title, body: body || '', kind, link: link || null,
    read: 0, created_at: new Date().toISOString(),
  });
}

export function audit(user, action, entity, entityId, detail) {
  insert('audit', {
    id: uid('aud_'), user_id: user?.id || null, user_name: user?.name || 'Sistema',
    action, entity: entity || null, entity_id: entityId || null,
    detail: detail ? (typeof detail === 'string' ? detail : JSON.stringify(detail)) : null,
    created_at: new Date().toISOString(),
  });
}

export function therapistPublic(row) {
  if (!row) return null;
  const out = { ...row, approaches: safeArray(row.approaches), age: row.birthdate ? Math.floor((Date.now() - new Date(row.birthdate).getTime()) / 31557600000) : null };
  delete out.license;
  delete out.registration;
  delete out.senecyt;
  return out;
}

export function safeArray(v) {
  if (Array.isArray(v)) return v;
  try { const r = JSON.parse(v || '[]'); return Array.isArray(r) ? r : []; } catch { return []; }
}

export function patientDTO(row) {
  if (!row) return null;
  return { ...row, tags: safeArray(row.tags), age: row.birthdate ? Math.floor((Date.now() - new Date(row.birthdate).getTime()) / 31557600000) : null };
}

export function appointmentFull(id) {
  return get(
    `SELECT a.*, p.name AS patient_name, p.email AS patient_email, p.phone AS patient_phone, p.tier_code,
            t.name AS therapist_name, t.photo AS therapist_photo, t.gender AS therapist_gender, t.approaches
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       JOIN therapists t ON t.id = a.therapist_id
      WHERE a.id = ?`, id);
}

export function listAppointments({ from, to, therapistId, patientId, status, q, limit = 500 } = {}) {
  const clauses = [];
  const params = [];
  if (from) { clauses.push('a.date >= ?'); params.push(from); }
  if (to) { clauses.push('a.date <= ?'); params.push(to); }
  if (therapistId) { clauses.push('a.therapist_id = ?'); params.push(therapistId); }
  if (patientId) { clauses.push('a.patient_id = ?'); params.push(patientId); }
  if (status) { clauses.push('a.status = ?'); params.push(status); }
  if (q) { clauses.push('(p.name LIKE ? OR a.code LIKE ? OR t.name LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return all(
    `SELECT a.*, p.name AS patient_name, p.email AS patient_email, p.phone AS patient_phone, p.tier_code,
            t.name AS therapist_name, t.photo AS therapist_photo, t.gender AS therapist_gender
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       JOIN therapists t ON t.id = a.therapist_id
       ${where}
      ORDER BY a.date ASC, a.start ASC LIMIT ?`, ...params, limit);
}

export function slotsForDate(therapistId, date, { ignoreAppointmentId } = {}) {
  const cfg = settings().booking;
  const therapist = get('SELECT * FROM therapists WHERE id = ?', therapistId);
  if (!therapist || !therapist.active) return [];
  const wd = weekdayOf(date);
  const ranges = all('SELECT * FROM availability WHERE therapist_id = ? AND weekday = ? AND active = 1 ORDER BY start', therapistId, wd);
  if (!ranges.length) return [];
  const exceptions = all('SELECT * FROM exceptions WHERE therapist_id = ? AND date = ?', therapistId, date);
  if (exceptions.some((e) => e.all_day)) return [];
  const booked = all(
    `SELECT * FROM appointments WHERE therapist_id = ? AND date = ? AND status IN ('pendiente','confirmada','completada')`,
    therapistId, date).filter((a) => !ignoreAppointmentId || a.id !== ignoreAppointmentId);
  const now = new Date();
  const today = todayISO(now);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const out = [];
  const buffer = Number(cfg.bufferMinutes ?? 10);
  for (const r of ranges) {
    const duration = Number(r.slot_minutes) || cfg.slotMinutes || 50;
    const step = duration + buffer;
    for (let m = minutes(r.start); m + duration <= minutes(r.end); m += step) {
      const start = toTime(m), end = toTime(m + duration);
      if (exceptions.some((e) => !e.all_day && e.start && e.end && overlap(start, end, e.start, e.end))) continue;
      const busy = booked.some((a) => overlap(start, end, a.start, a.end));
      let available = !busy;
      if (date < today) available = false;
      if (date === today && m < nowMins + (Number(cfg.minNoticeHours) || 0) * 60) available = false;
      out.push({
        start, end, available,
        modality: r.modality === 'ambas' ? 'ambas' : r.modality,
        room: r.room || therapist.room || null,
        reason: busy ? 'ocupado' : available ? null : 'fuera_de_horario',
      });
    }
  }
  return out;
}

export function frequencyOf(patientId) {
  const cfg = settings().frequency;
  const windowStart = addDays(todayISO(), -Number(cfg.windowDays || 90));
  const completed = all(
    `SELECT * FROM appointments WHERE patient_id = ? AND status = 'completada' AND date >= ? ORDER BY date DESC`,
    patientId, windowStart);
  const allCompleted = all(`SELECT * FROM appointments WHERE patient_id = ? AND status = 'completada' ORDER BY date DESC`, patientId);
  const noShows = get(`SELECT COUNT(*) AS c FROM appointments WHERE patient_id = ? AND status = 'no_asistio'`, patientId)?.c || 0;
  const last = allCompleted[0]?.date || null;
  const daysSince = last ? Math.round((new Date(todayISO() + 'T12:00:00') - new Date(last + 'T12:00:00')) / 864e5) : null;
  const sessions = completed.length;
  let type = 'nuevo';
  if (sessions >= Number(cfg.frequentMin || 4)) type = 'frecuente';
  else if (sessions >= Number(cfg.occasionalMin || 2)) type = 'ocasional';
  else if (allCompleted.length > 0) type = 'ocasional';
  if (last && daysSince > Number(cfg.inactiveAfterDays || 45) && type !== 'frecuente') type = 'inactivo';
  if (last && daysSince > Number(cfg.inactiveAfterDays || 45) * 2) type = 'inactivo';
  const total = allCompleted.length + noShows;
  const risk = total >= 3 && noShows / total >= 0.25 ? 'alto' : total >= 3 && noShows / total >= 0.1 ? 'medio' : 'bajo';
  return { type, sessions, lastVisit: last, daysSince, noShows, totalSessions: allCompleted.length, risk };
}

export function refreshPatient(patientId) {
  const f = frequencyOf(patientId);
  run(`UPDATE patients SET status = ?, risk = ? WHERE id = ?`,
    f.type === 'inactivo' ? 'inactivo' : 'activo', f.risk, patientId);
  return f;
}

export function monthKey(iso) { return String(iso).slice(0, 7); }

export function monthRange(ym) {
  const [y, m] = ym.split('-').map(Number);
  const start = `${ym}-01`;
  const endDate = new Date(y, m, 0);
  const end = `${ym}-${String(endDate.getDate()).padStart(2, '0')}`;
  return { start, end };
}

export function accountingSummary(from, to) {
  const incomeRows = all(
    `SELECT pay.*, a.code, a.date AS session_date, a.therapist_id, p.name AS patient_name, t.name AS therapist_name
       FROM payments pay
       LEFT JOIN appointments a ON a.id = pay.appointment_id
       LEFT JOIN patients p ON p.id = pay.patient_id
       LEFT JOIN therapists t ON t.id = a.therapist_id
      WHERE pay.status = 'verificado' AND substr(COALESCE(a.date, pay.created_at),1,10) BETWEEN ? AND ?
      ORDER BY COALESCE(a.date, pay.created_at) DESC`, from, to);
  const expenseRows = all(`SELECT * FROM expenses WHERE date BETWEEN ? AND ? ORDER BY date DESC`, from, to);
  const income = incomeRows.reduce((s, r) => s + Number(r.amount), 0);
  const expenses = expenseRows.reduce((s, r) => s + Number(r.amount), 0);
  const byTherapist = {};
  for (const r of incomeRows) {
    const k = r.therapist_name || 'Sin asignar';
    byTherapist[k] = (byTherapist[k] || 0) + Number(r.amount);
  }
  const byCategory = {};
  for (const r of expenseRows) byCategory[r.category] = (byCategory[r.category] || 0) + Number(r.amount);
  return { income, expenses, balance: income - expenses, incomeRows, expenseRows, byTherapist, byCategory, count: incomeRows.length };
}

export function monthlySeries(months = 6) {
  const out = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const { start, end } = monthRange(ym);
    const income = get(`SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE status='verificado' AND substr(created_at,1,10) BETWEEN ? AND ?`, start, end)?.s
      || get(`SELECT COALESCE(SUM(pay.amount),0) AS s FROM payments pay JOIN appointments a ON a.id=pay.appointment_id WHERE pay.status='verificado' AND a.date BETWEEN ? AND ?`, start, end)?.s || 0;
    const expenses = get(`SELECT COALESCE(SUM(amount),0) AS s FROM expenses WHERE date BETWEEN ? AND ?`, start, end)?.s || 0;
    out.push({ month: ym, income: Number(income), expenses: Number(expenses), balance: Number(income) - Number(expenses) });
  }
  return out;
}
