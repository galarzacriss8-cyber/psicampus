import { Router } from 'express';
import { all, get, insert, run, settings, tiers } from '../db.mjs';
import { requireAuth } from '../auth.mjs';
import { computeSurvey, validateAnswers } from '../survey.mjs';
import { addDays, nowISO, todayISO, uid } from '../util.mjs';
import { appointmentFull, frequencyOf, listAppointments, notify, slotsForDate } from '../services.mjs';
import { saveDataUrl } from './public.mjs';

export const patientRouter = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
patientRouter.use(requireAuth('paciente'));

function myPatient(req) {
  return get('SELECT * FROM patients WHERE user_id = ? OR lower(email) = lower(?) ORDER BY (user_id = ?) DESC LIMIT 1', req.user.id, req.user.email, req.user.id);
}

patientRouter.use(requireAuth('paciente'), wrap((req, res, next) => {
  const p = myPatient(req);
  if (!p || p.status !== 'aprobado') return res.status(403).json({ error: 'Perfil pendiente de aprobación. Contacta a tu terapeuta o administración para acceder al portal.' });
  req.approvedPatient = p;
  next();
}));

patientRouter.get('/overview', wrap((req, res) => {
  const p = myPatient(req);
  if (!p) return res.status(404).json({ error: 'Perfil de paciente no encontrado' });
  const appts = listAppointments({ patientId: p.id, limit: 200 });
  const upcoming = appts.filter((a) => a.date >= todayISO() && ['pendiente', 'confirmada'].includes(a.status))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const past = appts.filter((a) => a.date < todayISO() || a.status === 'completada').sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
  const payments = all('SELECT * FROM payments WHERE patient_id = ? ORDER BY created_at DESC', p.id);
  const paid = payments.filter((x) => x.status === 'verificado').reduce((s, x) => s + Number(x.amount), 0);
  const pendingPayments = payments.filter((x) => x.status === 'en_revision').length;
  const tier = p.tier_code ? get('SELECT * FROM tiers WHERE code = ?', p.tier_code) : null;
  const surveys = all('SELECT * FROM surveys WHERE patient_id = ? ORDER BY created_at DESC', p.id);
  res.json({
    patient: { ...p, tags: safe(p.tags) },
    stats: {
      total: appts.length, completed: past.filter((a) => a.status === 'completada').length,
      upcoming: upcoming.length, paid, pendingPayments,
    },
    upcoming, past: past.slice(0, 12), payments, tier, surveys, frequency: frequencyOf(p.id),
    next: upcoming[0] || null,
  });
}));

const safe = (v) => { try { return JSON.parse(v || '[]'); } catch { return []; } };

patientRouter.get('/appointments', wrap((req, res) => {
  const p = myPatient(req);
  if (!p) return res.json([]);
  res.json(listAppointments({ patientId: p.id, limit: 300 }));
}));

patientRouter.post('/appointments/:id/cancel', wrap((req, res) => {
  const p = myPatient(req);
  const appt = get('SELECT * FROM appointments WHERE id = ? AND patient_id = ?', req.params.id, p.id);
  if (!appt) return res.status(404).json({ error: 'Cita no encontrada' });
  if (['completada', 'cancelada'].includes(appt.status)) return res.status(400).json({ error: 'No puedes cancelar esta cita' });
  const cfg = settings().policies;
  const hours = (new Date(appt.date + 'T' + appt.start) - new Date()) / 36e5;
  if (hours < 0) return res.status(400).json({ error: 'La cita ya pasó' });
  run(`UPDATE appointments SET status = 'cancelada', cancel_reason = ?, updated_at = ? WHERE id = ?`, req.body?.reason || 'Cancelada por el paciente', nowISO(), appt.id);
  notify({
    userId: 'usr_admin', audience: 'admin', title: 'Cita cancelada por paciente',
    body: `${p.name} canceló la cita ${appt.code} del ${appt.date} a las ${appt.start}.`, kind: 'warning', link: '/admin/citas',
  });
  res.json({ ok: true, warning: hours < Number(cfg.cancellationHours) ? 'Cancelaste con menos de 24 h de anticipación.' : null });
}));

patientRouter.post('/appointments/:id/reschedule-request', wrap((req, res) => {
  const p = myPatient(req);
  const appt = get('SELECT * FROM appointments WHERE id = ? AND patient_id = ?', req.params.id, p.id);
  if (!appt) return res.status(404).json({ error: 'Cita no encontrada' });
  notify({
    userId: 'usr_admin', audience: 'admin', title: 'Solicitud de reprogramación',
    body: `${p.name} pide mover la cita ${appt.code} (${appt.date} ${appt.start}). Preferencia: ${req.body?.preference || 'sin especificar'}.`,
    kind: 'info', link: '/admin/citas',
  });
  res.json({ ok: true, message: 'Solicitud enviada. Te contactaremos para coordinar el nuevo horario.' });
}));

