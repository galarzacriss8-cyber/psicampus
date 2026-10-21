import { Router } from 'express';
import { all, get, insert, run, settings } from '../db.mjs';
import { requireAuth } from '../auth.mjs';
import { audit, notify } from '../services.mjs';
import { getAttendanceConfig, applyAttendancePolicy, classifyNoShows, recordAttendanceAction, deactivatePatient, suspendPatient, anonymizePatient, checkLegalRetention, checkBookingAllowed } from '../governance.mjs';
import { can, ensureRoles, rolesForUser, PERMISSIONS } from '../permissions.mjs';
import { uid, nowISO } from '../util.mjs';

export const adminAdvancedRouter = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((e) => { console.error('[advanced]', e?.message); res.status(e?.status || 500).json({ error: e?.message || 'Error' }); });
adminAdvancedRouter.use(requireAuth('admin'));

// Attendance / governance
adminAdvancedRouter.get('/attendance/:id/summary', wrap(async (req, res) => {
  const p = get('SELECT * FROM patients WHERE id = ?', req.params.id);
  if (!p) return res.status(404).json({ error: 'Paciente no encontrado' });
  const info = classifyNoShows(req.params.id);
  res.json({ patient: p, ...info });
}));

adminAdvancedRouter.get('/patients/:id/detail', wrap(async (req, res) => {
  const p = get('SELECT * FROM patients WHERE id = ?', req.params.id);
  if (!p) return res.status(404).json({ error: 'Paciente no encontrado' });
  const actions = all('SELECT * FROM patient_actions WHERE patient_id = ? ORDER BY created_at DESC LIMIT 200', req.params.id);
  const restrictions = all('SELECT * FROM patient_restrictions WHERE patient_id = ? ORDER BY created_at DESC', req.params.id);
  const appointments = all(
    `SELECT a.*, t.name AS therapist_name FROM appointments a
     LEFT JOIN therapists t ON t.id = a.therapist_id
     WHERE a.patient_id = ? ORDER BY a.date DESC, a.start DESC LIMIT 100`, req.params.id);
  const payments = all('SELECT * FROM payments WHERE patient_id = ? ORDER BY created_at DESC', req.params.id);
  const pendingPayments = payments.filter((x) => x.status === 'en_revision');
  const attendance = classifyNoShows(req.params.id);
  const legal = checkLegalRetention(req.params.id);
  res.json({
    patient: p, actions, restrictions, appointments, payments, pendingPayments,
    attendance, legal,
    booking: checkBookingAllowed(req.params.id),
  });
}));

adminAdvancedRouter.post('/patients/:id/action', wrap(async (req, res) => {
  const { action, reason, detail } = req.body || {};
  if (!action) return res.status(400).json({ error: 'Se requiere la acción' });
  if (['desactivar', 'suspender', 'eliminar', 'anonimizar'].includes(action) && !reason) {
    return res.status(400).json({ error: 'Esta acción exige un motivo registrado' });
  }
  const patient = get('SELECT * FROM patients WHERE id = ?', req.params.id);
  if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });
  if (action === 'desactivar') {
    if (!can(req.user, 'pacientes.desactivar')) return res.status(403).json({ error: 'No tienes permiso para desactivar pacientes' });
    deactivatePatient(req.params.id, reason, req.user.id, req.user.name);
  } else if (action === 'suspender') {
    if (!can(req.user, 'pacientes.suspender')) return res.status(403).json({ error: 'No tienes permiso para suspender pacientes' });
    suspendPatient(req.params.id, Number(req.body.days || 15), reason, req.user.id, req.user.name);
  } else if (action === 'anonimizar') {
    if (!can(req.user, 'pacientes.eliminar')) return res.status(403).json({ error: 'No tienes permiso para eliminar datos' });
    const legal = checkLegalRetention(req.params.id);
    if (legal.mustRetain && !req.body.force) {
      return res.status(409).json({
        error: 'No se puede completar la eliminación: existen registros sujetos a conservación obligatoria',
        retention: legal,
      });
    }
    anonymizePatient(req.params.id, req.user.id, req.user.name);
  } else if (action === 'reactivar') {
    run(`UPDATE patients SET status = 'activo' WHERE id = ?`, req.params.id);
    run(`UPDATE users SET active = 1 WHERE id = ?`, patient.user_id);
    recordAttendanceAction(req.params.id, req.user.id, req.user.name, 'reactivar', { reason: reason || '' });
  } else if (action === 'corregir_inasistencia') {
    const { appointmentId, newStatus } = req.body;
    const appt = get('SELECT * FROM appointments WHERE id = ? AND patient_id = ?', appointmentId, req.params.id);
    if (!appt) return res.status(404).json({ error: 'Cita no encontrada' });
    if (!['completada', 'no_asistio', 'cancelada', 'reprogramada'].includes(newStatus)) {
      return res.status(400).json({ error: 'Estado de cita inválido' });
    }
    run('UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?', newStatus, nowISO(), appointmentId);
    recordAttendanceAction(req.params.id, req.user.id, req.user.name, 'corregir_inasistencia', {
      appointmentId, from: appt.status, to: newStatus, reason,
    });
  } else {
    recordAttendanceAction(req.params.id, req.user.id, req.user.name, action, { reason, detail });
  }
  audit(req.user, `paciente_${action}`, 'patients', req.params.id, { reason, detail });
  notify({
    userId: 'usr_admin', audience: 'admin', title: `Acción sobre paciente: ${action}`,
    body: `${patient.name} · ${reason || ''}`, kind: 'warning', link: '/admin/pacientes-avanzado',
  });
  res.json({ ok: true });
}));

