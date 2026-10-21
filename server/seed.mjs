import { hashPassword } from './auth.mjs';
import { db, get, insert, isSeeded, run, setSetting, ensureTiers, tiers, all } from './db.mjs';
import { DEFAULT_SETTINGS, DEFAULT_TIERS } from './defaults.mjs';
import { computeSurvey } from './survey.mjs';
import { addDays, bookingCode, minutes, todayISO, toTime, uid, weekdayOf } from './util.mjs';

let seedState = 20261018;
const rnd = () => {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
};
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const chance = (p) => rnd() < p;

const PASSWORD = 'Demo1234!';
const ADMIN_USER = process.env.ADMIN_USER || 'Admin12';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AmieteCrisstequiero1';

const THERAPISTS = [
  {
    id: 'thr_daniela', name: 'Daniela Paredes', gender: 'femenino', birthdate: '1990-07-21',
    university: 'Universidad de Cuenca', degree: 'Mgs. en Terapia Sistémica Familiar',
    approaches: ['Terapia sistémica', 'Terapia familiar', 'Perspectiva de género'],
    description: 'Acompaño a familias y parejas universitarias en procesos de comunicación, límites y crianza. Creo que el malestar también se entiende mirando los vínculos que nos sostienen.',
    photo: '/img/team/daniela.svg', price_base: 30, modality: 'ambas', license: 'MSP-16790', room: 'Consultorio 2 · Campus Sur', years: 12, featured: 0,
  },
  {
    id: 'thr_andres', name: 'Andrés Molina', gender: 'masculino', birthdate: '1997-01-09',
    university: 'Universidad Estatal de Guayaquil', degree: 'Psicólogo Clínico',
    approaches: ['Terapia psicodinámica', 'Psicoanálisis contemporáneo'],
    description: 'Escucho y acompaño procesos de ansiedad, angustia y conflictos vinculares. Trabajo con una mirada psicodinámica para comprender lo que subyace y abrir nuevas formas de estar con los demás.',
    photo: '/img/team/andres.svg', price_base: 20, modality: 'virtual', license: 'MSP-22310', room: 'Virtual', years: 5, featured: 0,
  },
  {
    id: 'thr_valentina', name: 'Valentina Ríos', gender: 'femenino', birthdate: '1987-09-30',
    university: 'Universidad San Francisco de Quito', degree: 'Dra. en Psicología Clínica · Especialista en Trauma',
    approaches: ['EMDR', 'Trauma informado', 'Terapia cognitivo-conductual'],
    description: 'Especialista en trauma, duelo y estrés postraumático, con formación EMDR. Acompaño procesos de recuperación a un ritmo seguro, respetando la historia y los recursos de cada persona.',
    photo: '/img/team/valentina.svg', price_base: 40, modality: 'ambas', license: 'MSP-14902', room: 'Consultorio 4 · Campus Norte', years: 15, featured: 0,
  },
  {
    id: 'thr_sebastian', name: 'Sebastián Cruz', gender: 'masculino', birthdate: '1995-05-18',
    university: 'Universidad Técnica Particular de Loja', degree: 'Psicólogo Educativo',
    approaches: ['Orientación vocacional', 'Terapia breve', 'Coaching académico'],
    description: 'Acompaño decisiones vocacionales, hábitos de estudio y bloqueo académico. Mi objetivo es que encuentres un proyecto de estudios que tenga sentido para ti y sea sostenible.',
    photo: '/img/team/sebastian.svg', price_base: 15, modality: 'ambas', license: 'MSP-19874', room: 'Consultorio 5 · Campus Sur', years: 6, featured: 0,
  },
];

