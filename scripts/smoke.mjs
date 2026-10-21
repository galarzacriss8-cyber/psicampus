const BASE = process.env.BASE || 'http://localhost:4321';
let failures = 0;
const results = [];

async function api(path, { method = 'GET', token, body, raw } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 200)}`);
  return data;
}

function check(name, cond, extra = '') {
  results.push({ name, ok: !!cond, extra });
  if (!cond) failures++;
  console.log(`${cond ? '✓' : '✗'} ${name}${extra ? ' · ' + extra : ''}`);
}

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const run = async () => {
  const boot = await api('/api/public/bootstrap');
  check('bootstrap settings', boot.settings?.brand?.name === 'Psicampus');
  check('6 terapeutas', boot.therapists.length === 6);
  check('terapeuta con foto', boot.therapists.some((t) => t.photo?.includes('camila')));
  check('approaches es array', Array.isArray(boot.therapists[0].approaches));

  const admin = await api('/api/auth/login', { method: 'POST', body: { email: 'Admin12', password: 'AmieteCrisstequiero1' } });
  check('login admin', admin.token && admin.user.role === 'admin');

  const overview = await api('/api/admin/overview', { token: admin.token });
  check('overview kpis', overview.kpis && overview.series.length === 6, `ingresos mes $${overview.kpis.incomeMonth}`);
  check('overview citas hoy', Array.isArray(overview.today), `${overview.today.length} hoy`);

  const patients = await api('/api/admin/patients', { token: admin.token });
  check('pacientes con frecuencia', patients.length >= 20 && patients[0].frequency?.type, `${patients.length} pacientes`);
  const inactivos = patients.filter((p) => p.frequency.type === 'inactivo' || p.frequency.type === 'ocasional').length;
  check('clasificación de frecuencia', inactivos > 0, `${inactivos} no frecuentes`);

  const agenda = await api('/api/admin/agenda?from=' + new Date().toISOString().slice(0, 10), { token: admin.token });
  check('agenda', agenda.appointments.length > 0 && agenda.capacity > 0, `${agenda.appointments.length} citas / ${agenda.capacity} cupos`);

  const payments = await api('/api/admin/payments?status=en_revision', { token: admin.token });
  check('pagos en revisión', payments.length > 0, `${payments.length}`);

  const accounting = await api('/api/admin/accounting', { token: admin.token });
  check('contabilidad', accounting.income >= 0 && Array.isArray(accounting.incomeRows), `$${accounting.income} / $${accounting.expenses}`);

  const cfg = await api('/api/admin/settings', { token: admin.token });
  check('configuración editable', cfg.settings.content.heroTitle.length > 0);

  // Public booking flow
  const therapies = await api('/api/public/therapists');
  const therapist = therapies[0];
  const day = new Date(); day.setDate(day.getDate() + 3);
  let date = day.toISOString().slice(0, 10);
  let slots = [];
  for (let i = 0; i < 8 && !slots.some((s) => s.available); i++) {
    const r = await api(`/api/public/slots?therapistId=${therapist.id}&date=${date}`);
    slots = r.slots;
    if (!slots.some((s) => s.available)) { day.setDate(day.getDate() + 1); date = day.toISOString().slice(0, 10); }
  }
  const slot = slots.find((s) => s.available);
  check('slots disponibles', !!slot, `${date} ${slot?.start}`);

  const survey = await api('/api/public/survey', {
    method: 'POST',
    body: { answers: { income_source: 'family', personal_income: '0', family_income: '1', dependents: '1', scholarship: 'partial', work_hours: '0', expenses: 'low', emergency: 'no', declared: 7 } },
  });
  check('encuesta calcula tarifa', survey.tier.price >= 5 && survey.tier.price <= 40, `$${survey.tier.price} (score ${survey.score})`);

  const booking = await api('/api/public/bookings', {
    method: 'POST',
    body: {
      therapistId: therapist.id, date, start: slot.start, modality: 'presencial',
      name: 'Paciente Prueba', email: 'prueba.smoke@universidad.edu.ec', phone: '+593 99 555 1122',
      university: 'Universidad Central del Ecuador', career: 'Sociología', answers: survey ? JSON.parse(JSON.stringify({
        income_source: 'family', personal_income: '0', family_income: '1', dependents: '1', scholarship: 'partial', work_hours: '0', expenses: 'low', emergency: 'no', declared: 7,
      })) : undefined, password: 'Prueba1234!',
    },
  });
  check('reserva pública', !!booking.code, booking.code);

  const receipt = await api(`/api/public/bookings/${booking.code}/receipt`, { method: 'POST', body: { dataUrl: PNG, reference: 'TRF-TEST' } });
  check('subir comprobante', receipt.ok === true);

  const track = await api(`/api/public/bookings/${booking.code}`);
  check('seguimiento por código', track.appointment.code === booking.code && track.payments.length === 1);

  const loginP = await api('/api/auth/login', { method: 'POST', body: { email: 'prueba.smoke@universidad.edu.ec', password: 'Prueba1234!' } });
  check('cuenta creada al reservar', !!loginP.token && loginP.patientId);
  const patientOverview = await api('/api/patient/overview', { token: loginP.token });
  check('portal paciente', patientOverview.upcoming.length === 1, patientOverview.next?.code);

  const pending = await api('/api/admin/payments?status=en_revision', { token: admin.token });
  const target = pending.find((p) => p.code === booking.code);
  check('comprobante visible al admin', !!target);
  await api(`/api/admin/payments/${target.id}`, { method: 'PATCH', token: admin.token, body: { action: 'verify' } });
  const after = await api(`/api/patient/appointments`, { token: loginP.token });
  check('pago validado', after.find((a) => a.code === booking.code)?.payment_status === 'pagado');

  const loginT = await api('/api/auth/login', { method: 'POST', body: { email: 'camila@psicampus.ec', password: 'Demo1234!' } });
  check('login terapeuta', !!loginT.token && loginT.therapistId === 'thr_camila');
  const tOverview = await api('/api/therapist/overview', { token: loginT.token });
  check('panel terapeuta', tOverview.therapist.name === 'Camila Herrera' && tOverview.patients.length > 0, `${tOverview.patients.length} pacientes`);

  // Cleanup the smoke-test booking
  await api(`/api/admin/appointments/${booking.appointment.id}`, { method: 'DELETE', token: admin.token });

  console.log(`\n${failures === 0 ? 'TODO OK' : failures + ' FALLOS'} · ${results.length} pruebas`);
  process.exit(failures === 0 ? 0 : 1);
};

run().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
