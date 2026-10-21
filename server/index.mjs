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
import { UPLOAD_DIR, run } from './db.mjs';

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

app.listen(PORT, () => {
  console.log(`\n  Psicampus listo → http://localhost:${PORT}`);
  console.log('  Admin: (acceso privado por configuración de seguridad)');
  console.log(`  Terapeuta: camila@psicampus.ec / Demo1234!`);
  console.log(`  Paciente: sofia.morales@universidad.edu.ec / Demo1234!\n`);
});
