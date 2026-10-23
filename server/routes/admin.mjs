import { Router } from 'express';
import { all, get, insert, run, settings, setSetting, tiers, update } from '../db.mjs';
import { requireAuth, hashPassword } from '../auth.mjs';
import { DEFAULT_SETTINGS } from '../defaults.mjs';
import {
  accountingSummary, appointmentFull, audit, frequencyOf, listAppointments, monthKey, monthRange,
  monthlySeries, notify, patientDTO, refreshPatient, safeArray, slotsForDate, therapistPublic,
} from '../services.mjs';
import { addDays, csv, minutes, monthLabel, nowISO, todayISO, uid, weekdayOf } from '../util.mjs';
import { saveDataUrl, publicSettings } from './public.mjs';
import { sendMail, invitationEmail } from '../mailer.mjs';

export const adminRouter = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
adminRouter.use(requireAuth('admin'));

/* ---------------------------------- overview --------------------------------- */
adminRouter.get('/overview', wrap((req, res) => {
  const today = todayISO();
  const { start: monthStart, end: monthEnd } = monthRange(monthKey(today));
  const incomeMonth = get(
    `SELECT COALESCE(SUM(pay.amount),0) AS s FROM payments pay LEFT JOIN appointments a ON a.id = pay.appointment_id
      WHERE pay.status = 'verificado' AND COALESCE(substr(a.date,1,10), substr(pay.created_at,1,10)) BETWEEN ? AND ?`,
    monthStart, monthEnd)?.s || 0;
  const expensesMonth = get(`SELECT COALESCE(SUM(amount),0) AS s FROM expenses WHERE date BETWEEN ? AND ?`, monthStart, monthEnd)?.s || 0;
  const pendingPayments = all(
    `SELECT pay.*, p.name AS patient_name, a.code, a.date AS session_date, a.start
       FROM payments pay JOIN patients p ON p.id = pay.patient_id LEFT JOIN appointments a ON a.id = pay.appointment_id
      WHERE pay.status = 'en_revision' ORDER BY pay.created_at DESC LIMIT 6`);
  const pendingAmount = get(`SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE status = 'en_revision'`)?.s || 0;
  const pendingTotal = get(`SELECT COUNT(*) AS c FROM payments WHERE status = 'en_revision'`)?.c || 0;
  const todayAppointments = listAppointments({ from: today, to: today, limit: 40 });
  const weekEnd = addDays(today, 7);
  const week = listAppointments({ from: today, to: weekEnd, limit: 100 });
  const therapists = all('SELECT * FROM therapists WHERE active = 1');
  const activePatients = get(`SELECT COUNT(*) AS c FROM patients WHERE status = 'activo'`)?.c || 0;
  const inactiveDays = Number(settings().frequency.inactiveAfterDays || 45);
  const inactive = get(
    `SELECT COUNT(*) AS c FROM patients p
      WHERE EXISTS (SELECT 1 FROM appointments a WHERE a.patient_id = p.id AND a.status = 'completada')
        AND NOT EXISTS (SELECT 1 FROM appointments a WHERE a.patient_id = p.id AND a.status = 'completada' AND a.date >= ?)`,
    addDays(today, -inactiveDays))?.c || 0;
  const totalPatients = get('SELECT COUNT(*) AS c FROM patients')?.c || 0;
  const newPatients = get(`SELECT COUNT(*) AS c FROM patients WHERE substr(created_at,1,7) = ?`, monthKey(today))?.c || 0;
  const noShows = get(`SELECT COUNT(*) AS c FROM appointments WHERE status = 'no_asistio'`)?.c || 0;
  const finished = get(`SELECT COUNT(*) AS c FROM appointments WHERE status IN ('completada','no_asistio')`)?.c || 0;

  const load = therapists.map((t) => {
    const appts = all(`SELECT * FROM appointments WHERE therapist_id = ? AND date BETWEEN ? AND ? AND status IN ('pendiente','confirmada','completada')`, t.id, monthStart, monthEnd);
    const inc = get(
      `SELECT COALESCE(SUM(pay.amount),0) AS s FROM payments pay JOIN appointments a ON a.id = pay.appointment_id
        WHERE pay.status='verificado' AND a.therapist_id = ? AND a.date BETWEEN ? AND ?`, t.id, monthStart, monthEnd)?.s || 0;
    return { id: t.id, name: t.name, photo: t.photo, gender: t.gender, appointments: appts.length, income: Number(inc) };
  });

  const pendingConfirm = get(`SELECT COUNT(*) AS c FROM appointments WHERE status = 'pendiente' AND date >= ?`, today)?.c || 0;
  const surveysMonth = get(`SELECT COUNT(*) AS c FROM surveys WHERE substr(created_at,1,7) = ?`, monthKey(today))?.c || 0;
  const avgTicket = get(`SELECT COALESCE(AVG(price),0) AS s FROM appointments WHERE status = 'completada'`)?.s || 0;
  const statusCounts = all(`SELECT status, COUNT(*) AS c FROM appointments WHERE substr(date,1,7) = ? GROUP BY status`, monthKey(today));
  const buffer = Number(settings().booking.bufferMinutes ?? 10);
  const weeklyCapacity = all('SELECT weekday, start, "end", slot_minutes, therapist_id FROM availability WHERE active = 1')
    .reduce((sum, r) => sum + Math.floor((minutes(r.end) - minutes(r.start)) / ((Number(r.slot_minutes) || 50) + buffer)), 0);

  const pendingApplications = get(`SELECT COUNT(*) AS c FROM applications WHERE status = 'pendiente'`)?.c || 0;
  res.json({
    statusCounts,
    weeklyCapacity,
    pendingApplications,
    kpis: {
      incomeMonth: Number(incomeMonth), expensesMonth: Number(expensesMonth), balanceMonth: Number(incomeMonth) - Number(expensesMonth),
      todayCount: todayAppointments.length, weekCount: week.length, activePatients, inactive,
      totalPatients, newPatients, pendingAmount: Number(pendingAmount), pendingCount: pendingPayments.length, pendingTotal,
      noShowRate: finished ? Math.round((noShows / finished) * 100) : 0,
      pendingConfirm, surveysMonth, avgTicket: Number(avgTicket),
    },
    series: monthlySeries(6),
    today: todayAppointments,
    upcoming: week.slice(0, 8),
    pendingPayments,
    load,
    alerts: [
      pendingPayments.length && { kind: 'warning', title: `${pendingPayments.length} comprobantes por validar`, text: 'Ve a Pagos para confirmar transferencias.', link: '/admin/pagos' },
      inactive && { kind: 'info', title: `${inactive} pacientes no han vuelto`, text: 'Revisa la lista de no frecuentes y haz seguimiento.', link: '/admin/pacientes?freq=inactivo' },
      pendingConfirm && { kind: 'danger', title: `${pendingConfirm} citas por confirmar`, text: 'Confirma o libera los cupos pendientes.', link: '/admin/citas?status=pendiente' },
      pendingApplications && { kind: 'info', title: `${pendingApplications} profesionales quieren sumarse`, text: 'Revisa sus perfiles y decide a quién aceptar.', link: '/admin/solicitudes' },
    ].filter(Boolean),
  });
}));

