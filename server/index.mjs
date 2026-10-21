import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { adminRouter, therapistRouter } from './routes/admin.mjs';
import { adminAdvancedRouter } from './routes/admin-advanced.mjs';
import { authRouter } from './routes/auth.mjs';
import { patientRouter } from './routes/patient.mjs';
import { publicRouter } from './routes/public.mjs';
import { seedDatabase } from './seed.mjs';
import { applyMigrations } from './migrations.mjs';
import { UPLOAD_DIR, run, all } from './db.mjs';
import { nowISO, todayISO, uid } from './util.mjs';
import { sendMail } from './mailer.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'web', 'dist');
const PORT = Number(process.env.PORT || 4321);

// Carga .env (Node 20.12+) para configuración SMTP y variables de entorno
try {
  const envPath = path.join(ROOT, '.env');
  if (fs.existsSync(envPath)) process.loadEnvFile(envPath);
} catch (e) {
  console.warn('[psicampus] No se pudo leer .env:', e?.message);
}

seedDatabase();
applyMigrations();

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '14mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'psicampus', time: new Date().toISOString() }));
app.use('/api/public', publicRouter);
app.use('/api/auth', authRouter);
app.use('/api/patient', patientRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin-advanced', adminAdvancedRouter);
app.use('/api/therapist', therapistRouter);
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, { maxAge: '1h', index: false }));
  app.get(/^\/(?!api\/|uploads\/).*/, (req, res, next) => {
    if (req.method !== 'GET' || !req.accepts('html')) return next();
    res.sendFile(path.join(DIST, 'index.html'));
  });
}

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Ruta no encontrada' });
  res.status(404).send('No encontrado');
});

app.use((err, req, res, next) => {
  console.error('[psicampus]', err?.message || err);
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.expose ? err.message : (err.message || 'Error interno del servidor') });
});

// Limpieza automática: solicitudes rechazadas con más de 10 días
setInterval(() => {
  try {
    run(`DELETE FROM applications WHERE status = 'rechazada' AND datetime(COALESCE(NULLIF(reviewed_at, ''), created_at)) < datetime('now', '-10 days')`);
  } catch (e) { /* silencioso */ }
}, 3600_000); // cada 1 hora

// Recordatorios de cita por correo: 15 minutos antes de la sesión
async function sendUpcomingReminders() {
  try {
    const rows = all(
      `SELECT a.id, a.code, a.date, a.start, a.modality, a.status,
              p.name AS patient_name, p.email AS patient_email,
              t.name AS therapist_name
         FROM appointments a
         JOIN patients p ON p.id = a.patient_id
         JOIN therapists t ON t.id = a.therapist_id
        WHERE a.date = ? AND a.status IN ('confirmada','pendiente')
          AND a.start >= strftime('%H:%M', 'now', '-5 minutes')
          AND a.start <= strftime('%H:%M', 'now', '+30 minutes')
          AND p.email IS NOT NULL AND p.email != ''
          AND NOT EXISTS (SELECT 1 FROM audit au WHERE au.action = 'recordatorio_cita' AND au.entity_id = a.id)`,
      todayISO()
    );
    for (const r of rows) {
      try {
        await sendMail({
          to: r.patient_email,
          subject: `Tu cita de Psyconova es en 15 minutos · ${r.start}`,
          html: `<p>Hola <b>${r.patient_name}</b>,</p><p>Te recordamos que tu cita con <b>${r.therapist_name}</b> es <b>hoy a las ${r.start}</b> (${r.modality}).</p><p>Código: <b>${r.code}</b></p><p>Psicoeducación & Bienestar</p>`,
          text: `Recordatorio: tu cita con ${r.therapist_name} es hoy a las ${r.start}. Código: ${r.code}`,
        });
        run(`INSERT INTO audit (id, user_id, user_name, action, entity, entity_id, detail, created_at)
             VALUES (?, 'usr_admin', 'Sistema', 'recordatorio_cita', 'appointments', ?, ?, ?)`,
          uid('aud_'), r.id, `Recordatorio enviado a ${r.patient_email}`, nowISO());
        console.log(`[psicampus] recordatorio enviado: ${r.patient_email} (${r.date} ${r.start})`);
      } catch (e) { /* silencioso */ }
    }
  } catch (e) { /* silencioso */ }
}
setInterval(() => { sendUpcomingReminders(); }, 60_000);
setTimeout(() => { sendUpcomingReminders(); }, 5_000);

app.listen(PORT, () => {
  console.log(`\n  Psyconova listo → http://localhost:${PORT}`);
  console.log('  Admin: (acceso privado por configuración de seguridad)');
  console.log('  Terapeuta: camila@psicampus.ec / Demo1234!');
  console.log('  Paciente: sofia.morales@universidad.edu.ec / Demo1234!\n');
});
