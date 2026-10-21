import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { all, get, insert, run, settings, tiers, UPLOAD_DIR } from '../db.mjs';
import { hashPassword } from '../auth.mjs';
import { computeSurvey, validateAnswers } from '../survey.mjs';
import { bookingCode, nowISO, todayISO, uid } from '../util.mjs';
import { addDays } from '../util.mjs';
import { notify, slotsForDate, therapistPublic, appointmentFull, tierForScore } from '../services.mjs';
import { sendMail } from '../mailer.mjs';
import { SURVEY_QUESTIONS } from '../defaults.mjs';

export const publicRouter = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function publicSettings() {
  const s = settings();
  return {
    brand: s.brand, contact: s.contact, content: s.content, bank: s.bank,
    policies: s.policies, booking: s.booking, pricing: s.pricing,
  };
}

publicRouter.get('/bootstrap', wrap((req, res) => {
  const therapists = all('SELECT * FROM therapists WHERE active = 1 ORDER BY featured DESC, name').map(therapistPublic);
  const stats = {
    sessions: get(`SELECT COUNT(*) AS c FROM appointments WHERE status = 'completada'`)?.c || 0,
    patients: get('SELECT COUNT(*) AS c FROM patients')?.c || 0,
    therapists: therapists.length,
    rating: 4.9,
  };
  res.json({ settings: publicSettings(), tiers: tiers(true), therapists, stats, questions: SURVEY_QUESTIONS });
}));

publicRouter.get('/therapists', wrap((req, res) => {
  const { gender, approach, modality, q } = req.query;
  let list = all('SELECT * FROM therapists WHERE active = 1 ORDER BY featured DESC, name').map(therapistPublic);
  if (gender && gender !== 'todos') list = list.filter((t) => t.gender === gender);
  if (modality && modality !== 'todas') list = list.filter((t) => t.modality === modality || t.modality === 'ambas');
  if (approach) list = list.filter((t) => t.approaches.some((a) => a.toLowerCase().includes(String(approach).toLowerCase())));
  if (q) {
    const s = String(q).toLowerCase();
    list = list.filter((t) => `${t.name} ${t.university} ${t.approaches.join(' ')} ${t.description}`.toLowerCase().includes(s));
  }
  res.json(list);
}));

publicRouter.get('/therapists/:id', wrap((req, res) => {
  const t = get('SELECT * FROM therapists WHERE id = ? AND active = 1', req.params.id);
  if (!t) return res.status(404).json({ error: 'Terapeuta no encontrado' });
  const upcoming = all(
    `SELECT a.date, a.start, a.end FROM appointments a WHERE a.therapist_id = ? AND a.date >= ? AND a.status IN ('pendiente','confirmada') ORDER BY a.date, a.start LIMIT 40`,
    t.id, todayISO());
  res.json({ ...therapistPublic(t), upcoming });
}));

publicRouter.get('/slots', wrap((req, res) => {
  const { therapistId, date } = req.query;
  if (!therapistId || !date) return res.status(400).json({ error: 'Faltan parámetros' });
  if (date < todayISO()) return res.json({ date, slots: [] });
  res.json({ date, slots: slotsForDate(therapistId, date) });
}));

publicRouter.get('/calendar', wrap((req, res) => {
  const { therapistId } = req.query;
  const cfg = settings().booking;
  const out = [];
  let d = todayISO();
  for (let i = 0; i < Number(cfg.maxAdvanceDays || 45); i++) {
    const slots = slotsForDate(therapistId, d);
    const available = slots.filter((s) => s.available).length;
    if (slots.length) out.push({ date: d, total: slots.length, available });
    d = addDays(d, 1);
  }
  res.json(out);
}));

publicRouter.post('/survey', wrap((req, res) => {
  const { answers, serviceType = 'individual' } = req.body || {};
  const invalid = validateAnswers(answers);
  if (invalid) return res.status(400).json({ error: invalid });
  const { score, declared } = computeSurvey(answers);
  const tier = tierForScore(score, String(serviceType));
  res.json({
    score, declared,
    tier: { code: tier.code, name: tier.name, price: tier.price, description: tier.description, color: tier.color },
    ladder: tiers(true).map((t) => ({ code: t.code, name: t.name, price: t.price, active: t.code === tier.code })),
  });
}));