/* -------------------------------- appointments ------------------------------- */
adminRouter.get('/appointments', wrap((req, res) => {
  const { from, to, therapistId, status, q, patientId } = req.query;
  res.json(listAppointments({ from, to, therapistId, status, q, patientId, limit: 800 }));
}));

adminRouter.get('/appointments/:id', wrap((req, res) => {
  const appt = appointmentFull(req.params.id);
  if (!appt) return res.status(404).json({ error: 'Cita no encontrada' });
  const payments = all('SELECT * FROM payments WHERE appointment_id = ? ORDER BY created_at DESC', appt.id);
  const notes = all('SELECT * FROM session_notes WHERE appointment_id = ?', appt.id);
  res.json({ ...appt, payments, notes });
}));

adminRouter.post('/appointments', wrap((req, res) => {
  const b = req.body || {};
  if (!b.patientId || !b.therapistId || !b.date || !b.start) return res.status(400).json({ error: 'Paciente, terapeuta, fecha y hora son obligatorios' });
  const slots = slotsForDate(b.therapistId, b.date);
  const slot = slots.find((s) => s.start === b.start);
  if (!slot) return res.status(400).json({ error: 'El horario está fuera de la disponibilidad del terapeuta' });
  if (!slot.available) return res.status(409).json({ error: 'Ese horario ya está ocupado o bloqueado' });
  const patient = get('SELECT * FROM patients WHERE id = ?', b.patientId);
  if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });
  const id = uid('apt_');
  let code, tries = 0;
  do { code = 'PC-' + Math.random().toString(36).slice(2, 8).toUpperCase(); tries++; } while (get('SELECT id FROM appointments WHERE code = ?', code) && tries < 10);
  insert('appointments', {
    id, code, patient_id: b.patientId, therapist_id: b.therapistId, date: b.date, start: slot.start, end: slot.end,
    modality: b.modality || 'presencial', status: b.status || 'confirmada',
    price: Number(b.price ?? patient.assigned_price ?? 20), payment_status: b.paymentStatus || 'pendiente',
    reason: b.reason || null, notes: b.notes || null, created_by: req.user.id, created_at: nowISO(), updated_at: nowISO(),
  });
  audit(req.user, 'crear_cita', 'appointment', id, `${patient.name} · ${b.date} ${slot.start}`);
  res.status(201).json(appointmentFull(id));
}));

adminRouter.patch('/appointments/:id', wrap((req, res) => {
  const appt = get('SELECT * FROM appointments WHERE id = ?', req.params.id);
  if (!appt) return res.status(404).json({ error: 'Cita no encontrada' });
  const b = req.body || {};
  const patch = {};
  if (b.status) patch.status = b.status;
  if (b.paymentStatus) patch.payment_status = b.paymentStatus;
  if (b.notes !== undefined) patch.notes = b.notes;
  if (b.reason !== undefined) patch.reason = b.reason;
  if (b.price !== undefined) patch.price = Number(b.price);
  if (b.date && b.start) {
    const slots = slotsForDate(b.therapistId || appt.therapist_id, b.date, { ignoreAppointmentId: appt.id });
    const slot = slots.find((s) => s.start === b.start);
    if (!slot || !slot.available) return res.status(409).json({ error: 'El nuevo horario no está disponible' });
    patch.date = b.date; patch.start = slot.start; patch.end = slot.end;
    if (b.therapistId) patch.therapist_id = b.therapistId;
  } else if (b.start && !b.date) {
    const slots = slotsForDate(appt.therapist_id, appt.date, { ignoreAppointmentId: appt.id });
    const slot = slots.find((s) => s.start === b.start);
    if (!slot || !slot.available) return res.status(409).json({ error: 'El nuevo horario no está disponible' });
    patch.start = slot.start; patch.end = slot.end;
  }
  if (b.cancelReason) patch.cancel_reason = b.cancelReason;
  patch.updated_at = nowISO();
  update('appointments', appt.id, patch);
  if (b.status === 'completada') refreshPatient(appt.patient_id);
  audit(req.user, 'actualizar_cita', 'appointment', appt.id, patch);
  res.json(appointmentFull(appt.id));
}));

adminRouter.delete('/appointments/:id', wrap((req, res) => {
  const appt = get('SELECT * FROM appointments WHERE id = ?', req.params.id);
  if (!appt) return res.status(404).json({ error: 'Cita no encontrada' });
  run('DELETE FROM appointments WHERE id = ?', appt.id);
  audit(req.user, 'eliminar_cita', 'appointment', appt.id, appt.code);
  res.json({ ok: true });
}));

adminRouter.get('/agenda', wrap((req, res) => {
  const from = req.query.from || todayISO();
  const to = req.query.to || addDays(from, 6);
  const therapistId = req.query.therapistId;
  const appointments = listAppointments({ from, to, therapistId: therapistId && therapistId !== 'todos' ? therapistId : undefined, limit: 500 });
  const therapists = all('SELECT id, name, photo, gender FROM therapists WHERE active = 1 ORDER BY name').map((t) => ({ ...t, photo: t.photo }));
  let capacity = 0;
  for (const t of therapists) {
    const ranges = all('SELECT * FROM availability WHERE therapist_id = ? AND active = 1', t.id);
    let d = from;
    while (d <= to) {
      const wd = weekdayOf(d);
      for (const r of ranges.filter((r) => r.weekday === wd)) {
        capacity += Math.floor((minutes(r.end) - minutes(r.start)) / ((Number(r.slot_minutes) || 50) + Number(settings().booking.bufferMinutes ?? 10)));
      }
      d = addDays(d, 1);
    }
  }
  const exceptions = all(`SELECT * FROM exceptions WHERE date BETWEEN ? AND ?`, from, to);
  res.json({ from, to, appointments, therapists, capacity, exceptions });
}));

