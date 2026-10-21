import { all, get, insert, run, settings, update } from './db.mjs';
import { addDays, nowISO, todayISO, uid } from './util.mjs';

export const ATTENDANCE_CONFIG_DEFAULT = {
  alertAfterNoShows: 2,
  restrictAfterNoShows: 3,
  reviewAfterNoShows: 3,
  windowDays: 90,
  restrictionDays: 30,
  sendWarning: true,
  requireReview: true,
  restrictBookings: true,
  warnThreshold: 1,
};

export function getAttendanceConfig() {
  const s = settings().policies;
  return {
    alertAfterNoShows: Number(s.attendance?.alertAfterNoShows ?? ATTENDANCE_CONFIG_DEFAULT.alertAfterNoShows),
    restrictAfterNoShows: Number(s.attendance?.restrictAfterNoShows ?? ATTENDANCE_CONFIG_DEFAULT.restrictAfterNoShows),
    reviewAfterNoShows: Number(s.attendance?.reviewAfterNoShows ?? ATTENDANCE_CONFIG_DEFAULT.reviewAfterNoShows),
    windowDays: Number(s.attendance?.windowDays ?? ATTENDANCE_CONFIG_DEFAULT.windowDays),
    restrictionDays: Number(s.attendance?.restrictionDays ?? ATTENDANCE_CONFIG_DEFAULT.restrictionDays),
    sendWarning: s.attendance?.sendWarning ?? ATTENDANCE_CONFIG_DEFAULT.sendWarning,
    requireReview: s.attendance?.requireReview ?? ATTENDANCE_CONFIG_DEFAULT.requireReview,
    restrictBookings: s.attendance?.restrictBookings ?? ATTENDANCE_CONFIG_DEFAULT.restrictBookings,
    warnThreshold: Number(s.attendance?.warnThreshold ?? ATTENDANCE_CONFIG_DEFAULT.warnThreshold),
  };
}

export function recordAttendanceAction(patientId, userId, userName, action, detail = {}) {
  insert('patient_actions', {
    id: uid('pact_'),
    patient_id: patientId,
    actor_id: userId || null,
    actor_name: userName || null,
    action,
    category: detail.category || 'asistencia',
    detail: detail ? JSON.stringify(detail) : null,
    created_at: nowISO(),
  });
}

export function classifyNoShows(patientId) {
  const cfg = getAttendanceConfig();
  const windowStart = addDays(todayISO(), -cfg.windowDays);
  const appointments = all(
    `SELECT a.*, p.name, t.name AS therapist_name FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     LEFT JOIN therapists t ON t.id = a.therapist_id
     WHERE a.patient_id = ? AND a.status IN ('no_asistio','cancelada','reprogramada','completada')
     AND a.date >= ? ORDER BY a.date DESC`,
    patientId, windowStart);

  const breakdown = {
    noShow: [],
    lateCancel: [],
    reprogrammed: [],
    completed: [],
    inWindow: { noShow: 0, lateCancel: 0, reprogrammed: 0, completed: 0 },
  };

  const cancelHours = Number(settings().policies.cancellationHours || 24);

  for (const a of appointments) {
    if (a.status === 'no_asistio') {
      breakdown.noShow.push(a);
      breakdown.inWindow.noShow++;
    } else if (a.status === 'cancelada') {
      const scheduledAt = `${a.date}T${a.start}`;
      const cancelTime = new Date(a.updated_at || a.created_at || a.date);
      const scheduledTime = new Date(scheduledAt);
      const diffHours = (scheduledTime - cancelTime) / 36e5;
      if (diffHours < cancelHours) {
        breakdown.lateCancel.push(a);
        breakdown.inWindow.lateCancel++;
      } else {
        breakdown.inWindow.noShow++; // late cancels count toward restriction threshold
        breakdown.noShow.push(a);
      }
    } else if (a.status === 'reprogramada') {
      breakdown.reprogrammed.push(a);
      breakdown.inWindow.reprogrammed++;
    } else if (a.status === 'completada') {
      breakdown.completed.push(a);
      breakdown.inWindow.completed++;
    }
  }

  const totalFlagged = breakdown.inWindow.noShow + breakdown.inWindow.lateCancel;
  const policyAction = {
    level: totalFlagged >= cfg.restrictAfterNoShows ? 'restrict' :
            totalFlagged >= cfg.reviewAfterNoShows ? 'review' :
            totalFlagged >= cfg.warnThreshold ? 'warn' : 'none',
    reason: `Paciente acumula ${totalFlagged} inasistencias/llegadas tardías en ${cfg.windowDays} días`,
    threshold: cfg.restrictAfterNoShows,
    current: totalFlagged,
  };
  return { appointments, breakdown, totalFlagged, policyAction };
}