publicRouter.post('/bookings', wrap(async (req, res) => {
  const b = req.body || {};
  const required = ['therapistId', 'date', 'start', 'name', 'email', 'phone'];
  for (const k of required) if (!b[k]) return res.status(400).json({ error: `Campo obligatorio: ${k}` });
  const therapist = get('SELECT * FROM therapists WHERE id = ? AND active = 1', b.therapistId);
  if (!therapist) return res.status(404).json({ error: 'Terapeuta no disponible' });

  const slots = slotsForDate(b.therapistId, b.date);
  const slot = slots.find((s) => s.start === b.start && s.available);
  if (!slot) return res.status(409).json({ error: 'Ese horario ya no está disponible. Elige otro.' });

  let survey = null;
  if (b.answers) {
    const invalid = validateAnswers(b.answers);
    if (invalid) return res.status(400).json({ error: invalid });
    const { score } = computeSurvey(b.answers);
    const reasonText = String(b.reason || '').toLowerCase();
    const serviceType = (reasonText.includes('pareja') || reasonText.includes('relación') || reasonText.includes('interpersonal') || reasonText.includes('ruptura') || b.serviceType === 'pareja') ? 'pareja' : 'individual';
    const tier = tierForScore(score, serviceType);
    survey = { answers: b.answers, score, tier, declared: b.answers.declared, serviceType };
  }

  const email = String(b.email).trim().toLowerCase();
  let patient = get('SELECT * FROM patients WHERE lower(email) = ?', email);
  if (!patient) {
    const id = uid('pat_');
    insert('patients', {
      id, user_id: null, name: b.name.trim(), email, phone: b.phone, gender: b.gender || null,
      birthdate: b.birthdate || null, university: b.university || null, career: b.career || null,
      semester: b.semester || null, city: b.city || null, referred_by: b.referredBy || 'Reserva en línea',
      notes: null, tags: JSON.stringify([]), tier_code: survey?.tier.code || 'E',
      status: 'pendiente',
      assigned_price: survey?.tier.price || therapist.price_base, status: 'activo', risk: 'bajo',
      created_at: nowISO(),
    });
    patient = get('SELECT * FROM patients WHERE id = ?', id);
  } else {
    run(`UPDATE patients SET phone = COALESCE(?, phone), university = COALESCE(?, university), career = COALESCE(?, career) WHERE id = ?`,
      b.phone || null, b.university || null, b.career || null, patient.id);
  }

  if (survey) {
    insert('surveys', {
      id: uid('svy_'), patient_id: patient.id, answers: JSON.stringify(survey.answers), score: survey.score,
      tier_code: survey.tier.code, suggested_price: survey.tier.price, declared_price: survey.declared, created_at: nowISO(),
    });
    run('UPDATE patients SET tier_code = ?, assigned_price = ? WHERE id = ?', survey.tier.code, survey.tier.price, patient.id);
  }

  let price = Number(b.price || patient.assigned_price || survey?.tier.price || therapist.price_base);
  const modalityFinal = b.modality === 'virtual' ? 'virtual' : 'presencial';
  if (modalityFinal === 'presencial' && price < 10) price = 10;
  if (modalityFinal === 'virtual' && price < 7) price = 7;
  const code = bookingCode();
  const id = uid('apt_');
  insert('appointments', {
    id, code, patient_id: patient.id, therapist_id: therapist.id, date: b.date, start: slot.start, end: slot.end,
    modality: b.modality === 'virtual' ? 'virtual' : 'presencial', status: settings().booking.autoConfirm ? 'confirmada' : 'pendiente',
    price, payment_status: 'pendiente', reason: b.reason || null, notes: b.notes || null,
    created_by: 'publico', created_at: nowISO(), updated_at: nowISO(),
  });

  if (b.password) {
    const existing = get('SELECT id FROM users WHERE email = ?', email);
    if (!existing) {
      const userId = uid('usr_');
      insert('users', {
        id: userId, email, password_hash: hashPassword(b.password), role: 'paciente', name: b.name.trim(),
        phone: b.phone, active: 1, created_at: nowISO(),
      });
      run('UPDATE patients SET user_id = ? WHERE id = ?', userId, patient.id);
    }
  }

  notify({
    userId: 'usr_admin', audience: 'admin', title: 'Nueva cita reservada',
    body: `${b.name} reservó con ${therapist.name} el ${b.date} a las ${slot.start}.`,
    kind: 'success', link: '/admin/citas',
  });

  try {
    await sendMail({
      to: patient.email,
      subject: `Cita confirmada — ${therapist.name} · ${b.date} ${slot.start}`,
      html: `<p>Hola <b>${String(patient.name || b.name || '')}</b>,</p><p>Tu cita con <b>${therapist.name}</b> está confirmada para el <b>${b.date} a las ${slot.start}</b>.</p><p>Modalidad: <b>${modalityFinal}</b> · Código: <b>${code}</b></p>`,
      text: `Tu cita con ${therapist.name} está confirmada para ${b.date} a las ${slot.start}. Código: ${code}`
    });
  } catch (e) { /* silencioso */ }

  try {
    await sendMail({
      to: 'psicoeducativobienestar@gmail.com',
      subject: `Psyconova · Nueva cita · ${String(patient.name || b.name || '')}`,
      html: `<p><b>${String(patient.name || b.name || '')}</b> reservó con <b>${therapist.name}</b>.</p><p>Fecha: <b>${b.date} ${slot.start}</b> · Modalidad: <b>${modalityFinal}</b> · Código: <b>${code}</b></p><p>Correo: ${patient.email} · Teléfono: ${b.phone || '-'}</p>`
    });
  } catch (e) { /* silencioso */ }

  res.status(201).json({
    appointment: appointmentFull(id),
    code,
    bank: settings().bank,
    price,
    requiresPayment: true,
    message: 'Reserva creada. Transfiere y sube tu comprobante para confirmarla.',
  });
}));