/* --------------------------------- patients --------------------------------- */
adminRouter.get('/patients', wrap((req, res) => {
  const { q, status, freq, therapistId, tier } = req.query;
  let rows = all(
    `SELECT p.*, t.name AS therapist_name, t.photo AS therapist_photo, t.id AS main_therapist,
            (SELECT MAX(date) FROM appointments a WHERE a.patient_id = p.id AND a.status = 'completada') AS last_visit,
            (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = p.id AND a.status = 'completada') AS sessions_total,
            (SELECT COALESCE(SUM(amount),0) FROM payments pay WHERE pay.patient_id = p.id AND pay.status = 'verificado') AS paid_total,
            (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = p.id AND a.status = 'no_asistio') AS no_shows
       FROM patients p
       LEFT JOIN (SELECT patient_id, therapist_id, COUNT(*) c FROM appointments GROUP BY patient_id, therapist_id) x ON x.patient_id = p.id
       LEFT JOIN therapists t ON t.id = x.therapist_id
      GROUP BY p.id ORDER BY p.created_at DESC`);
  rows = rows.map((r) => ({ ...patientDTO(r), frequency: frequencyOf(r.id) }));
  if (q) {
    const s = String(q).toLowerCase();
    rows = rows.filter((r) => `${r.name} ${r.email} ${r.university} ${r.career}`.toLowerCase().includes(s));
  }
  if (status && status !== 'todos') rows = rows.filter((r) => r.status === status);
  if (freq && freq !== 'todos') rows = rows.filter((r) => r.frequency.type === freq);
  if (therapistId && therapistId !== 'todos') rows = rows.filter((r) => r.main_therapist === therapistId);
  if (tier) rows = rows.filter((r) => r.tier_code === tier);
  res.json(rows);
}));

adminRouter.get('/patients/:id', wrap((req, res) => {
  const p = get('SELECT * FROM patients WHERE id = ?', req.params.id);
  if (!p) return res.status(404).json({ error: 'Paciente no encontrado' });
  const appointments = listAppointments({ patientId: p.id, limit: 200 });
  const payments = all('SELECT * FROM payments WHERE patient_id = ? ORDER BY created_at DESC', p.id);
  const surveys = all('SELECT * FROM surveys WHERE patient_id = ? ORDER BY created_at DESC', p.id);
  const notes = all(
    `SELECT n.id, n.created_at, n.mood, t.name AS therapist_name FROM session_notes n JOIN therapists t ON t.id = n.therapist_id
      WHERE n.patient_id = ? ORDER BY n.created_at DESC`, p.id);
  const tier = p.tier_code ? get('SELECT * FROM tiers WHERE code = ?', p.tier_code) : null;
  const paid = payments.filter((x) => x.status === 'verificado').reduce((s, x) => s + Number(x.amount), 0);
  res.json({ patient: patientDTO(p), appointments, payments, surveys, notes, tier, frequency: frequencyOf(p.id), paid });
}));

adminRouter.post('/patients', wrap((req, res) => {
  const b = req.body || {};
  if (!b.name || !b.email) return res.status(400).json({ error: 'Nombre y correo son obligatorios' });
  if (get('SELECT id FROM patients WHERE lower(email) = lower(?)', b.email)) return res.status(409).json({ error: 'Ya existe un paciente con ese correo' });
  const id = uid('pat_');
  insert('patients', {
    id, user_id: null, name: b.name, email: String(b.email).toLowerCase(), phone: b.phone || null,
    gender: b.gender || null, birthdate: b.birthdate || null, university: b.university || null,
    career: b.career || null, semester: b.semester || null, city: b.city || null, referred_by: b.referredBy || 'Administración',
    notes: b.notes || null, tags: JSON.stringify(b.tags || []), tier_code: b.tierCode || 'E',
    assigned_price: Number(b.assignedPrice || 20), status: 'activo', risk: 'bajo', created_at: nowISO(),
  });
  audit(req.user, 'crear_paciente', 'patient', id, b.name);
  res.status(201).json(patientDTO(get('SELECT * FROM patients WHERE id = ?', id)));
}));

adminRouter.patch('/patients/:id', wrap((req, res) => {
  const p = get('SELECT * FROM patients WHERE id = ?', req.params.id);
  if (!p) return res.status(404).json({ error: 'Paciente no encontrado' });
  const fields = ['name', 'email', 'phone', 'gender', 'birthdate', 'university', 'career', 'semester', 'city', 'notes', 'tier_code', 'assigned_price', 'status', 'risk'];
  const patch = {};
  for (const f of fields) if (req.body?.[f] !== undefined) patch[f] = req.body[f];
  if (req.body?.tags !== undefined) patch.tags = JSON.stringify(req.body.tags);
  if (Object.keys(patch).length) update('patients', p.id, patch);
  audit(req.user, 'actualizar_paciente', 'patient', p.id, Object.keys(patch).join(', '));
  res.json(patientDTO(get('SELECT * FROM patients WHERE id = ?', p.id)));
}));

/* --------------------------------- therapists -------------------------------- */
adminRouter.get('/therapists', wrap((req, res) => {
  const rows = all('SELECT * FROM therapists ORDER BY featured DESC, name').map(therapistPublic);
  const withStats = rows.map((t) => {
    const appts = get(`SELECT COUNT(*) AS c FROM appointments WHERE therapist_id = ? AND status = 'completada'`, t.id)?.c || 0;
    const income = get(`SELECT COALESCE(SUM(p.amount),0) AS s FROM payments p JOIN appointments a ON a.id=p.appointment_id WHERE p.status='verificado' AND a.therapist_id = ?`, t.id)?.s || 0;
    const upcoming = get(`SELECT COUNT(*) AS c FROM appointments WHERE therapist_id = ? AND date >= ? AND status IN ('pendiente','confirmada')`, t.id, todayISO())?.c || 0;
    const patients = get(`SELECT COUNT(DISTINCT patient_id) AS c FROM appointments WHERE therapist_id = ?`, t.id)?.c || 0;
    return { ...t, completed: appts, income: Number(income), upcoming, patients };
  });
  res.json(withStats);
}));