const PATIENTS = [
  ['Sofía Morales', 'femenino', '2003-04-12', 'Universidad Central del Ecuador', 'Arquitectura', '6.º semestre', 'Quito'],
  ['Diego Andrade', 'masculino', '2000-08-22', 'Escuela Politécnica Nacional', 'Ingeniería Mecánica', '8.º semestre', 'Quito'],
  ['Karla Vinueza', 'femenino', '2002-01-30', 'Universidad Central del Ecuador', 'Psicología', '4.º semestre', 'Quito'],
  ['Mateo Cevallos', 'masculino', '1999-11-05', 'Pontificia Universidad Católica del Ecuador', 'Derecho', '7.º semestre', 'Quito'],
  ['Anahí Torres', 'femenino', '2004-06-17', 'Universidad San Francisco de Quito', 'Medicina', '3.º semestre', 'Cumbayá'],
  ['Joaquín Erazo', 'masculino', '2001-03-09', 'Universidad de las Américas', 'Diseño Gráfico', '5.º semestre', 'Quito'],
  ['Camila Ordóñez', 'femenino', '2003-09-14', 'Universidad Central del Ecuador', 'Comunicación Social', '4.º semestre', 'Quito'],
  ['Sebastián Guamán', 'masculino', '2002-12-01', 'Universidad de las Fuerzas Armadas ESPE', 'Ingeniería de Software', '6.º semestre', 'Sangolquí'],
  ['Doménica Salas', 'femenino', '2000-07-25', 'Pontificia Universidad Católica del Ecuador', 'Administración', '8.º semestre', 'Quito'],
  ['Nicolás Villamar', 'masculino', '2004-02-19', 'Escuela Politécnica Nacional', 'Ingeniería Civil', '2.º semestre', 'Quito'],
  ['Valentina Ponce', 'femenino', '2001-10-08', 'Universidad San Francisco de Quito', 'Psicología', '6.º semestre', 'Quito'],
  ['Alejandro Cárdenas', 'masculino', '1998-05-16', 'Universidad Central del Ecuador', 'Economía', '9.º semestre', 'Quito'],
  ['María José Herrera', 'femenino', '2003-11-27', 'Universidad Técnica de Ambato', 'Enfermería', '5.º semestre', 'Ambato'],
  ['Andrés Bedón', 'masculino', '2002-04-03', 'Universidad UTE', 'Contabilidad', '4.º semestre', 'Quito'],
  ['Paula Chávez', 'femenino', '2005-01-21', 'Pontificia Universidad Católica del Ecuador', 'Biología', '1.º semestre', 'Quito'],
  ['Esteban Yánez', 'masculino', '1999-09-11', 'Escuela Politécnica Nacional', 'Ingeniería Electrónica', '7.º semestre', 'Quito'],
  ['Daniela Quishpe', 'femenino', '2001-06-06', 'Universidad Central del Ecuador', 'Trabajo Social', '6.º semestre', 'Quito'],
  ['Felipe Moreira', 'masculino', '1997-03-28', 'Universidad San Francisco de Quito', 'Medicina', '10.º semestre', 'Quito'],
  ['Isabella Ruiz', 'femenino', '2003-08-15', 'Universidad de las Américas', 'Medicina Veterinaria', '4.º semestre', 'Quito'],
  ['Martín Alvarado', 'masculino', '2000-12-09', 'Pontificia Universidad Católica del Ecuador', 'Filosofía', '8.º semestre', 'Quito'],
  ['Renata Espinosa', 'femenino', '2002-05-02', 'Universidad Central del Ecuador', 'Artes Plásticas', '5.º semestre', 'Quito'],
  ['Tomás Hidalgo', 'masculino', '2004-07-19', 'Universidad de las Fuerzas Armadas ESPE', 'Mecatrónica', '2.º semestre', 'Sangolquí'],
  ['Antonella Vega', 'femenino', '2001-02-23', 'Universidad San Francisco de Quito', 'Comercio Internacional', '7.º semestre', 'Quito'],
  ['Cristian Pilco', 'masculino', '2003-10-30', 'Universidad UTE', 'Turismo', '3.º semestre', 'Quito'],
  ['Emilia Santamaría', 'femenino', '1996-04-05', 'Pontificia Universidad Católica del Ecuador', 'Docente de Literatura', 'Docente', 'Quito'],
  ['Jorge Zambrano', 'masculino', '1990-01-17', 'Universidad Central del Ecuador', 'Docente de Ingeniería', 'Docente', 'Quito'],
];