patientRouter.post('/payments', wrap((req, res) => {
  const p = myPatient(req);
  const appt = get('SELECT * FROM appointments WHERE id = ? AND patient_id = ?', req.body?.appointmentId, p.id);
  if (!appt) return res.status(404).json({ error: 'Cita no encontrada' });
  if (appt.payment_status === 'pagado') return res.status(400).json({ error: 'Esta cita ya está pagada' });
  const url = saveDataUrl(req.body?.dataUrl, 'recibo');
  if (!url) return res.status(400).json({ error: 'Adjunta una imagen o PDF válido' });
  const pending = get(`SELECT * FROM payments WHERE appointment_id = ? AND status = 'en_revision'`, appt.id);
  if (pending) {
    run('UPDATE payments SET receipt = ?, reference = COALESCE(?, reference), amount = ?, created_at = ? WHERE id = ?',
      url, req.body?.reference || null, Number(req.body?.amount || appt.price), nowISO(), pending.id);
  } else {
    insert('payments', {
      id: uid('pay_'), appointment_id: appt.id, patient_id: p.id, amount: Number(req.body?.amount || appt.price),
      method: 'transferencia', reference: req.body?.reference || null, receipt: url, status: 'en_revision',
      note: null, created_at: nowISO(),
    });
  }
  run(`UPDATE appointments SET payment_status = 'en_revision', updated_at = ? WHERE id = ?`, nowISO(), appt.id);
  notify({ userId: 'usr_admin', audience: 'admin', title: 'Comprobante de paciente', body: `${p.name} subió un comprobante para ${appt.code}.`, kind: 'warning', link: '/admin/pagos' });
  res.json({ ok: true, message: 'Comprobante enviado a revisión' });
}));

patientRouter.get('/surveys', wrap((req, res) => {
  const p = myPatient(req);
  res.json(all('SELECT * FROM surveys WHERE patient_id = ? ORDER BY created_at DESC', p.id));
}));

patientRouter.post('/surveys', wrap((req, res) => {
  const p = myPatient(req);
  const answers = req.body?.answers;
  const invalid = validateAnswers(answers);
  if (invalid) return res.status(400).json({ error: invalid });
  const { score, declared } = computeSurvey(answers);
  const list = tiers(true);
  const tier = list.find((t) => score >= t.min_score && score <= t.max_score) || list[list.length - 1];
  insert('surveys', {
    id: uid('svy_'), patient_id: p.id, answers: JSON.stringify(answers), score,
    tier_code: tier.code, suggested_price: tier.price, declared_price: declared, created_at: nowISO(),
  });
  run('UPDATE patients SET tier_code = ?, assigned_price = ? WHERE id = ?', tier.code, tier.price, p.id);
  res.json({ score, tier, ladder: list, message: `Tu aporte sugerido es de $${tier.price} por sesión.` });
}));

patientRouter.patch('/profile', wrap((req, res) => {
  const p = myPatient(req);
  const fields = ['name', 'phone', 'gender', 'birthdate', 'university', 'career', 'semester', 'city'];
  const sets = [];
  const values = [];
  for (const f of fields) if (req.body?.[f] !== undefined) { sets.push(`${f} = ?`); values.push(req.body[f]); }
  if (sets.length) run(`UPDATE patients SET ${sets.join(', ')} WHERE id = ?`, ...values, p.id);
  if (req.body?.name) run('UPDATE users SET name = ? WHERE id = ?', req.body.name, req.user.id);
  res.json({ ok: true, patient: get('SELECT * FROM patients WHERE id = ?', p.id) });
}));

patientRouter.get('/notifications', wrap((req, res) => {
  res.json(all('SELECT * FROM notifications WHERE user_id = ? OR (audience = ? AND user_id IS NULL) ORDER BY created_at DESC LIMIT 50', req.user.id, req.user.role));
}));

patientRouter.post('/notifications/read', wrap((req, res) => {
  run('UPDATE notifications SET read = 1 WHERE user_id = ?', req.user.id);
  res.json({ ok: true });
}));

patientRouter.get('/slots', wrap((req, res) => {
  res.json(slotsForDate(req.query.therapistId, req.query.date));
}));