adminRouter.post('/therapists', wrap((req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const id = uid('thr_');
  insert('therapists', {
    id, user_id: null, name: b.name, gender: b.gender || 'femenino', birthdate: b.birthdate || null,
    university: b.university || null, degree: b.degree || null, approaches: JSON.stringify(b.approaches || []),
    description: b.description || null, photo: b.photo || null, price_base: Number(b.priceBase || 20),
    modality: b.modality || 'ambas', languages: b.languages || 'Español', license: b.license || null,
    room: b.room || null, years: Number(b.years || 0), active: b.active === false ? 0 : 1,
    featured: b.featured ? 1 : 0, created_at: nowISO(),
  });
  if (b.email) {
    const exists = get('SELECT id FROM users WHERE lower(email) = lower(?)', b.email);
    if (!exists) {
      const uidUser = uid('usr_');
      insert('users', {
        id: uidUser, email: String(b.email).toLowerCase(), password_hash: hashPassword(b.password || 'Psicampus2026!'),
        role: 'terapeuta', name: b.name, phone: b.phone || null, active: 1, created_at: nowISO(),
      });
      run('UPDATE therapists SET user_id = ? WHERE id = ?', uidUser, id);
    }
  }
  audit(req.user, 'crear_terapeuta', 'therapist', id, b.name);
  res.status(201).json(therapistPublic(get('SELECT * FROM therapists WHERE id = ?', id)));
}));

adminRouter.patch('/therapists/:id', wrap((req, res) => {
  const t = get('SELECT * FROM therapists WHERE id = ?', req.params.id);
  if (!t) return res.status(404).json({ error: 'Terapeuta no encontrado' });
  const map = { priceBase: 'price_base', photo: 'photo', active: 'active', featured: 'featured' };
  const allowed = ['name', 'gender', 'birthdate', 'university', 'degree', 'description', 'photo', 'modality', 'languages', 'license', 'room', 'years', 'active', 'featured'];
  const patch = {};
  for (const f of allowed) if (req.body?.[f] !== undefined) patch[f] = req.body[f];
  if (req.body?.approaches !== undefined) patch.approaches = JSON.stringify(req.body.approaches);
  if (req.body?.priceBase !== undefined) patch.price_base = Number(req.body.priceBase);
  if (Object.keys(patch).length) update('therapists', t.id, patch);
  audit(req.user, 'actualizar_terapeuta', 'therapist', t.id, Object.keys(patch).join(', '));
  res.json(therapistPublic(get('SELECT * FROM therapists WHERE id = ?', t.id)));
}));

adminRouter.delete('/therapists/:id', wrap((req, res) => {
  const t = get('SELECT * FROM therapists WHERE id = ?', req.params.id);
  if (!t) return res.status(404).json({ error: 'Terapeuta no encontrado' });
  const future = get(`SELECT COUNT(*) AS c FROM appointments WHERE therapist_id = ? AND date >= ? AND status IN ('pendiente','confirmada')`, t.id, todayISO())?.c || 0;
  if (future) return res.status(400).json({ error: `No se puede desactivar: tiene ${future} citas futuras. Reasígnalas primero.` });
  run('DELETE FROM therapists WHERE id = ?', t.id);
  run('DELETE FROM availability WHERE therapist_id = ?', t.id);
  audit(req.user, 'eliminar_terapeuta', 'therapist', t.id, t.name);
  res.json({ ok: true });
}));

/* ------------------------------- applications -------------------------------- */
adminRouter.get('/applications', wrap((req, res) => {
  // Eliminar solicitudes rechazadas con más de 10 días
  run(`DELETE FROM applications WHERE status = 'rechazada' AND datetime(COALESCE(NULLIF(reviewed_at, ''), created_at)) < datetime('now', '-10 days')`);
  const status = req.query.status && req.query.status !== 'todas' ? req.query.status : null;
  const rows = all(
    `SELECT * FROM applications ${status ? 'WHERE status = ?' : ''}
      ORDER BY CASE status WHEN 'pendiente' THEN 0 WHEN 'aprobada' THEN 1 ELSE 2 END, created_at DESC`,
    ...(status ? [status] : []));
  res.json(rows.map((r) => ({ ...r, approaches: safeArray(r.approaches) })));
}));

adminRouter.patch('/applications/:id', wrap(async (req, res) => {
  const app = get('SELECT * FROM applications WHERE id = ?', req.params.id);
  if (!app) return res.status(404).json({ error: 'Solicitud no encontrada' });
  const action = req.body?.action;

  if (action === 'approve') {
    if (app.status === 'aprobada') return res.status(409).json({ error: 'Esta solicitud ya fue aprobada' });
    if (get('SELECT id FROM users WHERE lower(email) = lower(?)', app.email)) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese correo. Vincula el perfil manualmente.' });
    }
    const code = `INV-${Date.now().toString(36).slice(2, 8).toUpperCase()}`;
    const password = String(req.body?.password || 'Psicampus2026!');
    if (password.length < 8) return res.status(400).json({ error: 'La contraseña temporal debe tener al menos 8 caracteres' });
    const userId = uid('usr_');
    const therapistId = uid('thr_');
    // Crear usuario con código de invitación (activo 0, debe registrar con el código)
    insert('users', {
      id: userId, email: app.email, password_hash: hashPassword(password), role: 'terapeuta',
      name: app.name, phone: app.phone || null, active: 0, created_at: nowISO(),
      invitation_code: code,
    });
    insert('therapists', {
      id: therapistId, user_id: userId, name: app.name, gender: app.gender || 'femenino',
      birthdate: app.birthdate || null, university: app.university || null, degree: app.degree || null,
      approaches: app.approaches || '[]', description: app.description || null, photo: app.photo || null,
      price_base: Number(req.body?.priceBase || 20), modality: app.modality || 'ambas',
      languages: 'Español', license: app.license || null, room: req.body?.room || 'Consultorio por asignar',
      years: Number(app.years || 0), active: 1, featured: 0, created_at: nowISO(),
    });
    update('applications', app.id, {
      status: 'aprobada', therapist_id: therapistId, reviewed_by: req.user.id, reviewed_at: nowISO(),
      note: req.body?.note || null,
    });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    try { await sendMail({ to: app.email, subject: 'Código de invitación para Psicampus', html: invitationEmail({ name: app.name, code, expiresAt, link: '/#/login', clinic: 'Neuropsi' }) }); } catch {}
    audit(req.user, 'aprobar_profesional', 'application', app.id, `${app.name} · ${app.email}`);
    notify({
      userId: userId, audience: 'user', title: 'Profesional aprobado',
      body: `Tu solicitud fue aprobada. Usa el código ${code} para completar tu registro.`, kind: 'success', link: '/login',
    });
    return res.json({
      ok: true,
      therapist: therapistPublic(get('SELECT * FROM therapists WHERE id = ?', therapistId)),
      credentials: { user: app.email, code },
    });
  }

  if (action === 'reject') {
    update('applications', app.id, {
      status: 'rechazada', reviewed_by: req.user.id, reviewed_at: nowISO(),
      note: req.body?.note || 'Solicitud rechazada por administración',
    });
    audit(req.user, 'rechazar_profesional', 'application', app.id, app.name);
    try { await sendMail({ to: app.email, from: 'psicoeducativobienestar@gmail.com', subject: 'Psyconova · Respuesta a tu solicitud', html: `<p>Hola <b>${app.name}</b>,</p><p>Lamentamos informarte que tu solicitud no fue aprobada esta vez.</p><p>Te agradecemos tu interés; te contactaremos si evaluamos tu perfil en el futuro.</p><p>— Equipo Psyconova</p>` }); } catch {}
    return res.json({ ok: true });
  }

  res.status(400).json({ error: 'Acción no válida' });
}));