const REASONS = [
  'Ansiedad académica y ataques de pánico', 'Estrés por tesis y presión familiar', 'Duelo por pérdida de un familiar',
  'Dificultades en relaciones interpersonales', 'Autoestima y autoconcepto', 'Orientación vocacional',
  'Insomnio y manejo del tiempo', 'Conflicto familiar', 'Ruptura de pareja', 'Sobrecarga laboral y burnout',
  'Miedo a hablar en público', 'Procrastinación y bloqueo académico',
];

const EXPENSE_SEED = [
  ['Alquiler de consultorios', 260, 'Alquiler'], ['Servicios básicos del campus', 48, 'Servicios'],
  ['Internet fibra óptica', 32, 'Servicios'], ['Plataforma y software clínico', 22, 'Tecnología'],
  ['Publicidad en redes sociales', 40, 'Marketing'], ['Materiales terapéuticos', 30, 'Materiales'],
  ['Supervisión clínica', 80, 'Capacitación'], ['Limpieza y mantenimiento', 35, 'Servicios'],
];

function insertAppointment({ patientId, therapistId, date, start, modality, status, price, paymentStatus, reason, createdBy = 'seed' }) {
  const duration = 50;
  const end = toTime(minutes(start) + duration);
  const busy = get(`SELECT id FROM appointments WHERE therapist_id = ? AND date = ? AND start = ?`, therapistId, date, start);
  if (busy) return null;
  const id = uid('apt_');
  const code = bookingCode();
  insert('appointments', {
    id, code, patient_id: patientId, therapist_id: therapistId, date, start, end,
    modality, status, price, payment_status: paymentStatus, reason: reason || null,
    notes: null, created_by: createdBy, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });
  return { id, code, date, start, end, price };
}

function addPayment({ appointment, patientId, status, daysAgo = 0 }) {
  insert('payments', {
    id: uid('pay_'), appointment_id: appointment.id, patient_id: patientId, amount: appointment.price,
    method: 'transferencia', reference: 'TRF-' + int(100000, 999999),
    receipt: status === 'pendiente' ? null : '/img/comprobante-demo.svg',
    status, note: null, verified_by: status === 'verificado' ? 'usr_admin' : null,
    created_at: new Date(Date.now() - daysAgo * 864e5).toISOString(),
    verified_at: status === 'verificado' ? new Date(Date.now() - daysAgo * 864e5 + 36e5).toISOString() : null,
  });
}