publicRouter.get('/bookings/:code', wrap((req, res) => {
  const appt = get(
    `SELECT a.*, p.name AS patient_name, p.email AS patient_email, t.name AS therapist_name, t.photo AS therapist_photo, t.approaches
       FROM appointments a JOIN patients p ON p.id = a.patient_id JOIN therapists t ON t.id = a.therapist_id
      WHERE a.code = ?`, String(req.params.code).toUpperCase());
  if (!appt) return res.status(404).json({ error: 'No encontramos esa reserva. Verifica el código.' });
  const payments = all('SELECT id, amount, status, created_at, receipt FROM payments WHERE appointment_id = ? ORDER BY created_at DESC', appt.id);
  res.json({ appointment: appt, payments, bank: settings().bank });
}));

function saveDataUrl(dataUrl, prefix = 'file') {
  const m = /^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/s.exec(String(dataUrl || ''));
  if (!m) return null;
  const mime = m[1];
  const ext = mime.includes('pdf') ? 'pdf' : mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  if (!/^image\//.test(mime) && !/pdf/.test(mime)) return null;
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 7 * 1024 * 1024) throw new Error('El archivo supera los 7 MB');
  const name = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  return `/uploads/${name}`;
}
export { saveDataUrl };

publicRouter.post('/bookings/:code/receipt', wrap((req, res) => {
  const appt = get('SELECT * FROM appointments WHERE code = ?', String(req.params.code).toUpperCase());
  if (!appt) return res.status(404).json({ error: 'Reserva no encontrada' });
  const url = saveDataUrl(req.body?.dataUrl, 'recibo');
  if (!url) return res.status(400).json({ error: 'Adjunta una imagen o PDF válido del comprobante' });
  const pending = get(`SELECT * FROM payments WHERE appointment_id = ? AND status = 'en_revision'`, appt.id);
  if (pending) {
    run('UPDATE payments SET receipt = ?, reference = COALESCE(?, reference), created_at = ? WHERE id = ?', url, req.body?.reference || null, nowISO(), pending.id);
  } else {
    insert('payments', {
      id: uid('pay_'), appointment_id: appt.id, patient_id: appt.patient_id, amount: appt.price,
      method: 'transferencia', reference: req.body?.reference || null, receipt: url, status: 'en_revision',
      note: null, created_at: nowISO(),
    });
  }
  run(`UPDATE appointments SET payment_status = 'en_revision', updated_at = ? WHERE id = ?`, nowISO(), appt.id);
  notify({
    userId: 'usr_admin', audience: 'admin', title: 'Nuevo comprobante por validar',
    body: `Reserva ${appt.code} · ${req.body?.reference || 'sin referencia'}`, kind: 'warning', link: '/admin/pagos',
  });
  res.json({ ok: true, receipt: url, message: 'Comprobante recibido. Administración lo validará en las próximas horas.' });
}));