/* -------------------------------- availability ------------------------------- */
adminRouter.get('/therapists/:id/availability', wrap((req, res) => {
  res.json(all('SELECT * FROM availability WHERE therapist_id = ? ORDER BY weekday, start', req.params.id));
}));

adminRouter.post('/availability', wrap((req, res) => {
  const b = req.body || {};
  if (!b.therapistId || b.weekday === undefined || !b.start || !b.end) return res.status(400).json({ error: 'Completa terapeuta, día y rango de horas' });
  if (minutes(b.end) <= minutes(b.start)) return res.status(400).json({ error: 'La hora final debe ser mayor a la inicial' });
  const clash = all('SELECT * FROM availability WHERE therapist_id = ? AND weekday = ? AND active = 1', b.therapistId, b.weekday)
    .some((r) => minutes(b.start) < minutes(r.end) && minutes(r.start) < minutes(b.end));
  if (clash) return res.status(409).json({ error: 'Ese rango se cruza con otro horario existente' });
  const id = uid('avl_');
  insert('availability', {
    id, therapist_id: b.therapistId, weekday: Number(b.weekday), start: b.start, end: b.end,
    slot_minutes: Number(b.slotMinutes || 50), modality: b.modality || 'ambas', room: b.room || null, active: 1,
  });
  audit(req.user, 'crear_horario', 'availability', id, `${b.therapistId} · día ${b.weekday} ${b.start}-${b.end}`);
  res.status(201).json(get('SELECT * FROM availability WHERE id = ?', id));
}));

adminRouter.patch('/availability/:id', wrap((req, res) => {
  const row = get('SELECT * FROM availability WHERE id = ?', req.params.id);
  if (!row) return res.status(404).json({ error: 'Horario no encontrado' });
  const patch = {};
  for (const f of ['start', 'end', 'slot_minutes', 'modality', 'room', 'active']) if (req.body?.[f] !== undefined) patch[f] = req.body[f];
  update('availability', row.id, patch);
  res.json(get('SELECT * FROM availability WHERE id = ?', row.id));
}));

adminRouter.delete('/availability/:id', wrap((req, res) => {
  run('DELETE FROM availability WHERE id = ?', req.params.id);
  res.json({ ok: true });
}));

adminRouter.get('/exceptions', wrap((req, res) => {
  const from = req.query.from || todayISO();
  const to = req.query.to || addDays(from, 60);
  res.json(all(`SELECT e.*, t.name AS therapist_name FROM exceptions e LEFT JOIN therapists t ON t.id = e.therapist_id
                 WHERE e.date BETWEEN ? AND ? ORDER BY e.date`, from, to));
}));

adminRouter.post('/exceptions', wrap((req, res) => {
  const b = req.body || {};
  if (!b.therapistId || !b.date) return res.status(400).json({ error: 'Terapeuta y fecha son obligatorios' });
  const id = uid('exc_');
  insert('exceptions', {
    id, therapist_id: b.therapistId, date: b.date, all_day: b.allDay === false ? 0 : 1,
    start: b.start || null, end: b.end || null, kind: b.kind || 'bloqueo', reason: b.reason || null, created_at: nowISO(),
  });
  res.status(201).json({ ok: true, id });
}));

adminRouter.delete('/exceptions/:id', wrap((req, res) => {
  run('DELETE FROM exceptions WHERE id = ?', req.params.id);
  res.json({ ok: true });
}));

/* ---------------------------------- payments --------------------------------- */
adminRouter.get('/payments', wrap((req, res) => {
  const status = req.query.status && req.query.status !== 'todos' ? req.query.status : null;
  const rows = all(
    `SELECT pay.*, p.name AS patient_name, p.email AS patient_email, a.code, a.date AS session_date, a.start, a.therapist_id, t.name AS therapist_name
       FROM payments pay JOIN patients p ON p.id = pay.patient_id
       LEFT JOIN appointments a ON a.id = pay.appointment_id
       LEFT JOIN therapists t ON t.id = a.therapist_id
      ${status ? 'WHERE pay.status = ?' : ''}
      ORDER BY CASE pay.status WHEN 'en_revision' THEN 0 WHEN 'pendiente' THEN 1 ELSE 2 END, pay.created_at DESC LIMIT 300`,
    ...(status ? [status] : []));
  res.json(rows);
}));