export function seedDatabase({ force = false, demo = false } = {}) {
  if (isSeeded() && !force) return { skipped: true };
  seedState = 20261018;
  const tables = ['applications', 'session_notes', 'audit', 'notifications', 'surveys', 'payments', 'appointments', 'expenses', 'exceptions', 'availability', 'patients', 'therapists', 'users', 'settings', 'tiers'];
  db.exec('PRAGMA foreign_keys = OFF;');
  for (const t of tables) db.exec(`DELETE FROM ${t};`);
  db.exec('PRAGMA foreign_keys = ON;');

  for (const k of Object.keys(DEFAULT_SETTINGS)) setSetting(k, DEFAULT_SETTINGS[k]);
  for (const t of DEFAULT_TIERS) insert('tiers', { ...t, active: 1 });

  const adminHash = hashPassword(ADMIN_PASSWORD);
  const demoHash = hashPassword(PASSWORD);
  insert('users', {
    id: 'usr_admin', email: ADMIN_USER, password_hash: adminHash, role: 'admin',
    name: 'Psyconova', phone: '983465028', active: 1, created_at: new Date().toISOString(),
  });

  const tierList = tiers(true);
  const now = new Date();

  // Therapists + user accounts
  for (const t of THERAPISTS) {
    insert('therapists', {
      id: t.id, user_id: 'usr_' + t.id.slice(4), name: t.name, gender: t.gender, birthdate: t.birthdate,
      university: t.university, degree: t.degree, approaches: JSON.stringify(t.approaches),
      description: t.description, photo: t.photo, price_base: t.price_base, modality: t.modality,
      languages: 'Español · Inglés', license: t.license, room: t.room, years: t.years,
      active: 1, featured: t.featured, created_at: new Date().toISOString(),
    });
    insert('users', {
      id: 'usr_' + t.id.slice(4), email: t.name.split(' ')[0].toLowerCase() + '@psicampus.ec',
      password_hash: demoHash, role: 'terapeuta', name: t.name, phone: '+593 99 000 ' + int(1000, 9999),
      active: 1, created_at: new Date().toISOString(),
    });
    // Weekly availability
    const weekdays = t.id === 'thr_daniela' ? [2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
    for (const wd of weekdays) {
      insert('availability', {
        id: uid('avl_'), therapist_id: t.id, weekday: wd, start: '08:00', end: '12:00',
        slot_minutes: 50, modality: 'ambas', room: t.room, active: 1,
      });
      insert('availability', {
        id: uid('avl_'), therapist_id: t.id, weekday: wd, start: '14:00', end: '18:30',
        slot_minutes: 50, modality: 'ambas', room: t.room, active: 1,
      });
    }
  }

  // Datos reales base: terapeutas, disponibilidad, tarifas, configuración y admin.
  // Los datos clínicos de demostración (pacientes, citas, pagos) solo con `demo: true`.
  let patientRecords = [];
  let appointmentCount = 0;
  if (demo) {
  // Solicitudes de profesionales (para revisar en administración)
  const APPLICATIONS = [
    {
      name: 'Verónica Salcedo', email: 'veronica.salcedo@psicologia.ec', phone: '+593 98 441 2200',
      gender: 'femenino', birthdate: '1991-02-11', university: 'Universidad de Guayaquil',
      degree: 'Mgs. en Psicología Clínica', license: 'MSP-24510', years: 9,
      approaches: ['Terapia cognitivo-conductual', 'Trauma informado', 'Terapia breve'],
      modality: 'ambas',
      description: 'Trabajo con ansiedad, trauma y estrés académico desde hace nueve años. Me interesa integrarme a un programa con tarifa social y supervisión continua.',
      status: 'pendiente', daysAgo: 2,
    },
    {
      name: 'Esteban Cabrera', email: 'esteban.cabrera@psicologia.ec', phone: '+593 99 730 1188',
      gender: 'masculino', birthdate: '1997-06-24', university: 'Universidad Central del Ecuador',
      degree: 'Psicólogo Clínico', license: 'MSP-30112', years: 4,
      approaches: ['Terapia de aceptación y compromiso', 'Mindfulness', 'Psicología del deporte'],
      modality: 'virtual',
      description: 'Acompaño a estudiantes con ansiedad, procrastinación y rendimiento deportivo. Busco un espacio para crecer en clínica universitaria.',
      status: 'pendiente', daysAgo: 5,
    },
    {
      name: 'Gabriela Núñez', email: 'gabriela.nunez@psicologia.ec', phone: '+593 96 215 7744',
      gender: 'femenino', birthdate: '1988-10-03', university: 'Pontificia Universidad Católica del Ecuador',
      degree: 'Mgs. en Terapia Familiar', license: 'MSP-19880', years: 12,
      approaches: ['Terapia sistémica', 'Terapia familiar'],
      modality: 'presencial',
      description: 'Terapeuta familiar con experiencia en procesos de duelo y comunicación.',
      status: 'rechazada', daysAgo: 24, note: 'Sin cupos disponibles para el semestre actual. Se sugiere volver a postular en el próximo periodo.',
    },
  ];
  for (const a of APPLICATIONS) {
    insert('applications', {
      id: uid('app_'), name: a.name, email: a.email, phone: a.phone, gender: a.gender,
      birthdate: a.birthdate, university: a.university, degree: a.degree, license: a.license,
      years: a.years, approaches: JSON.stringify(a.approaches), modality: a.modality,
      description: a.description, photo: null, status: a.status, note: a.note || null,
      therapist_id: null, reviewed_by: a.status === 'pendiente' ? null : 'usr_admin',
      reviewed_at: a.status === 'pendiente' ? null : new Date(Date.now() - a.daysAgo * 864e5).toISOString(),
      created_at: new Date(Date.now() - a.daysAgo * 864e5).toISOString(),
    });
  }

  // Patients
  PATIENTS.forEach((p, i) => {
    const [name, gender, birthdate, university, career, semester, city] = p;
    const id = `pat_${String(i + 1).padStart(3, '0')}`;
    const email = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z ]/g, '').split(' ').slice(0, 2).join('.') + '@universidad.edu.ec';
    const answers = {
      income_source: pick(['family', 'family', 'scholarship', 'parttime', 'mixed', 'work']),
      personal_income: pick(['0', '0', '1', '2', '3', '4']),
      family_income: pick(['0', '1', '1', '2', '3', '3', '4']),
      dependents: pick(['0', '1', '1', '2', '3']),
      scholarship: pick(['full', 'partial', 'none', 'none']),
      work_hours: pick(['0', '0', '1', '2']),
      expenses: pick(['low', 'mid', 'mid', 'high']),
      emergency: pick(['no', 'no', 'some', 'yes']),
      declared: pick([5, 7, 7, 10, 10, 15, 20, 20, 25, 30, 40]),
    };
    const { score } = computeSurvey(answers);
    const tier = tierList.find((t) => score >= t.min_score && score <= t.max_score) || tierList[4];
    const tags = [];
    if (i % 5 === 0) tags.push('seguimiento');
    if (i % 7 === 0) tags.push('beca');
    insert('patients', {
      id, user_id: i < 12 ? 'usr_' + id : null, name, email, phone: '+593 9' + int(10000000, 99999999),
      gender, birthdate, university, career, semester, city, referred_by: pick(['Bienestar estudiantil', 'Instagram', 'Recomendación', 'Feria de salud', null]),
      notes: null, tags: JSON.stringify(tags), tier_code: tier.code, assigned_price: tier.price,
      status: 'activo', risk: 'bajo', created_at: new Date(Date.now() - int(60, 200) * 864e5).toISOString(),
    });
    if (i < 12) {
      insert('users', {
        id: 'usr_' + id, email, password_hash: demoHash, role: 'paciente', name,
        phone: '+593 9' + int(10000000, 99999999), active: 1, created_at: new Date().toISOString(),
      });
    }
    const createdAt = new Date(Date.now() - int(3, 30) * 864e5).toISOString();
    insert('surveys', {
      id: uid('svy_'), patient_id: id, answers: JSON.stringify(answers), score,
      tier_code: tier.code, suggested_price: tier.price, declared_price: answers.declared, created_at: createdAt,
    });
    patientRecords.push({ id, name, tier, score, therapistId: pick(THERAPISTS).id, createdAt });
  });

  // Assign stable therapists (first two featured get more load)
  patientRecords.forEach((p, i) => {
    p.therapistId = i % 5 === 0 || i % 7 === 0 ? 'thr_mateo' : i % 3 === 0 ? 'thr_daniela' : 'thr_camila';
  });

  const today = todayISO();
  const dormantIds = new Set(patientRecords.filter((_, i) => i % 3 === 0).map((x) => x.id));
  const activePool = patientRecords.filter((x) => !dormantIds.has(x.id));
  const completedByPatient = {};

  for (const [i, p] of patientRecords.entries()) {
    const dormant = i % 3 === 0;
    const sessions = dormant ? int(1, 3) : int(5, 16);
    let dayOffset = dormant ? -int(95, 150) : -int(20, 150);
    const cutoff = dormant ? -int(52, 65) : 0;
    const therapistId = p.therapistId;
    let lastAppt = null;
    for (let s = 0; s < sessions; s++) {
      const date = addDays(today, dayOffset);
      if (dormant && date > addDays(today, cutoff)) break;
      const wd = weekdayOf(date);
      if (wd === 0 || wd === 6) { dayOffset += 7; continue; }
      const start = pick(['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']);
      if (!lastAppt || lastAppt.date !== date || lastAppt.start !== start) {
        const isPast = date < today;
        if (!isPast) break;
        const status = chance(0.82) ? 'completada' : chance(0.55) ? 'no_asistio' : 'cancelada';
        const appt = insertAppointment({
          patientId: p.id, therapistId, date, start, modality: chance(0.6) ? 'presencial' : 'virtual',
          status, price: p.tier.price, paymentStatus: status === 'completada' ? 'pagado' : 'pendiente',
          reason: pick(REASONS),
        });
        if (!appt) { dayOffset += 7; continue; }
        if (status === 'completada') {
          const payStatus = chance(0.92) ? 'verificado' : chance(0.6) ? 'en_revision' : 'pendiente';
          addPayment({ appointment: appt, patientId: p.id, status: payStatus, daysAgo: Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 864e5) - 1) });
          if (payStatus !== 'verificado') {
            run('UPDATE appointments SET payment_status = ? WHERE id = ?', payStatus === 'en_revision' ? 'en_revision' : 'pendiente', appt.id);
          }
          completedByPatient[p.id] = (completedByPatient[p.id] || 0) + 1;
          if (chance(0.5)) {
            insert('session_notes', {
              id: uid('not_'), appointment_id: appt.id, patient_id: p.id, therapist_id: therapistId,
              content: pick([
                'Paciente reporta mejora en el manejo de la ansiedad. Se trabajó reestructuración cognitiva y respiración diafragmática.',
                'Se exploró la relación con la familia. Identificamos patrones de exigencia y se acordó un límite concreto para la semana.',
                'Sesión centrada en rutinas de sueño y organización académica. Buena adherencia a las tareas previas.',
                'Se abordó el duelo. El paciente pudo nombrar emociones y se validó su proceso. Continuar con escritura terapéutica.',
                'Trabajo de exposición gradual ante la ansiedad social. Se definieron tres situaciones y jerarquía de dificultad.',
              ]),
              mood: pick(['mejor', 'estable', 'sensible', 'motivado', 'ansioso']),
              created_at: new Date(date + 'T18:00:00').toISOString(),
            });
          }
        }
        lastAppt = appt;
        appointmentCount++;
      }
      dayOffset += int(7, 16);
    }
    // Upcoming appointment for active patients
    if (!dormant && chance(0.6) && dayOffset > -20) {
      let offset = int(2, 24);
      let date = addDays(today, offset);
      while (weekdayOf(date) === 0) { offset++; date = addDays(today, offset); }
      const start = pick(['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']);
      const status = chance(0.6) ? 'confirmada' : 'pendiente';
      const appt = insertAppointment({
        patientId: p.id, therapistId, date, start, modality: chance(0.5) ? 'presencial' : 'virtual',
        status, price: p.tier.price, paymentStatus: 'pendiente', reason: pick(REASONS),
      });
      if (appt && chance(0.35)) addPayment({ appointment: appt, patientId: p.id, status: 'en_revision', daysAgo: 0 });
      if (appt) appointmentCount++;
    }
  }

  // Additional density for past 5 months
  for (let d = -155; d <= 24; d++) {
    const date = addDays(today, d);
    const wd = weekdayOf(date);
    if (wd === 0) continue;
    const extra = wd === 6 ? (chance(0.5) ? 1 : 0) : int(1, 4);
    for (let k = 0; k < extra; k++) {
      const p = pick(activePool);
      const start = pick(['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']);
      const existing = get(`SELECT id FROM appointments WHERE therapist_id = ? AND date = ? AND start = ?`, p.therapistId, date, start);
      if (existing) continue;
      const isPast = date < today;
      const status = isPast ? (chance(0.78) ? 'completada' : chance(0.5) ? 'no_asistio' : 'cancelada') : (chance(0.65) ? 'confirmada' : 'pendiente');
      const appt = insertAppointment({
        patientId: p.id, therapistId: p.therapistId, date, start, modality: chance(0.55) ? 'presencial' : 'virtual',
        status, price: p.tier.price, paymentStatus: status === 'completada' ? 'pagado' : 'pendiente', reason: pick(REASONS),
      });
      if (!appt) continue;
      if (status === 'completada') {
        addPayment({ appointment: appt, patientId: p.id, status: chance(0.94) ? 'verificado' : 'en_revision', daysAgo: Math.max(1, -d) });
      } else if (!isPast && chance(0.08)) {
        addPayment({ appointment: appt, patientId: p.id, status: 'en_revision', daysAgo: 0 });
      }
      appointmentCount++;
    }
  }

  // Dense current month and coming weeks so the live dashboard reflects an active clinic
  const monthPrefix = today.slice(0, 7);
  for (let d = -18; d <= 16; d++) {
    const date = addDays(today, d);
    if (date < `${monthPrefix}-01`) continue;
    const wd = weekdayOf(date);
    if (wd === 0) continue;
    for (let k = 0; k < 3; k++) {
      const p = pick(activePool);
      const start = pick(['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']);
      const isPast = date < today;
      const status = isPast
        ? (chance(0.86) ? 'completada' : chance(0.5) ? 'no_asistio' : 'cancelada')
        : (chance(0.7) ? 'confirmada' : 'pendiente');
      const appt = insertAppointment({
        patientId: p.id, therapistId: p.therapistId, date, start,
        modality: chance(0.5) ? 'presencial' : 'virtual', status,
        price: p.tier.price, paymentStatus: status === 'completada' ? 'pagado' : 'pendiente', reason: pick(REASONS),
      });
      if (!appt) continue;
      if (status === 'completada') {
        addPayment({ appointment: appt, patientId: p.id, status: chance(0.95) ? 'verificado' : 'en_revision', daysAgo: Math.max(1, -d) });
      } else if (!isPast && chance(0.08)) {
        addPayment({ appointment: appt, patientId: p.id, status: 'en_revision', daysAgo: 0 });
      }
      appointmentCount++;
    }
  }

  // A few sessions today so the dashboard always shows live activity
  const todayPatients = [...patientRecords].sort(() => rnd() - 0.5).slice(0, 5);
  const todaySlots = ['09:00', '10:00', '11:00', '15:00', '16:00'];
  todayPatients.forEach((p, i) => {
    const appt = insertAppointment({
      patientId: p.id, therapistId: p.therapistId, date: today, start: todaySlots[i],
      modality: i % 2 === 0 ? 'presencial' : 'virtual', status: i < 3 ? 'confirmada' : 'pendiente',
      price: p.tier.price, paymentStatus: 'pendiente', reason: pick(REASONS),
    });
    if (appt && chance(0.5)) addPayment({ appointment: appt, patientId: p.id, status: 'en_revision', daysAgo: 1 });
    if (appt) appointmentCount++;
  });

  // Demo patient (Sofía) always has a rich history and one upcoming session
  const demoPatient = patientRecords[0];
  if (demoPatient) {
    const tries = [
      [-62, '09:00'], [-48, '10:00'], [-34, '11:00'], [-20, '15:00'], [-9, '09:00'], [-2, '16:00'],
    ];
    for (const [off, start] of tries) {
      const appt = insertAppointment({
        patientId: demoPatient.id, therapistId: 'thr_camila', date: addDays(today, off), start,
        modality: off % 2 === 0 ? 'presencial' : 'virtual', status: 'completada',
        price: demoPatient.tier.price, paymentStatus: 'pagado', reason: pick(REASONS),
      });
      if (!appt) continue;
      addPayment({ appointment: appt, patientId: demoPatient.id, status: 'verificado', daysAgo: Math.max(1, -off) });
      appointmentCount++;
    }
    for (const [off, start] of [[4, '17:00'], [5, '10:00'], [6, '15:00'], [7, '11:00']]) {
      const up = insertAppointment({
        patientId: demoPatient.id, therapistId: 'thr_camila', date: addDays(today, off), start,
        modality: 'virtual', status: 'confirmada', price: demoPatient.tier.price, paymentStatus: 'pendiente', reason: pick(REASONS),
      });
      if (up) { appointmentCount++; break; }
    }
  }

  // Patients flagged for follow-up
  run(`UPDATE patients SET status = 'inactivo' WHERE id IN (SELECT patient_id FROM appointments GROUP BY patient_id HAVING MAX(date) < ?)`, addDays(today, -50));

  // Expenses: 5 months of fixed costs + extras
  for (let m = 5; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    for (const [desc, base, cat] of EXPENSE_SEED.slice(0, 5)) {
      insert('expenses', {
        id: uid('exp_'), date: `${ym}-${String(int(2, 8)).padStart(2, '0')}`, category: cat, description: desc,
        amount: base + int(-8, 12), method: 'transferencia', receipt: null, created_by: 'usr_admin',
        created_at: new Date().toISOString(),
      });
    }
    if (chance(0.7)) {
      insert('expenses', {
        id: uid('exp_'), date: `${ym}-${String(int(10, 20)).padStart(2, '0')}`, category: 'Materiales',
        description: 'Materiales terapéuticos y papelería', amount: int(25, 70), method: 'efectivo', receipt: null,
        created_by: 'usr_admin', created_at: new Date().toISOString(),
      });
    }
    if (chance(0.45)) {
      insert('expenses', {
        id: uid('exp_'), date: `${ym}-${String(int(15, 26)).padStart(2, '0')}`, category: 'Capacitación',
        description: 'Taller de supervisión clínica', amount: int(90, 180), method: 'transferencia', receipt: null,
        created_by: 'usr_admin', created_at: new Date().toISOString(),
      });
    }
  }

  // Notifications
  insert('notifications', {
    id: uid('ntf_'), user_id: 'usr_admin', audience: 'admin', title: 'Comprobantes por validar',
    body: 'Hay pagos en revisión esperando confirmación contable.', kind: 'warning', link: '/admin/pagos', read: 0, created_at: new Date().toISOString(),
  });
  insert('notifications', {
    id: uid('ntf_'), user_id: 'usr_admin', audience: 'admin', title: 'Pacientes sin volver',
    body: 'Pacientes sin sesiones en los últimos 45 días requieren seguimiento.', kind: 'info', link: '/admin/pacientes?freq=inactivo', read: 0, created_at: new Date().toISOString(),
  });
  const sofia = get('SELECT * FROM patients WHERE id = ?', 'pat_001');
  if (sofia) {
    insert('notifications', {
      id: uid('ntf_'), user_id: 'usr_pat_001', audience: 'user', title: 'Bienvenida a Psicampus',
      body: 'Tu proceso comienza aquí. Puedes revisar tus citas y comprobantes desde tu portal.', kind: 'success', link: '/portal', read: 0, created_at: new Date().toISOString(),
    });
  }
  insert('audit', {
    id: uid('aud_'), user_id: 'usr_admin', user_name: 'Andrea Salgado', action: 'seed', entity: 'system',
    entity_id: null, detail: 'Carga inicial de datos de demostración', created_at: new Date().toISOString(),
  });
  } // close if (demo)

  return { seeded: true, appointments: appointmentCount, patients: patientRecords.length, therapists: THERAPISTS.length };
}

if (process.argv[1] && process.argv[1].endsWith('seed.mjs')) {
  const force = process.argv.includes('--force');
  const result = seedDatabase({ force });
  console.log('Seed:', JSON.stringify(result));
  console.log('Admin: acceso privado por configuración de seguridad');
  console.log('Terapeuta: camila@psicampus.ec / Demo1234!');
  console.log('Paciente: sofia.morales@universidad.edu.ec / Demo1234!');
}