adminAdvancedRouter.post('/patients/:id/restriction/lift', wrap(async (req, res) => {
  const { reason } = req.body || {};
  if (!reason) return res.status(400).json({ error: 'Se requiere el motivo del levantamiento' });
  run(`UPDATE patient_restrictions SET active = 0, lifted_by = ?, lifted_at = ?, lifted_reason = ? WHERE id = ? AND patient_id = ?`,
    req.user.name, nowISO(), reason, req.params.restrictionId, req.params.id);
  recordAttendanceAction(req.params.id, req.user.id, req.user.name, 'levantar_restriccion', { reason });
  res.json({ ok: true });
}));

adminAdvancedRouter.get('/attendance/config', wrap(async (req, res) => {
  res.json(getAttendanceConfig());
}));

adminAdvancedRouter.put('/attendance/config', wrap(async (req, res) => {
  if (!can(req.user, 'configuracion.editar')) return res.status(403).json({ error: 'No tienes permiso para editar configuración' });
  const cfg = { ...getAttendanceConfig(), ...(req.body || {}) };
  const s = settings();
  const policies = { ...(s.policies || {}), attendance: cfg };
  run(`INSERT INTO settings (key, value) VALUES ('policies', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, JSON.stringify(policies));
  audit(req.user, 'actualizar_politica_asistencia', 'settings', 'policies', cfg);
  res.json({ ok: true, config: cfg });
}));

adminAdvancedRouter.get('/attendance/overview', wrap(async (req, res) => {
  const cfg = getAttendanceConfig();
  const patients = all('SELECT id, name, email, status FROM patients');
  const flagged = [];
  for (const p of patients) {
    const info = classifyNoShows(p.id);
    if (info.totalFlagged > 0) flagged.push({ ...p, ...info });
  }
  flagged.sort((a, b) => b.totalFlagged - a.totalFlagged);
  res.json({ config: cfg, flagged });
}));

// === Automations ===
adminAdvancedRouter.get('/automations', wrap(async (req, res) => {
  const rules = all('SELECT * FROM automation_rules ORDER BY name');
  const runs = all('SELECT * FROM automation_runs ORDER BY created_at DESC LIMIT 20');
  res.json({ rules, runs });
}));

adminAdvancedRouter.post('/automations', wrap(async (req, res) => {
  const { name, condition, action, recipients, frequency } = req.body || {};
  const id = uid('ar_');
  insert('automation_rules', { id, name, condition, action, recipients: JSON.stringify(recipients || []), frequency: frequency || 'on_event', active: 1, created_at: nowISO(), updated_at: nowISO() });
  audit(req.user, 'crear_automatizacion', 'automation_rules', id, { name, condition });
  res.json({ ok: true, id });
}));

// === Integrations ===
adminAdvancedRouter.get('/integrations/status', wrap(async (req, res) => {
  const rows = all('SELECT * FROM integration_status ORDER BY updated_at DESC');
  res.json(rows);
}));

// === Roles ===
adminAdvancedRouter.get('/roles', wrap(async (req, res) => {
  const rows = all('SELECT * FROM roles ORDER BY is_system DESC, name');
  res.json(rows.map((r) => ({ ...r, permissions: JSON.parse(r.permissions || '{}') })));
}));

// === AI tools ===
adminAdvancedRouter.get('/ai/tools', wrap(async (req, res) => {
  res.json([
    { name: 'patient_actions.log', description: 'Registrar una acción sobre paciente', permission: 'pacientes.editar' },
    { name: 'patient_restrictions.apply', description: 'Aplicar restricción', permission: 'pacientes.suspender' },
    { name: 'patient_deactivate', description: 'Desactivar cuenta', permission: 'pacientes.desactivar' },
    { name: 'patient_anonymize', description: 'Eliminar datos', permission: 'pacientes.eliminar' },
    { name: 'policy.update', description: 'Actualizar políticas', permission: 'configuracion.editar' },
    { name: 'integration.check', description: 'Verificar integración', permission: 'integraciones.administrar' },
    { name: 'automation.run', description: 'Ejecutar automatización', permission: 'automatizaciones.editar' },
  ]);
}));

adminAdvancedRouter.get('/smtp/settings', wrap(async (req, res) => {
  const s = settings();
  res.json(s.smtp || {});
}));

adminAdvancedRouter.put('/smtp/settings', wrap(async (req, res) => {
  const cfg = req.body || {};
  const s = settings();
  const newSettings = { ...s, smtp: { ...s.smtp, ...cfg } };
  run(`INSERT INTO settings (key, value) VALUES ('settings', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, JSON.stringify(newSettings));
  audit(req.user, 'actualizar_smtp', 'settings', 'smtp', cfg);
  res.json({ ok: true, smtp: newSettings.smtp });
}));

adminAdvancedRouter.post('/smtp/test', wrap(async (req, res) => {
  const { sendMail, mailConfigured } = await import('../mailer.mjs');
  if (!mailConfigured()) return res.status(400).json({ ok: false, error: 'SMTP no configurado' });
  const result = await sendMail({ to: 'hola@psicampus.ec', subject: 'Prueba Psicampus', html: '<p>Correo de prueba desde la plataforma.</p>', text: 'Correo de prueba' });
  res.json({ ok: result.sent, result });
}));

// === Listado avanzado de pacientes (búsqueda, filtros, métricas) ===
adminAdvancedRouter.get('/patients/list', wrap(async (req, res) => {
  const { q = '', status = '', risk = '', sort = 'recent' } = req.query || {};
  const where = [];
  const args = [];
  if (q) {
    where.push('(lower(p.name) LIKE ? OR lower(p.email) LIKE ? OR lower(COALESCE(p.phone, \'\')) LIKE ? OR p.id LIKE ?)');
    const like = `%${String(q).toLowerCase()}%`;
    args.push(like, like, like, `%${String(q).toLowerCase()}%`);
  }
  if (status) { where.push('p.status = ?'); args.push(String(status)); }
  if (risk) { where.push('p.risk = ?'); args.push(String(risk)); }
  const order = sort === 'name' ? 'p.name ASC'
    : sort === 'risk' ? "CASE p.risk WHEN 'alto' THEN 0 WHEN 'medio' THEN 1 WHEN 'bajo' THEN 2 ELSE 3 END, p.name ASC"
    : 'p.created_at DESC';
  const rows = all(
    `SELECT p.*,
       (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = p.id) AS total_citas,
       (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = p.id AND a.status = 'no_asistio') AS inasistencias,
       (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = p.id AND a.status IN ('agendada','confirmada')) AS proximas,
       (SELECT COUNT(*) FROM payments py WHERE py.patient_id = p.id AND py.status = 'en_revision') AS pagos_pendientes,
       (SELECT COUNT(*) FROM patient_restrictions r WHERE r.patient_id = p.id AND r.active = 1) AS restricciones
     FROM patients p
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY ${order} LIMIT 300`, ...args);
  const restricted = rows.filter((r) => (r.restricciones || 0) > 0).length;
  res.json({
    patients: rows,
    total: rows.length,
    metrics: {
      activos: rows.filter((r) => r.status === 'activo').length,
      inactivos: rows.filter((r) => r.status === 'inactivo').length,
      riesgoAlto: rows.filter((r) => r.risk === 'alto').length,
      conRestricciones: restricted,
      conInasistencias: rows.filter((r) => (r.inasistencias || 0) > 0).length,
    },
  });
}));

adminAdvancedRouter.get('/patients/:id/attendance-summary', wrap(async (req, res) => {
  const p = get('SELECT * FROM patients WHERE id = ?', req.params.id);
  if (!p) return res.status(404).json({ error: 'Paciente no encontrado' });
  res.json({ patient: p, ...classifyNoShows(req.params.id) });
}));

// === AI assistant (consultar / diagnosticar / ejecutar) ===
const AI_INTENTS = [
  { id: 'consult_attendance_policy', keywords: ['inasistencia', 'inasistencias', 'alerta', 'avise', 'avisar', 'asistencia'], perm: 'pacientes.ver', suggestion: 'Consultar la política de asistencia vigente' },
  { id: 'apply_restriction', keywords: ['restriccion', 'restricción', 'suspender', 'suspension', 'bloquear'], perm: 'pacientes.suspender', suggestion: 'Aplicar una restricción o suspensión' },
  { id: 'deactivate_or_anonymize', keywords: ['eliminar', 'anonimizar', 'borrar', 'dar de baja'], perm: 'pacientes.desactivar', suggestion: 'Desactivar o anonimizar una ficha' },
  { id: 'consult_policy_settings', keywords: ['configuracion', 'configuración', 'ajustes', 'politica', 'política'], perm: 'configuracion.ver', suggestion: 'Revisar la configuración de la plataforma' },
  { id: 'patient_history', keywords: ['historial', 'paciente', 'ficha', 'expediente'], perm: 'pacientes.ver', suggestion: 'Consultar la ficha de un paciente' },
  { id: 'generate_report', keywords: ['informe', 'reporte', 'estadistica', 'estadística', 'metricas', 'métricas'], perm: 'finanzas.ver', suggestion: 'Generar un informe operativo' },
  { id: 'clinical_report', keywords: ['informe clinico', 'informe clínico', 'reporte paciente', 'sesiones asistidas', 'no asistidas', 'historia sesiones', 'registro sesion', 'pdf informe'], perm: 'pacientes.ver', suggestion: 'Generar informe clínico por paciente (asistidas / no asistidas)' },
  { id: 'roles_access', keywords: ['rol', 'roles', 'permiso', 'permisos', 'acceso'], perm: 'auditoria.ver', suggestion: 'Revisar roles y permisos' },
  { id: 'automation_run', keywords: ['automatizacion', 'automatización', 'regla', 'disparador'], perm: 'automatizaciones.editar', suggestion: 'Revisar o ejecutar automatizaciones' },
];

adminAdvancedRouter.post('/ai/assistant', wrap(async (req, res) => {
  const { prompt, mode = 'consult' } = req.body || {};
  if (!prompt || !String(prompt).trim()) return res.status(400).json({ error: 'Escribe tu consulta' });
  if (!['consult', 'diagnose', 'execute'].includes(mode)) return res.status(400).json({ error: 'Modo no válido' });
  ensureRoles();

  const text = String(prompt).toLowerCase();
  const hit = AI_INTENTS.find((i) => i.keywords.some((k) => text.includes(k)));
  const intent = hit ? hit.id : 'desconocido';
  const allowed = hit ? can(req.user, hit.perm) : false;

  const answer = {
    intent,
    intentLabel: hit ? hit.suggestion : 'No pude determinar la intención',
    confidence: hit ? 0.85 : 0.2,
    suggestions: hit ? [hit.suggestion] : [
      'Prueba con: "muéstrame pacientes con inasistencias"',
      'Revisa la configuración de asistencia',
      'Genera un informe de pagos',
    ],
    mode,
    permission: hit ? hit.perm : null,
    allowed,
  };

  if (mode === 'execute') {
    if (!hit) answer.blocked = 'No hay una acción ejecutable que corresponda a esa consulta.';
    else if (!allowed) answer.blocked = `Tu rol no tiene el permiso "${hit.perm}" para ejecutar esta acción.`;
    else if (intent === 'consult_attendance_policy' || intent === 'consult_policy_settings') {
      answer.action = { type: 'policy_result', data: getAttendanceConfig() };
    } else if (intent === 'apply_restriction') {
      answer.action = { type: 'restrict_input', requiredFields: ['patientId', 'kind', 'reason'], hint: 'Identifica al paciente y el motivo. La ejecución queda registrada en auditoría.' };
    } else if (intent === 'deactivate_or_anonymize') {
      answer.action = { type: 'deactivate_input', requiredFields: ['patientId', 'reason'], hint: 'Se validará la obligación legal de conservación de registros antes de ejecutar.' };
    } else if (intent === 'patient_history') {
      answer.action = { type: 'patient_list', requiredFields: ['q'], hint: 'Indica el nombre o correo del paciente a consultar.' };
    } else if (intent === 'generate_report') {
      answer.action = { type: 'report_ready', requiredFields: ['from', 'to'], hint: 'Indica el rango de fechas del informe.' };
    } else if (intent === 'clinical_report') {
      const pid = req.body?.patientId;
      if (pid) {
        const p = get('SELECT * FROM patients WHERE id = ?', pid);
        if (!p) {
          answer.blocked = 'No se encontró ese paciente. Usa el buscador de pacientes para obtener su identificador.';
        } else {
          const rows = all(`SELECT a.*, t.name AS therapist_name FROM appointments a LEFT JOIN therapists t ON a.therapist_id = t.id WHERE a.patient_id = ? ORDER BY a.date DESC`, pid);
          const lab = (st) => {
            st = String(st || '').toLowerCase();
            if (st.includes('asist') || st.includes('complet')) return 'Asistida';
            if (st.includes('inasist') || st.includes('falta') || st.includes('cancel')) return 'No asistida';
            return 'Pendiente';
          };
          const sessions = rows.map(r => ({
            id: r.id, code: r.code, date: r.date, start: r.start, end: r.end,
            modality: r.modality || 'presencial', status: r.status || 'pendiente',
            attendance: lab(r.status), notes: r.notes || '', therapist: r.therapist_name || '—',
          }));
          answer.action = {
            type: 'clinical_report',
            patientId: pid,
            patientName: p.name,
            data: {
              patient: { id: p.id, name: p.name, email: p.email },
              sessions,
              totals: {
                attended: sessions.filter(x => x.attendance === 'Asistida').length,
                missed: sessions.filter(x => x.attendance === 'No asistida').length,
                pending: sessions.filter(x => x.attendance === 'Pendiente').length,
              },
            },
            printUrl: `/api/admin/reports/patient/${pid}/print`,
            hint: 'Informe con sesiones asistidas y no asistidas, listo para imprimir y firmar electrónicamente.',
          };
          answer.intentLabel = `Informe clínico de ${p.name}`;
        }
      } else {
        answer.action = { type: 'clinical_report_input', requiredFields: ['patientId'], hint: 'Indica el paciente (por id o busca en Pacientes) para emitir el informe con sus sesiones asistidas y no asistidas.' };
      }
    } else if (intent === 'roles_access') {
      answer.action = { type: 'roles_result', data: all('SELECT id, name, is_system FROM roles ORDER BY name') };
    } else if (intent === 'automation_run') {
      answer.action = { type: 'automation_list', data: all('SELECT id, name, active FROM automation_rules ORDER BY name') };
    } else answer.blocked = 'Acción no disponible.';
  } else if (mode === 'diagnose') {
    answer.diagnosis = {
      possibleCauses: hit
        ? ['La consulta corresponde a una acción con permisos asociados', 'Podría requerir datos adicionales del paciente']
        : ['Términos no reconocidos por el asistente'],
      recommended: hit ? [hit.suggestion] : ['Reformula usando: inasistencias, restricción, paciente, informe, roles'],
    };
    if (hit && allowed) {
      answer.action = { type: 'read_only_preview', data: intent === 'consult_attendance_policy' ? getAttendanceConfig() : null };
    }
  } else if (hit && allowed) {
    answer.action = { type: 'read_only_preview', data: intent === 'consult_attendance_policy' ? getAttendanceConfig() : null };
  }

  insert('ai_logs', {
    id: uid('ail_'), user_id: req.user.id, mode, prompt: String(prompt).slice(0, 500),
    result: JSON.stringify({ intent, allowed }).slice(0, 500), tools_used: '[]', status: 'ok', created_at: nowISO(),
  });
  audit(req.user, `ia_${mode}`, 'ai', null, { intent, allowed });
  res.json(answer);
}));

// === System diagnostics ===
adminAdvancedRouter.get('/system/diagnostics', wrap(async (req, res) => {
  const diagnostics = all('SELECT * FROM system_diagnostics ORDER BY created_at DESC LIMIT 50');
  res.json({ diagnostics, count: diagnostics.length });
}));