export function applyAttendancePolicy(patientId, adminUserId, adminName) {
  const p = get('SELECT * FROM patients WHERE id = ?', patientId);
  if (!p) throw new Error('Paciente no encontrado');
  const { breakdown, totalFlagged, policyAction } = classifyNoShows(patientId);
  const cfg = getAttendanceConfig();

  // Si no hay inasistencias no flaggeadas, levantar restricciones activas
  if (totalFlagged < cfg.warnThreshold) {
    clearActiveRestrictions(patientId);
    return { patient: p, ...policyAction, breakdown, cleared: true };
  }

  // Determinar si hay una restricción activa actualmente
  const active = get('SELECT * FROM patient_restrictions WHERE patient_id = ? AND kind = ? AND active = 1 ORDER BY created_at DESC LIMIT 1', patientId, 'asistencia');

  switch (policyAction.level) {
    case 'warn':
      if (!active) {
        if (cfg.sendWarning) {
          insert('patient_restrictions', {
            id: uid('pres_'),
            patient_id: patientId,
            kind: 'alerta',
            reason: policyAction.reason,
            starts_at: todayISO(),
            created_by: adminUserId,
            created_at: nowISO(),
          });
        }
        recordAttendanceAction(patientId, adminUserId, adminName, 'alerta_asistencia', { ...policyAction, breakdown });
      }
      break;
    case 'review':
      if (!active) {
        if (cfg.requireReview) {
          insert('patient_restrictions', {
            id: uid('pres_'),
            patient_id: patientId,
            kind: 'revisión',
            reason: policyAction.reason,
            starts_at: todayISO(),
            created_by: adminUserId,
            created_at: nowISO(),
          });
        }
        recordAttendanceAction(patientId, adminUserId, adminName, 'revision_asistencia', { ...policyAction, breakdown });
      }
      break;
    case 'restrict':
      const endsAt = active ? active.ends_at : addDays(todayISO(), cfg.restrictionDays);
      if (!active) {
        insert('patient_restrictions', {
          id: uid('pres_'),
          patient_id: patientId,
          kind: 'restricción',
          reason: policyAction.reason,
          starts_at: todayISO(),
          ends_at: endsAt,
          created_by: adminUserId,
          created_at: nowISO(),
        });
        recordAttendanceAction(patientId, adminUserId, adminName, 'restriccion_asistencia', { ...policyAction, endsAt, breakdown });
      }
      break;
  }

  return { patient: p, ...policyAction, breakdown, restricted: !!active || policyAction.level === 'restrict' };
}

export function clearActiveRestrictions(patientId) {
  run('UPDATE patient_restrictions SET active = 0, lifted_by = ?, lifted_at = ? WHERE patient_id = ? AND active = 1', 'sistema', nowISO(), patientId);
}

export function checkBookingAllowed(patientId) {
  const r = get(`SELECT * FROM patient_restrictions WHERE patient_id = ? AND kind = 'restricción' AND active = 1 AND (ends_at IS NULL OR ends_at > ?)`, patientId, todayISO());
  return { allowed: !r, restriction: r || null };
}

export function checkLegalRetention(patientId) {
  const p = get('SELECT * FROM patients WHERE id = ?', patientId);
  const hasPayments = get('SELECT COUNT(*) AS c FROM payments WHERE patient_id = ? AND status = ?', patientId, 'verificado')?.c || 0;
  const hasAppointments = get('SELECT COUNT(*) AS c FROM appointments WHERE patient_id = ?', patientId)?.c || 0;
  const legalDocuments = get('SELECT COUNT(*) AS c FROM session_notes WHERE patient_id = ?', patientId)?.c || 0;
  const retentionYears = 5;
  const lastAppointment = get('SELECT date FROM appointments WHERE patient_id = ? ORDER BY date DESC LIMIT 1', patientId)?.date || null;
  const mustRetain = hasPayments > 0 || hasAppointments > 0 || legalDocuments > 0;
  return {
    patient: p,
    mustRetain,
    retentionPeriod: `${retentionYears} años`,
    retentionReason: mustRetain
      ? `El paciente tiene ${hasAppointments} citas, ${hasPayments} pagos registrados y ${legalDocuments} notas clínicas que deben conservarse mínimo ${retentionYears} años por obligaciones contables y clínicas.`
      : 'No se encontraron registros que obligen a conservar los datos.',
    lastAppointment: lastAppointment,
  };
}

export function deactivatePatient(patientId, reason, adminUserId, adminName) {
  const p = get('SELECT * FROM patients WHERE id = ?', patientId);
  if (!p) throw new Error('Paciente no encontrado');
  run('UPDATE patients SET status = ? WHERE id = ?', 'inactivo', patientId);
  run('UPDATE users SET active = 0 WHERE id = ?', p.user_id);
  recordAttendanceAction(patientId, adminUserId, adminName, 'desactivar', { reason, prevStatus: p.status });
}

export function suspendPatient(patientId, days, reason, adminUserId, adminName) {
  const endsAt = addDays(todayISO(), Number(days));
  insert('patient_restrictions', {
    id: uid('pres_'),
    patient_id: patientId,
    kind: 'suspensión',
    reason,
    starts_at: todayISO(),
    ends_at: endsAt,
    created_by: adminUserId,
    created_at: nowISO(),
  });
  recordAttendanceAction(patientId, adminUserId, adminName, 'suspender', { reason, endsAt });
}

export function anonymizePatient(patientId, adminUserId, adminName) {
  const p = get('SELECT * FROM patients WHERE id = ?', patientId);
  if (!p) throw new Error('Paciente no encontrado');
  const anonName = '[DATOS ANONIMIZADOS]';
  run('UPDATE patients SET name = ?, email = ?, phone = NULL, university = NULL, career = NULL, notes = NULL, tags = ? WHERE id = ?',
    `${anonName} ${p.id.slice(0, 6)}`, `anon-${p.id.slice(0, 8)}@deleted.local`, '[]', patientId);
  run('UPDATE users SET active = 0, email = ? WHERE id = ?', `anon-${p.id.slice(0, 8)}@deleted.local`, p.user_id);
  recordAttendanceAction(patientId, adminUserId, adminName, 'anonimizar', { reason: 'Solicitud de borrado ejercida' });
}
