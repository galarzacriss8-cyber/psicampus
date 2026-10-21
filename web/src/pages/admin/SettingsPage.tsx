import { useEffect, useState } from 'react';
import { Building2, Clock, KeyRound, Plus, Save, ShieldCheck, SlidersHorizontal, UserPlus, Users, Sparkles, Zap, Wifi, Activity, BarChart3, Settings, FileText, Lock, Cog, BrainCircuit } from 'lucide-react';
import { api } from '../../lib/api';
import { AdminPage } from '../../components/AdminLayout';
import { Badge, Empty, ErrorState, Field, Loader, Modal, useFetch, useToast } from '../../lib/ui';
import { dateShort } from '../../lib/format';

const TABS = [
  ['general', 'General'],
  ['usuarios', 'Usuarios'],
  ['auditoria', 'Auditoría'],
  ['policiticas', 'Políticas'],
  ['automatizaciones', 'Automatizaciones'],
  ['integraciones', 'Integraciones'],
  ['ia', 'Asistente IA'],
  ['correo', 'Correo'],
];

export function AdminSettings() {
  const toast = useToast();
  const [tab, setTab] = useState('general');
  const [newUser, setNewUser] = useState(false);
  const { data, loading, error, reload } = useFetch<any>(() => api('/admin/settings'), []);
  const { data: users, reload: reloadUsers } = useFetch<any[]>(() => api('/admin/users'), []);
  const { data: audit } = useFetch<any[]>(() => api('/admin/audit'), []);
  const [s, setS] = useState<any>(null);
  const [pwd, setPwd] = useState({ current: '', next: '' });

  useEffect(() => { if (data?.settings) setS(JSON.parse(JSON.stringify(data.settings))); }, [data]);

  const save = async () => {
    await api('/admin/settings', { method: 'PUT', body: { ...s } });
    toast.success('Configuración guardada'); reload();
  };

  const changePassword = async () => {
    if (pwd.next.length < 8) return toast.error('La nueva contraseña debe tener al menos 8 caracteres');
    await api('/auth/change-password', { method: 'POST', body: pwd });
    toast.success('Contraseña actualizada'); setPwd({ current: '', next: '' });
  };

  const toggleUser = async (u: any) => {
    try { await api(`/admin/users/${u.id}`, { method: 'PATCH', body: { active: !u.active } }); toast.success(u.active ? 'Desactivado' : 'Activado'); reloadUsers(); } catch (e: any) { toast.error(e.message); }
  };

  if (loading && !s) return <Loader />;
  if (error || !s) return <ErrorState message={error || ''} onRetry={reload} />;

  return (
    <AdminPage title="Configuración" subtitle="Administración completa de la plataforma Psyconova." actions={<button className="btn btn-sm" onClick={save}><Save /> Guardar cambios</button>}>
      <div className="tabs-line">{TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>

      {tab === 'general' && (
        <div className="grid-2">
          <div className="panel"><div className="panel-head"><h3><Building2 /> Marca</h3></div>
            <div className="panel-body"><div className="form-grid">
              <Field label="Nombre"><input className="input" value={s.brand?.name || ''} onChange={e => setS({ ...s, brand: { ...s.brand, name: e.target.value } })}/></Field>
              <Field label="Claim"><input className="input" value={s.brand?.claim || ''} onChange={e => setS({ ...s, brand: { ...s.brand, claim: e.target.value } })}/></Field>
            </div></div></div>
          <div className="panel"><div className="panel-head"><h3><Clock /> Reservas</h3></div>
            <div className="panel-body"><div className="form-grid">
              <Field label="Duración (min)"><input className="input" type="number" value={s.booking?.slotMinutes || 50}/></Field>
              <Field label="Anticipación (días)"><input className="input" type="number" value={s.booking?.maxAdvanceDays || 45}/></Field>
            </div></div></div>
          <div className="panel"><div className="panel-head"><h3><ShieldCheck /> Políticas generales</h3></div>
            <div className="panel-body"><p className="small muted">Políticas de cancelación, asistencia y reprogramación.</p></div></div>
          <div className="panel"><div className="panel-head"><h3><KeyRound /> Mi contraseña</h3></div>
            <div className="panel-body">
              <Field label="Actual"><input className="input" type="password" value={pwd.current} onChange={e => setPwd({ ...pwd, current: e.target.value })}/></Field>
              <Field label="Nueva"><input className="input" type="password" value={pwd.next} onChange={e => setPwd({ ...pwd, next: e.target.value })}/></Field>
              <button className="btn btn-sm" onClick={changePassword}><Lock /> Actualizar</button>
            </div></div>
        </div>
      )}

      {tab === 'usuarios' && (
        <div className="panel">
          <div className="panel-head"><h3><Users /> Usuarios</h3><button className="btn btn-sm" onClick={() => setNewUser(true)}><UserPlus /> Crear usuario</button></div>
          <div className="table-wrap"><table className="data"><thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {(users || []).map(u => (
              <tr key={u.id}>
                <td><strong>{u.name}</strong><div className="tiny muted">{u.email}</div></td>
                <td><Badge tone={u.role === 'admin' ? 'forest' : 'info'}>{u.role}</Badge></td>
                <td><Badge tone={u.active ? 'success' : 'danger'}>{u.active ? 'Activo' : 'Inactivo'}</Badge></td>
                <td className="t-right"><button className="btn btn-sm btn-ghost" onClick={() => toggleUser && toggleUser(u)}>Modificar</button></td>
              </tr>
            ))}
          </tbody></table></div>
        </div>
      )}

      {tab === 'policiticas' && <PoliticasTab />}

      {tab === 'automatizaciones' && (
        <div className="panel"><div className="panel-head"><h3><Zap /> Automatizaciones</h3></div>
          <div className="panel-body"><p>Reglas automatizadas para alertas, restricciones y notificaciones. Defina umbrales y acciones automáticas.</p></div>
        </div>
      )}

      {tab === 'integraciones' && (
        <div className="panel"><div className="panel-head"><h3><Wifi /> Integraciones</h3></div>
          <div className="panel-body"><p>Estado de integraciones con servicios externos, verificación de conectividad y diagnóstico de errores.</p></div>
        </div>
      )}

      {tab === 'ia' && (
        <div className="panel"><div className="panel-head"><h3><Sparkles /> Asistente IA</h3></div>
          <div className="panel-body"><p>Asistente administrativo con modos de consulta, diagnóstico y ejecución. Las acciones sensibles requieren confirmación.</p>
            <div className="notice"><BrainCircuit /><span>Las acciones con impacto en pacientes requieren confirmación y quedan registradas en auditoría.</span></div>
          </div>
        </div>
      )}

      {tab === 'correo' && <CorreoTab />}

      {tab === 'auditoria' && (
        <div className="panel"><div className="panel-head"><h3><FileText /> Audito</h3></div>
          <div className="panel-body"><div className="table-wrap"><table className="data"><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th></tr></thead>
          <tbody>{(audit || []).map(a => (<tr key={a.id}><td className="tiny">{dateShort(a.created_at)}</td><td>{a.user_name || '—'}</td><td>{a.action}</td></tr>))}</tbody></table></div></div>
        </div>
      )}

      {newUser && <NewUserModal onClose={() => setNewUser(false)} onSaved={() => { setNewUser(false); reloadUsers(); }} />}
    </AdminPage>
  );
}

function PoliticasTab() {
  const toast = useToast();
  const { data: cfgData } = useFetch<any>(() => api('/admin-advanced/attendance/config'), []);
  const [cfg, setCfg] = useState<any>({ alertAfterNoShows: 2, restrictAfterNoShows: 3, reviewAfterNoShows: 3, windowDays: 90, restrictionDays: 30, sendWarning: true, requireReview: true, restrictBookings: true, warnThreshold: 1 });
  useEffect(() => { if (cfgData) setCfg({ ...cfg, ...cfgData }); }, [cfgData]);
  const saveCfg = async () => { await api('/admin-advanced/attendance/config', { method: 'PUT', body: cfg }); toast.success('Políticas guardadas'); };
  return (
    <div className="panel"><div className="panel-head"><h3><ShieldCheck /> Políticas de asistencia</h3></div>
      <div className="panel-body">
        <div className="form-grid">
          <Field label="Alertas por inasistencias"><input className="input" type="number" value={cfg.alertAfterNoShows} onChange={e => setCfg({ ...cfg, alertAfterNoShows: Number(e.target.value) })} /></Field>
          <Field label="Restricciones (exceso)"><input className="input" type="number" value={cfg.restrictAfterNoShows} onChange={e => setCfg({ ...cfg, restrictAfterNoShows: Number(e.target.value) })} /></Field>
          <Field label="Revisión periódica"><input className="input" type="number" value={cfg.reviewAfterNoShows} onChange={e => setCfg({ ...cfg, reviewAfterNoShows: Number(e.target.value) })} /></Field>
          <Field label="Ventana (días)"><input className="input" type="number" value={cfg.windowDays} onChange={e => setCfg({ ...cfg, windowDays: Number(e.target.value) })} /></Field>
        </div>
        <label className="check"><input type="checkbox" checked={!!cfg.sendWarning} onChange={e => setCfg({ ...cfg, sendWarning: e.target.checked })} /> Enviar alertas</label>
        <label className="check"><input type="checkbox" checked={!!cfg.restrictBookings} onChange={e => setCfg({ ...cfg, restrictBookings: e.target.checked })} /> Restringir reservas</label>
        <button className="btn btn-sm" onClick={saveCfg} style={{ marginTop: 12 }}><Save /> Guardar políticas</button>
      </div>
    </div>
  );
}

function CorreoTab() {
  const toast = useToast();
  const [cfg, setCfg] = useState<any>({ host: '', port: 465, user: '', pass: '', enabled: true });
  const { data } = useFetch<any>(() => api('/admin-advanced/smtp/settings'), []);
  useEffect(() => { if (data) setCfg({ ...data, pass: '' }); }, [data]);
  const saveSmtp = async () => { await api('/admin-advanced/smtp/settings', { method: 'PUT', body: cfg }); toast.success('SMTP guardado'); };
  const testMail = async () => { try { const r = await api('/admin-advanced/smtp/test', { method: 'POST' }); toast.success(r.ok ? 'Correo enviado' : 'Fallo'); } catch { toast.error('No se pudo enviar'); } };
  return (
    <div className="panel"><div className="panel-head"><h3>Configuración de Correo (Gmail / SMTP)</h3></div>
      <div className="panel-body">
        <div className="form-grid">
          <Field label="Host SMTP"><input className="input" value={cfg.host || ''} onChange={e => setCfg({ ...cfg, host: e.target.value })} /></Field>
          <Field label="Puerto"><input className="input" type="number" value={cfg.port || 465} onChange={e => setCfg({ ...cfg, port: Number(e.target.value) })} /></Field>
          <Field label="Usuario (email)"><input className="input" value={cfg.user || ''} onChange={e => setCfg({ ...cfg, user: e.target.value })} /></Field>
          <Field label="Contraseña / App Password"><input className="input" type="password" value={cfg.pass || ''} onChange={e => setCfg({ ...cfg, pass: e.target.value })} /></Field>
        </div>
        <label className="check"><input type="checkbox" checked={!!cfg.enabled} onChange={e => setCfg({ ...cfg, enabled: e.target.checked })} /> Habilitar envío</label>
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-sm" onClick={saveSmtp}>Guardar SMTP</button>
          <button className="btn btn-sm btn-ghost" onClick={testMail} style={{ marginLeft: 8 }}>Enviar prueba</button>
        </div>
        <div className="notice" style={{ marginTop: 12 }}><span>Para Gmail usa tu App Password, no tu contraseña normal. El correo de invitación a terapeutas se envía automáticamente al aprobar.</span></div>
      </div>
    </div>
  );
}

function NewUserModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'terapeuta', password: '' });
  const toast = useToast();
  const save = async () => {
    if (!form.name || !form.email || !form.password) return toast.error('Completa los campos requeridos');
    await api('/admin/users', { method: 'POST', body: form });
    toast.success('Usuario creado'); onSaved();
  };
  return <Modal open onClose={onClose} title="Crear usuario" footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn" onClick={save}>Crear</button></>}
    ><div className="form-grid"><Field label="Nombre"><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field><Field label="Correo"><input className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field></div></Modal>;
}