adminRouter.post('/payments', wrap((req, res) => {
  const b = req.body || {};
  const appt = b.appointmentId ? get('SELECT * FROM appointments WHERE id = ?', b.appointmentId) : null;
  if (!appt) return res.status(400).json({ error: 'Selecciona una cita' });
  const id = uid('pay_');
  insert('payments', {
    id, appointment_id: appt.id, patient_id: appt.patient_id, amount: Number(b.amount || appt.price),
    method: b.method || 'transferencia', reference: b.reference || null,
    receipt: b.dataUrl ? saveDataUrl(b.dataUrl, 'recibo') : null,
    status: b.status || 'verificado', note: b.note || null, verified_by: req.user.id,
    created_at: nowISO(), verified_at: b.status === 'en_revision' ? null : nowISO(),
  });
  if ((b.status || 'verificado') === 'verificado') run(`UPDATE appointments SET payment_status = 'pagado' WHERE id = ?`, appt.id);
  audit(req.user, 'registrar_pago', 'payment', id, `${appt.code} · ${b.amount || appt.price}`);
  res.status(201).json({ ok: true, id });
}));

adminRouter.patch('/payments/:id', wrap((req, res) => {
  const pay = get('SELECT * FROM payments WHERE id = ?', req.params.id);
  if (!pay) return res.status(404).json({ error: 'Pago no encontrado' });
  const action = req.body?.action;
  if (!['verify', 'reject'].includes(action)) return res.status(400).json({ error: 'Acción no válida' });
  if (action === 'verify') {
    update('payments', pay.id, { status: 'verificado', verified_by: req.user.id, verified_at: nowISO(), note: req.body?.note || pay.note });
    if (pay.appointment_id) run(`UPDATE appointments SET payment_status = 'pagado', updated_at = ? WHERE id = ?`, nowISO(), pay.appointment_id);
    notify({ userId: 'usr_admin', audience: 'admin', title: 'Pago confirmado', body: `Se validó un pago de $${pay.amount}.`, kind: 'success', link: '/admin/contabilidad' });
  } else {
    update('payments', pay.id, { status: 'rechazado', verified_by: req.user.id, verified_at: nowISO(), note: req.body?.note || 'Comprobante no válido' });
    if (pay.appointment_id) run(`UPDATE appointments SET payment_status = 'pendiente', updated_at = ? WHERE id = ?`, nowISO(), pay.appointment_id);
  }
  audit(req.user, action === 'verify' ? 'verificar_pago' : 'rechazar_pago', 'payment', pay.id, `$${pay.amount}`);
  res.json({ ok: true });
}));

/* --------------------------------- accounting -------------------------------- */
adminRouter.get('/accounting', wrap((req, res) => {
  const { start: defStart, end: defEnd } = monthRange(monthKey(todayISO()));
  const from = req.query.from || defStart;
  const to = req.query.to || defEnd;
  const summary = accountingSummary(from, to);
  const series = monthlySeries(6);
  const expensesByMonth = {};
  for (const e of all(`SELECT substr(date,1,7) AS m, SUM(amount) AS s FROM expenses GROUP BY m`)) expensesByMonth[e.m] = Number(e.s);
  res.json({ from, to, ...summary, series, expensesByMonth });
}));

