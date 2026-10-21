import { Router } from 'express';
import { get, all, settings } from '../db.mjs';
import { requireAuth } from '../auth.mjs';

export const reportsRouter = Router();
reportsRouter.use(requireAuth('admin'));

function attendanceLabel(s) {
  s = (s || '').toLowerCase();
  if (['asistida', 'completada', 'realizada', 'atendida', 'asistido', 'asistieron'].includes(s)) return 'Asistida';
  if (['inasistida', 'no_asistida', 'falta', 'ausente', 'cancelada'].includes(s)) return 'No asistida';
  return s || 'Pendiente';
}

reportsRouter.get('/patient/:id', (req, res) => {
  const p = get('SELECT * FROM patients WHERE id = ?', req.params.id);
  if (!p) return res.status(404).json({ error: 'Paciente no encontrado' });
  const rows = all(`SELECT a.*, t.name AS therapist_name FROM appointments a LEFT JOIN therapists t ON a.therapist_id = t.id WHERE a.patient_id = ? ORDER BY a.date DESC, a.start DESC`, req.params.id);
  const sessions = rows.map(r => ({
    id: r.id,
    code: r.code,
    date: r.date,
    start: r.start,
    end: r.end,
    modality: r.modality || 'presencial',
    status: r.status || 'pendiente',
    attendance: attendanceLabel(r.status),
    price: r.price,
    notes: r.notes || '',
    therapist: r.therapist_name || '—',
  }));
  const s = settings();
  const psycho = (s.content && s.content.psychoInfo) ? s.content.psychoInfo : (s.psychoInfo || { name: 'Dr. Psicólogo Clínico', reg: '1027-2025-3185598', senecyt: '1027-2025-3185598' });
  res.json({
    patient: { id: p.id, name: p.name, email: p.email, created_at: p.created_at },
    sessions,
    totals: {
      attended: sessions.filter(x => x.attendance === 'Asistida').length,
      missed: sessions.filter(x => x.attendance === 'No asistida').length,
      pending: sessions.filter(x => x.attendance === 'Pendiente').length,
    },
    psychologist: psycho,
  });
});

reportsRouter.get('/patient/:id/print', (req, res) => {
  const p = get('SELECT * FROM patients WHERE id = ?', req.params.id);
  if (!p) return res.status(404).send('Paciente no encontrado');
  const s = settings();
  const psycho = (s.content && s.content.psychoInfo) ? s.content.psychoInfo : (s.psychoInfo || { name: 'Dr. Psicólogo Clínico', reg: '1027-2025-3185598', senecyt: '1027-2025-3185598' });
  const rows = all(`SELECT a.*, t.name AS therapist_name FROM appointments a LEFT JOIN therapists t ON a.therapist_id = t.id WHERE a.patient_id = ? ORDER BY a.date DESC`, req.params.id);
  const html = `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>Informe clínico — Psyconova</title>
<style>body{font-family:system-ui,sans-serif;color:#14231f;background:#fffdf8;margin:0;padding:32px 24px;line-height:1.55}
h1{font-family:Georgia,serif;font-size:28px;color:#0f3b33;margin-bottom:6px}
.subtitle{color:#64746f;font-size:13px;margin-bottom:28px}
.table{width:100%;border-collapse:collapse;font-size:13px}
.table th{background:#0f3b33;color:#f6f1e6;padding:8px 10px;text-align:left;border-bottom:2px solid #c0603c}
.table td{padding:7px 10px;border-bottom:1px solid #e3ddcf;vertical-align:top}
.tag{display:inline-block;padding:2px 6px;border-radius:999px;font-size:11px;font-weight:600;background:#e3ebdd;color:#1e6457}
.tag.missed{background:#f7e2df;color:#a83a35}
.tag.pending{background:#fbf4d6;color:#8a6e1c}
.footer{margin-top:36px;padding-top:18px;border-top:2px solid #0f3b33;font-size:11px;color:#64746f}
.signature-box{margin-top:24px;padding:16px;border:1px solid #ddd;border-radius:10px;background:#f6f1e6;max-width:460px}
</style>
</head>
<body>
<div style="max-width:760px;margin:0 auto">
  <h1>Informe clínico · Psyconova</h1>
  <div class="subtitle">Paciente: <b>${p.name || ''}</b> · Correo: ${p.email || ''} · Fecha de emisión: ${new Date().toLocaleDateString('es-EC')}</div>

  <h2 style="font-size:16px;margin:22px 0 10px;color:#165247">Resumen de sesiones</h2>
  <table class="table">
    <thead><tr><th>Fecha</th><th>Horario</th><th>Modalidad</th><th>Estado</th><th>Nota</th></tr></thead>
    <tbody>
      ${rows.map(r => {
        const att = (r.status || '').toLowerCase();
        const label = att.includes('asist') || att.includes('complet') ? 'Asistida' : (att.includes('inasist') || att.includes('falta') || att.includes('cancel') ? 'No asistida' : 'Pendiente');
        const cls = label === 'Asistida' ? '' : (label === 'No asistida' ? 'missed' : 'pending');
        return `<tr><td>${r.date || ''}</td><td>${(r.start || '')} – ${(r.end || '')}</td><td>${r.modality || 'presencial'}</td><td><span class="tag ${cls}">${label}</span></td><td>${(r.notes || '').substring(0,60)}</td></tr>`;
      }).join('')}
    </tbody>
  </table>

  <h2 style="font-size:16px;margin:22px 0 10px;color:#165247">Totales</h2>
  <p>Asistidas: <b>${rows.filter(r => { const s=(r.status||'').toLowerCase(); return s.includes('asist')||s.includes('complet'); }).length}</b> · No asistidas: <b>${rows.filter(r => { const s=(r.status||'').toLowerCase(); return s.includes('inasist')||s.includes('falta')||s.includes('cancel'); }).length}</b> · Pendientes: <b>${rows.filter(r => { const s=(r.status||'').toLowerCase(); return !(s.includes('asist')||s.includes('complet')||s.includes('inasist')||s.includes('falta')||s.includes('cancel')); }).length}</b></p>

  <div class="signature-box">
    <strong>Responsable clínico</strong><br>
    <b>${psycho.name || ''}</b> — Psicólogo Clínico<br>
    Registro clínico: <b>${psycho.reg || ''}</b><br>
    Registro SENECYT: <b>${psycho.senecyt || '1027-2025-3185598'}</b><br>
    <em>Firma electrónica: ___________________</em><br>
    <small>Generado por Psyconova · Plataforma de bienestar universitario</small>
  </div>

  <div class="footer">Este documento es confidential y debe ser usado únicamente para fines clínicos y académicos según la Ley de Protección de Datos.</div>
</div>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});
