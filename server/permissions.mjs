import { all, get, insert, run } from './db.mjs';
import { nowISO, uid } from './util.mjs';

export const PERMISSIONS = [
  'pacientes.ver', 'pacientes.crear', 'pacientes.editar', 'pacientes.suspender',
  'pacientes.desactivar', 'pacientes.eliminar', 'pacientes.exportar',
  'profesionales.ver', 'profesionales.crear', 'profesionales.editar', 'profesionales.aprobar',
  'finanzas.ver', 'finanzas.editar', 'finanzas.exportar',
  'configuracion.ver', 'configuracion.editar', 'integraciones.administrar',
  'ia.consultar', 'ia.proponer', 'ia.ejecutar', 'auditoria.ver', 'automatizaciones.editar',
  'respaldo.administrar',
];

export const DEFAULT_ROLES = [
  {
    id: 'rol_propietario', name: 'Propietario principal', is_system: 1,
    description: 'Control total de la plataforma. No puede ser eliminado ni perder el rol de propietario.',
    permissions: { '*': true },
  },
  {
    id: 'rol_admin', name: 'Administrador general', is_system: 1,
    description: 'Operación completa de la clínica excepto proprietor-level destructive actions.',
    permissions: {
      'pacientes.ver': true, 'pacientes.crear': true, 'pacientes.editar': true,
      'pacientes.suspender': true, 'pacientes.exportar': true,
      'profesionales.ver': true, 'profesionales.crear': true, 'profesionales.editar': true, 'profesionales.aprobar': true,
      'finanzas.ver': true, 'finanzas.editar': true, 'finanzas.exportar': true,
      'configuracion.ver': true, 'configuracion.editar': true,
      'ia.consultar': true, 'ia.proponer': true,
      'auditoria.ver': true,
    },
  },
  {
    id: 'rol_admin_pacientes', name: 'Administrador de pacientes', is_system: 1,
    description: 'Gestiona fichas, políticas de asistencia y restricciones. Sin acceso a finanzas ni IA.',
    permissions: {
      'pacientes.ver': true, 'pacientes.crear': true, 'pacientes.editar': true,
      'pacientes.suspender': true, 'pacientes.exportar': true, 'auditoria.ver': true,
    },
  },
  {
    id: 'rol_admin_profesionales', name: 'Administrador de profesionales', is_system: 1,
    description: 'Revisa y aprueba solicitudes de terapeutas, gestiona sus perfiles y horarios.',
    permissions: {
      'profesionales.ver': true, 'profesionales.crear': true, 'profesionales.editar': true, 'profesionales.aprobar': true,
      'pacientes.ver': true,
    },
  },
  {
    id: 'rol_finanzas', name: 'Responsable de facturación', is_system: 1,
    description: 'Valida comprobantes, registra ingresos y egresos y consulta la contabilidad.',
    permissions: {
      'finanzas.ver': true, 'finanzas.editar': true, 'finanzas.exportar': true,
      'pacientes.ver': true,
    },
  },
  {
    id: 'rol_soporte', name: 'Responsable de soporte técnico', is_system: 1,
    description: 'Diagnóstico técnico, integraciones y automatizaciones. Sin acceso a historiales clínicos.',
    permissions: {
      'configuracion.ver': true, 'integraciones.administrar': true, 'automatizaciones.editar': true,
      'ia.consultar': true, 'ia.proponer': true, 'ia.ejecutar': true, 'auditoria.ver': true,
    },
  },
  {
    id: 'rol_configuracion', name: 'Responsable de configuración', is_system: 1,
    description: 'Edita configuración de plataforma, marca y políticas. No ejecuta acciones sobre pacientes.',
    permissions: {
      'configuracion.ver': true, 'configuracion.editar': true, 'ia.consultar': true, 'auditoria.ver': true,
    },
  },
];

export function ensureRoles() {
  for (const r of DEFAULT_ROLES) {
    const existing = get('SELECT id FROM roles WHERE id = ?', r.id);
    if (!existing) {
      insert('roles', {
        id: r.id, name: r.name, description: r.description,
        permissions: JSON.stringify(r.permissions), is_system: r.is_system, created_at: nowISO(),
      });
    }
  }
  // Asegurar que el usuario admin principal sea propietario
  const owner = get('SELECT id FROM users WHERE role = ? LIMIT 1', 'admin');
  if (owner) {
    const has = get('SELECT id FROM user_roles WHERE user_id = ? AND role_id = ?', owner.id, 'rol_propietario');
    if (!has) {
      insert('user_roles', { id: uid('ur_'), user_id: owner.id, role_id: 'rol_propietario', assigned_by: owner.id, assigned_at: nowISO() });
    }
  }
}

export function rolesForUser(userId) {
  const rows = all('SELECT r.* FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ?', userId);
  return rows.map((r) => ({ ...r, permissions: safePerms(r.permissions) }));
}

export function safePerms(v) {
  try { const p = JSON.parse(v || '{}'); return p && typeof p === 'object' ? p : {}; } catch { return {}; }
}

export function permissionsForUser(user) {
  if (!user) return {};
  const roles = rolesForUser(user.id);
  const merged = {};
  for (const r of roles) {
    if (r.permissions['*'] === true) return { '*': true };
    Object.assign(merged, r.permissions);
  }
  // Fallback: usuarios admin existentes sin roles asignados conservan acceso operativo
  if (user.role === 'admin' && roles.length === 0) {
    return { ...Object.fromEntries(PERMISSIONS.map((p) => [p, true])), '*': false };
  }
  return merged;
}

export function can(user, permission) {
  const perms = permissionsForUser(user);
  if (perms['*'] === true) return true;
  return perms[permission] === true;
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Sesión no válida' });
    if (!can(req.user, permission)) {
      return res.status(403).json({ error: `Tu cuenta no tiene el permiso "${permission}". Solicítalo al propietario.` });
    }
    next();
  };
}

export function isOwner(user) {
  return rolesForUser(user?.id || '').some((r) => r.id === 'rol_propietario');
}