adminRouter.get('/accounting/export.csv', wrap((req, res) => {
  const from = req.query.from || monthRange(monthKey(todayISO())).start;
  const to = req.query.to || monthRange(monthKey(todayISO())).end;
  const { incomeRows, expenseRows } = accountingSummary(from, to);
  const rows = [
    ...incomeRows.map((r) => ({ date: r.session_date || r.created_at?.slice(0, 10), type: 'Ingreso', category: 'Sesión', description: `${r.code || ''} · ${r.patient_name || ''}`, therapist: r.therapist_name || '', amount: r.amount, method: r.method })),
    ...expenseRows.map((r) => ({ date: r.date, type: 'Egreso', category: r.category, description: r.description, therapist: '', amount: -r.amount, method: r.method })),
  ].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const out = csv(rows, [
    { key: 'date', label: 'Fecha' }, { key: 'type', label: 'Tipo' }, { key: 'category', label: 'Categoría' },
    { key: 'description', label: 'Descripción' }, { key: 'therapist', label: 'Terapeuta' },
    { key: 'amount', label: 'Monto' }, { key: 'method', label: 'Método' },
  ]);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="psicampus-contabilidad-${from}-${to}.csv"`);
  res.send(out);
}));

adminRouter.post('/expenses', wrap((req, res) => {
  const b = req.body || {};
  if (!b.date || !b.amount || !b.category) return res.status(400).json({ error: 'Fecha, categoría y monto son obligatorios' });
  const id = uid('exp_');
  insert('expenses', {
    id, date: b.date, category: b.category, description: b.description || null, amount: Number(b.amount),
    method: b.method || 'transferencia', receipt: b.dataUrl ? saveDataUrl(b.dataUrl, 'egreso') : null,
    created_by: req.user.id, created_at: nowISO(),
  });
  audit(req.user, 'registrar_egreso', 'expense', id, `${b.category} · $${b.amount}`);
  res.status(201).json({ ok: true, id });
}));

adminRouter.delete('/expenses/:id', wrap((req, res) => {
  run('DELETE FROM expenses WHERE id = ?', req.params.id);
  res.json({ ok: true });
}));

/* ----------------------------------- config ---------------------------------- */
adminRouter.get('/settings', wrap((req, res) => {
  res.json({ settings: settings(), public: publicSettings(), tiers: tiers(false), defaultsKeys: Object.keys(DEFAULT_SETTINGS) });
}));

adminRouter.put('/settings', wrap((req, res) => {
  const body = req.body || {};
  for (const [key, value] of Object.entries(body)) {
    if (!(key in DEFAULT_SETTINGS)) continue;
    if (value && typeof value === 'object' && !Array.isArray(value) && DEFAULT_SETTINGS[key] && typeof DEFAULT_SETTINGS[key] === 'object') {
      setSetting(key, { ...settings()[key], ...value });
    } else {
      setSetting(key, value);
    }
  }
  audit(req.user, 'actualizar_configuracion', 'settings', null, Object.keys(body).join(', '));
  res.json({ ok: true, settings: settings() });
}));

adminRouter.put('/tiers', wrap((req, res) => {
  const list = req.body?.tiers;
  if (!Array.isArray(list)) return res.status(400).json({ error: 'Formato inválido' });
  const minPrice = Number(settings().pricing?.min || 7);
  for (const t of list) {
    if (!t.code) continue;
    const patch = {};
    for (const f of ['name', 'price', 'min_score', 'max_score', 'color', 'description', 'active']) if (t[f] !== undefined) patch[f] = f === 'active' ? (t[f] ? 1 : 0) : t[f];
    if (patch.price !== undefined) patch.price = Math.max(minPrice, Number(patch.price) || 0);
    const keys = Object.keys(patch);
    if (!keys.length) continue;
    run(`UPDATE tiers SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE code = ?`, ...keys.map(k => patch[k]), t.code);
  }
  audit(req.user, 'actualizar_tarifas', 'tiers', null, 'Escala de aportes');
  res.json({ ok: true, tiers: tiers(false) });
}));

/* ------------------------------------ users ---------------------------------- */
adminRouter.get('/users', wrap((req, res) => {
  // Solo muestra terapeutas activos; los borrados o inactivos no aparecen
  const allUsers = all(`SELECT id, email, role, name, phone, active, last_login, created_at FROM users ORDER BY role, name`);
  const activeTherapistIds = new Set((all(`SELECT user_id FROM therapists WHERE active = 1`) || []).map(r => r.user_id));
  const visible = allUsers.filter((u) => u.role === 'admin' || (u.role === 'terapeuta' && activeTherapistIds.has(u.id)) || u.role !== 'terapeuta');
  res.json(visible);
}));

adminRouter.post('/users', wrap((req, res) => {
  const b = req.body || {};
  if (!b.name || !b.email || !b.password) return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' });
  if (get('SELECT id FROM users WHERE lower(email) = lower(?)', b.email)) return res.status(409).json({ error: 'Ese correo ya está registrado' });
  const id = uid('usr_');
  insert('users', {
    id, email: String(b.email).toLowerCase(), password_hash: hashPassword(b.password), role: b.role || 'terapeuta',
    name: b.name, phone: b.phone || null, active: 1, created_at: nowISO(),
  });
  audit(req.user, 'crear_usuario', 'user', id, `${b.name} (${b.role})`);
  res.status(201).json({ ok: true, id });
}));

adminRouter.patch('/users/:id', wrap((req, res) => {
  const u = get('SELECT * FROM users WHERE id = ?', req.params.id);
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (u.id === req.user.id && req.body?.active === false) return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
  const patch = {};
  for (const f of ['name', 'phone', 'role', 'active']) if (req.body?.[f] !== undefined) patch[f] = req.body[f];
  if (req.body?.password) patch.password_hash = hashPassword(req.body.password);
  if (Object.keys(patch).length) update('users', u.id, patch);
  audit(req.user, 'actualizar_usuario', 'user', u.id, u.email);
  res.json({ ok: true });
}));

adminRouter.get('/surveys', wrap((req, res) => {
  const rows = all(
    `SELECT s.*, p.name AS patient_name, p.email AS patient_email, p.university, p.assigned_price
       FROM surveys s LEFT JOIN patients p ON p.id = s.patient_id ORDER BY s.created_at DESC LIMIT 400`);
  const stats = get(
    `SELECT COUNT(*) AS count, COALESCE(AVG(score),0) AS avgScore, COALESCE(AVG(suggested_price),0) AS avgSuggested,
            COALESCE(AVG(declared_price),0) AS avgDeclared FROM surveys`) || {};
  const distribution = all(`SELECT tier_code, COUNT(*) AS c FROM surveys GROUP BY tier_code ORDER BY tier_code`);
  res.json({ rows, stats, distribution });
}));

adminRouter.get('/audit', wrap((req, res) => {
  res.json(all('SELECT * FROM audit ORDER BY created_at DESC LIMIT 150'));
}));

adminRouter.get('/notifications', wrap((req, res) => {
  res.json(all(`SELECT * FROM notifications WHERE audience = 'admin' OR user_id = ? ORDER BY created_at DESC LIMIT 60`, req.user.id));
}));

adminRouter.post('/notifications/read', wrap((req, res) => {
  run(`UPDATE notifications SET read = 1 WHERE audience = 'admin' OR user_id = ?`, req.user.id);
  res.json({ ok: true });
}));

adminRouter.post('/upload', wrap((req, res) => {
  const url = saveDataUrl(req.body?.dataUrl, 'img');
  if (!url) return res.status(400).json({ error: 'Archivo inválido' });
  res.json({ url });
}));

/* -------------------------------- therapist view ------------------------------ */
export const therapistRouter = Router();
therapistRouter.use(requireAuth('terapeuta'));

therapistRouter.get('/overview', wrap((req, res) => {
  const t = get('SELECT * FROM therapists WHERE user_id = ?', req.user.id);
  if (!t) return res.status(404).json({ error: 'Perfil de terapeuta no encontrado' });
  const today = todayISO();
  const appts = listAppointments({ therapistId: t.id, from: addDays(today, -30), to: addDays(today, 30), limit: 300 });
  const upcoming = appts.filter((a) => a.date >= today && ['pendiente', 'confirmada'].includes(a.status)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const patients = all(
    `SELECT DISTINCT p.* FROM patients p JOIN appointments a ON a.patient_id = p.id WHERE a.therapist_id = ? AND p.status = 'activo' ORDER BY p.name`, t.id)
    .map((p) => ({ ...patientDTO(p), frequency: frequencyOf(p.id) }));
  const monthStart = monthRange(monthKey(today)).start;
  const monthEnd = monthRange(monthKey(today)).end;
  const completed = appts.filter((a) => a.status === 'completada' && a.date >= monthStart && a.date <= monthEnd).length;
  const income = get(
    `SELECT COALESCE(SUM(pay.amount),0) AS s FROM payments pay JOIN appointments a ON a.id = pay.appointment_id
      WHERE pay.status = 'verificado' AND a.therapist_id = ? AND a.date BETWEEN ? AND ?`, t.id, monthStart, monthEnd)?.s || 0;
  const notes = all(`SELECT n.*, p.name AS patient_name FROM session_notes n JOIN patients p ON p.id = n.patient_id WHERE n.therapist_id = ? ORDER BY n.created_at DESC LIMIT 20`, t.id);
  res.json({ therapist: t, today: appts.filter((a) => a.date === today), upcoming, patients, month: { completed }, notes });
}));

therapistRouter.patch('/profile', wrap((req, res) => {
  const t = get('SELECT * FROM therapists WHERE user_id = ?', req.user.id);
  if (!t) return res.status(404).json({ error: 'Perfil no encontrado' });
  const allowed = ['name','gender','birthdate','university','degree','description','photo','modality','languages','license','years','approaches'];
  const patch = {};
  for (const f of allowed) if (req.body?.[f] !== undefined) patch[f] = req.body[f];
  if (req.body?.approaches !== undefined) patch.approaches = JSON.stringify(req.body.approaches);
  if (Object.keys(patch).length) update('therapists', t.id, patch);
  res.json({ ok: true, therapist: therapistPublic(get('SELECT * FROM therapists WHERE id = ?', t.id)) });
}));

therapistRouter.get('/appointments', wrap((req, res) => {
  const t = get('SELECT * FROM therapists WHERE user_id = ?', req.user.id);
  res.json(listAppointments({ therapistId: t.id, from: req.query.from, to: req.query.to, limit: 400 }));
}));

therapistRouter.post('/appointments/:id/status', wrap((req, res) => {
  const t = get('SELECT * FROM therapists WHERE user_id = ?', req.user.id);
  const appt = get('SELECT * FROM appointments WHERE id = ? AND therapist_id = ?', req.params.id, t.id);
  if (!appt) return res.status(404).json({ error: 'Cita no encontrada' });
  const status = req.body?.status;
  if (!['completada', 'no_asistio', 'confirmada'].includes(status)) return res.status(400).json({ error: 'Estado no válido' });
  run('UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?', status, nowISO(), appt.id);
  audit(req.user, 'marcar_asistencia', 'appointment', appt.id, status);
  res.json({ ok: true });
}));

therapistRouter.get('/patients/:id', wrap((req, res) => {
  const t = get('SELECT * FROM therapists WHERE user_id = ?', req.user.id);
  const p = get('SELECT * FROM patients WHERE id = ?', req.params.id);
  if (!p) return res.status(404).json({ error: 'Paciente no encontrado' });
  const appts = listAppointments({ patientId: p.id, therapistId: t.id, limit: 100 });
  const notes = all('SELECT * FROM session_notes WHERE patient_id = ? AND therapist_id = ? ORDER BY created_at DESC', p.id, t.id);
  res.json({ patient: patientDTO(p), appointments: appts, notes });
}));

therapistRouter.post('/notes', wrap((req, res) => {
  const t = get('SELECT * FROM therapists WHERE user_id = ?', req.user.id);
  const { patientId, appointmentId, content, mood } = req.body || {};
  if (!patientId || !content) return res.status(400).json({ error: 'Paciente y contenido son obligatorios' });
  const id = uid('not_');
  insert('session_notes', {
    id, appointment_id: appointmentId || null, patient_id: patientId, therapist_id: t.id,
    content, mood: mood || null, created_at: nowISO(),
  });
  res.status(201).json({ ok: true, id });
}));

therapistRouter.get('/availability', wrap((req, res) => {
  const t = get('SELECT * FROM therapists WHERE user_id = ?', req.user.id);
  res.json(all('SELECT * FROM availability WHERE therapist_id = ? ORDER BY weekday, start', t.id));
}));

therapistRouter.post('/availability', wrap((req, res) => {
  const t = get('SELECT * FROM therapists WHERE user_id = ?', req.user.id);
  if (!t) return res.status(404).json({ error: 'Terapeuta no encontrado' });
  const b = req.body || {};
  if (b.weekday === undefined || !b.start || !b.end) return res.status(400).json({ error: 'Completa día y rango de horas' });
  if (minutes(b.end) <= minutes(b.start)) return res.status(400).json({ error: 'La hora final debe ser mayor a la inicial' });
  const clash = all('SELECT * FROM availability WHERE therapist_id = ? AND weekday = ? AND active = 1', t.id, String(b.weekday))
    .some((r) => minutes(b.start) < minutes(r.end) && minutes(r.start) < minutes(b.end));
  if (clash) return res.status(409).json({ error: 'Ese rango se cruza con otro horario existente' });
  const id = uid('avl_');
  insert('availability', {
    id, therapist_id: t.id, weekday: Number(b.weekday), start: b.start, end: b.end,
    slot_minutes: Number(b.slotMinutes || 50), modality: b.modality || 'ambas', room: b.room || null, active: 1,
  });
  res.status(201).json(get('SELECT * FROM availability WHERE id = ?', id));
}));

therapistRouter.patch('/availability/:id', wrap((req, res) => {
  const t = get('SELECT * FROM therapists WHERE user_id = ?', req.user.id);
  if (!t) return res.status(404).json({ error: 'Terapeuta no encontrado' });
  const row = get('SELECT * FROM availability WHERE id = ? AND therapist_id = ?', req.params.id, t.id);
  if (!row) return res.status(404).json({ error: 'Horario no encontrado' });
  const patch = {};
  for (const f of ['start', 'end', 'slot_minutes', 'modality', 'room', 'active']) if (req.body?.[f] !== undefined) patch[f] = req.body[f];
  update('availability', row.id, patch);
  res.json(get('SELECT * FROM availability WHERE id = ?', row.id));
}));

therapistRouter.delete('/availability/:id', wrap((req, res) => {
  const t = get('SELECT * FROM therapists WHERE user_id = ?', req.user.id);
  if (!t) return res.status(404).json({ error: 'Terapeuta no encontrado' });
  const row = get('SELECT * FROM availability WHERE id = ? AND therapist_id = ?', req.params.id, t.id);
  if (!row) return res.status(404).json({ error: 'Horario no encontrado' });
  run('DELETE FROM availability WHERE id = ?', req.params.id);
  res.json({ ok: true });
}));

// Eliminar perfil de terapeuta solo admin
adminRouter.delete('/therapists/:id', wrap(async (req, res) => {
  const id = req.params.id;
  const t = get('SELECT * FROM therapists WHERE id = ?', id);
  if (!t) return res.status(404).json({ error: 'Terapeuta no encontrado' });
  run('DELETE FROM therapists WHERE id = ?', id);
  run('DELETE FROM availability WHERE therapist_id = ?', id);
  audit(req.user, 'eliminar_terapeuta', 'therapist', id, `Eliminado ${t.name || id}`);
  res.json({ ok: true });
}));