publicRouter.post('/applications', wrap(async (req, res) => {
  const b = req.body || {};
  for (const k of ['name', 'email', 'phone', 'university', 'degree', 'description']) {
    if (!String(b[k] || '').trim()) return res.status(400).json({ error: 'Completa todos los campos obligatorios' });
  }
  const email = String(b.email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Ingresa un correo válido' });
  if (get('SELECT id FROM users WHERE lower(email) = ?', email)) return res.status(409).json({ error: 'Ya existe una cuenta con ese correo. Escríbenos para vincularte.' });
  if (get(`SELECT id FROM applications WHERE lower(email) = ? AND status = 'pendiente'`, email)) {
    return res.status(409).json({ error: 'Ya tienes una solicitud en revisión. Te contactaremos pronto.' });
  }
  let photo = null;
  if (b.photo) {
    try { photo = saveDataUrl(b.photo, 'profesional'); }
    catch (e) { return res.status(400).json({ error: e.message }); }
  }
  const id = uid('app_');
  if (!photo) return res.status(400).json({ error: 'Sube tu foto de perfil para completar la solicitud' });
  const approaches = Array.isArray(b.approaches)
    ? b.approaches
    : String(b.approaches || '').split(',').map((s) => s.trim()).filter(Boolean);
  insert('applications', {
    id, name: String(b.name).trim(), email, phone: b.phone || null, gender: b.gender || null,
    birthdate: b.birthdate || null, university: b.university || null, degree: b.degree || null,
    license: b.license || null, years: Number(b.years || 0), approaches: JSON.stringify(approaches),
    modality: b.modality || 'ambas', description: b.description || null, photo,
    status: 'pendiente', note: null, therapist_id: null, reviewed_by: null, reviewed_at: null, created_at: nowISO(),
  });
  notify({
    userId: 'usr_admin', audience: 'admin', title: 'Nueva solicitud de profesional',
    body: `${b.name} · ${b.degree || ''} · ${b.university || ''}`, kind: 'info', link: '/admin/solicitudes',
  });
  try { await sendMail({ to: 'psicoeducativobienestar@gmail.com', from: 'psicoeducativobienestar@gmail.com', subject: 'Psyconova · Nueva solicitud profesional', html: `<p><b>Solicitud profesional recibida</b></p><p>Solicitante: <b>${b.name}</b> · <b>${email}</b> · ${b.phone || '-'}</p><p>Universidad: ${b.university || '-'} · Título: ${b.degree || '-'} · Registro: ${b.license || '-'} · ${b.years || 0} años</p><p>Enfoques: ${approaches.join(', ')}</p><p>Revise y apruebe o rechace en el panel de administración.</p>` }); } catch {}
  try { await sendMail({ to: email, from: 'psicoeducativobienestar@gmail.com', subject: 'Psyconova · Recibimos su solicitud profesional', html: `<p>Estimado/a <b>${b.name}</b>,</p><p>Le saludamos de manera cordial desde <b>Psyconova · Bienestar Psicológico</b>.</p><p>Gracias por enviar su perfil profesional. <b>Su solicitud fue recibida correctamente</b> y se encuentra en la etapa de revisión por parte de la administración, quien verificará su título profesional, su registro y su enfoque de trabajo.</p><p>En caso de que usted sea <b>seleccionado/a</b>, nos comunicaremos con usted de manera directa por este mismo correo o por WhatsApp para informarle los siguientes pasos: la creación de su acceso al panel de terapeuta, la asignación de agenda y las condiciones de la tarifa social vigente.</p><p>Le ocasiones que no aceptamos a todos los postulantes: su perfil se publica en el sitio web únicamente si es aprobado por la administración.</p><p>Si requiere actualizar su información, puede responder a este correo o escribir a <b>psicoeducativobienestar@gmail.com</b>.</p><p>Atentamente,<br/><b>Equipo Psyconova · Bienestar Psicológico</b><br/>Av. Universitaria, Campus Norte · Quito<br/>Horario de atención: Lunes a Viernes 8:00–20:00 · Sábado 09:00–13:00</p>` }); } catch {}
  res.status(201).json({ ok: true, message: 'Recibimos tu solicitud. El equipo revisará tu perfil y te contactará por correo o WhatsApp.' });
}));

publicRouter.post('/contact', wrap((req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) return res.status(400).json({ error: 'Completa todos los campos' });
  insert('notifications', {
    id: uid('ntf_'), user_id: 'usr_admin', audience: 'admin', title: `Mensaje de ${name}`,
    body: `${email} · ${message}`, kind: 'info', link: '/admin', read: 0, created_at: nowISO(),
  });
  res.json({ ok: true, message: 'Mensaje enviado. Te responderemos en menos de 48 horas.' });
}));
