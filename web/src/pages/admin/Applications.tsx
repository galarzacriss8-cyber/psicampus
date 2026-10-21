import { useState } from 'react';
import {
  BadgeCheck, CalendarDays, CheckCircle2, Copy, GraduationCap, Mail, MapPin, Phone, UserPlus, XCircle, Video,
} from 'lucide-react';
import { api } from '../../lib/api';
import { AdminPage } from '../../components/AdminLayout';
import { Avatar, Badge, CopyButton, Empty, ErrorState, Field, Loader, Modal, StatusBadge, useFetch, useToast } from '../../lib/ui';
import { dateShort, money } from '../../lib/format';

const TABS = [
  ['pendiente', 'Pendientes'],
  ['aprobada', 'Aprobadas'],
  ['rechazada', 'Rechazadas'],
  ['todas', 'Todas'],
];

export function AdminApplications() {
  const toast = useToast();
  const [tab, setTab] = useState('pendiente');
  const [approve, setApprove] = useState<any>(null);
  const [reject, setReject] = useState<any>(null);
  const [credentials, setCredentials] = useState<any>(null);
  const [form, setForm] = useState<any>({ password: 'Psicampus2026!', priceBase: 20, room: 'Consultorio por asignar' });
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useFetch<any[]>(() => api('/admin/applications?status=todas'), []);
  const list = (data || []).filter((a) => tab === 'todas' || a.status === tab);
  const pending = (data || []).filter((a) => a.status === 'pendiente');

  const approveApp = async () => {
    setBusy(true);
    try {
      const res = await api(`/admin/applications/${approve.id}`, { method: 'PATCH', body: { action: 'approve', ...form, priceBase: Number(form.priceBase) } });
      setCredentials(res.credentials);
      setApprove(null);
      toast.success('Profesional aprobado y perfil creado');
      reload();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const rejectApp = async () => {
    setBusy(true);
    try {
      await api(`/admin/applications/${reject.id}`, { method: 'PATCH', body: { action: 'reject', note } });
      toast.success('Solicitud rechazada');
      setReject(null); setNote(''); reload();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <AdminPage
      title="Solicitudes de profesionales"
      subtitle="Tú decides qué terapeutas pueden unirse. Revisa cada perfil antes de aprobarlo."
      actions={
        <a className="btn btn-sm btn-ghost" href="/#/trabaja-con-nosotros" target="_blank" rel="noreferrer">
          Ver formulario público
        </a>
      }
    >
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="kpi dark"><div className="label"><UserPlus /> Por revisar</div><div className="value">{pending.length}</div><div className="delta" style={{ color: '#a7d8bd' }}>Solicitudes nuevas</div></div>
        <div className="kpi"><div className="label"><CheckCircle2 /> Aprobadas</div><div className="value">{(data || []).filter((a) => a.status === 'aprobada').length}</div><div className="delta"><span>Ya trabajan contigo</span></div></div>
        <div className="kpi"><div className="label"><XCircle /> Rechazadas</div><div className="value">{(data || []).filter((a) => a.status === 'rechazada').length}</div><div className="delta down"><span>Con nota interna</span></div></div>
      </div>

      <div className="segmented wrap" style={{ marginBottom: 16 }}>
        {TABS.map(([v, l]) => <button key={v} className={tab === v ? 'on' : ''} onClick={() => setTab(v)}>{l}</button>)}
      </div>

      {loading && !data ? <Loader /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <>
          {tab === 'pendiente' && (
            <div className="grid-2">
              {list.map((a) => (
                <div className="panel" key={a.id}>
                  <div className="panel-body">
                    <div style={{ display: 'flex', gap: 14 }}>
                      <Avatar src={a.photo} name={a.name} size="lg" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="row-between" style={{ alignItems: 'flex-start' }}>
                          <div>
                            <strong style={{ fontSize: 15 }}>{a.name}</strong>
                            <div className="tiny muted">{a.degree}</div>
                            <div className="hstack" style={{ gap: 5, marginTop: 5 }}>
                              <Badge tone="sage" dot={false}>{a.gender === 'femenino' ? 'Mujer' : 'Hombre'}</Badge>
                              <Badge tone="sage" dot={false}>{a.years} años exp.</Badge>
                              <Badge tone="info" dot={false}>{a.modality === 'virtual' ? 'Virtual' : a.modality === 'presencial' ? 'Presencial' : 'Presencial y virtual'}</Badge>
                            </div>
                          </div>
                          <span className="tiny muted">{dateShort(a.created_at)}</span>
                        </div>
                        <div className="tiny muted" style={{ marginTop: 8 }}><GraduationCap style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />{a.university} · {a.license || 'sin registro'}</div>
                        <div className="chip-list" style={{ marginTop: 8 }}>
                          {a.approaches.slice(0, 3).map((x: string) => <span className="tag" key={x}>{x}</span>)}
                        </div>
                        <p className="small" style={{ margin: '10px 0', color: 'var(--ink-soft)', lineHeight: 1.55 }}>{a.description}</p>
                        <div className="hstack small muted" style={{ gap: 14, marginBottom: 12 }}>
                          <span><Mail style={{ width: 12, height: 12, display: 'inline', marginRight: 3 }} />{a.email}</span>
                          <span><Phone style={{ width: 12, height: 12, display: 'inline', marginRight: 3 }} />{a.phone}</span>
                        </div>
                        <div className="hstack">
                          <button className="btn btn-sm" onClick={() => { setApprove(a); setForm({ password: 'Psicampus2026!', priceBase: 20, room: 'Consultorio por asignar' }); }}>
                            <CheckCircle2 /> Aprobar y crear perfil
                          </button>
                          <button className="btn btn-sm btn-danger-soft" onClick={() => { setReject(a); setNote(''); }}>
                            <XCircle /> Rechazar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {list.length === 0 && (
                <div className="panel" style={{ gridColumn: '1/-1' }}>
                  <Empty title="No hay solicitudes pendientes" text="Cuando un profesional envíe su perfil aparecerá aquí para que decidas." icon={<UserPlus />} />
                </div>
              )}
            </div>
          )}

          {tab !== 'pendiente' && (
            <div className="panel">
              <div className="table-wrap">
                <table className="data">
                  <thead><tr><th>Profesional</th><th>Formación</th><th>Modalidad</th><th>Fecha</th><th>Estado</th><th>Nota</th></tr></thead>
                  <tbody>
                    {list.map((a) => (
                      <tr key={a.id}>
                        <td><div className="cell-main"><Avatar src={a.photo} name={a.name} size="sm" /><div className="meta"><strong>{a.name}</strong><span>{a.email}</span></div></div></td>
                        <td><span style={{ fontSize: 12 }}>{a.degree}</span><div className="tiny muted">{a.university}</div></td>
                        <td>{a.modality === 'virtual' ? <><Video style={{ width: 12, height: 12 }} /> Virtual</> : <><MapPin style={{ width: 12, height: 12 }} /> {a.modality}</>}</td>
                        <td>{dateShort(a.created_at)}</td>
                        <td><Badge tone={a.status === 'aprobada' ? 'success' : a.status === 'rechazada' ? 'danger' : 'warning'}>{a.status}</Badge></td>
                        <td className="tiny muted" style={{ maxWidth: 260 }}>{a.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {list.length === 0 && <Empty title="Sin solicitudes en esta categoría" icon={<UserPlus />} />}
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        open={!!approve}
        onClose={() => setApprove(null)}
        title="Aprobar profesional"
        subtitle={approve ? `${approve.name} · ${approve.email}` : ''}
        footer={<><button className="btn btn-ghost" onClick={() => setApprove(null)}>Cancelar</button><button className="btn" onClick={approveApp} disabled={busy}>{busy ? 'Creando perfil…' : 'Aprobar y crear cuenta'}</button></>}
      >
        {approve && (
          <>
            <div className="notice notice-info" style={{ marginBottom: 14 }}>
              <BadgeCheck />
              <span>Se creará su perfil público de terapeuta y una cuenta para que vea su agenda. Podrás desactivarlo cuando quieras desde Terapeutas.</span>
            </div>
            <div className="form-grid">
              <Field label="Contraseña temporal" className="span-2" hint="Compártela con el profesional. Podrá cambiarla después.">
                <input className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </Field>
              <Field label="Aporte base (USD)"><input className="input" type="number" value={form.priceBase} onChange={(e) => setForm({ ...form, priceBase: e.target.value })} /></Field>
              <Field label="Consultorio"><input className="input" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} /></Field>
            </div>
            <div className="detail-list" style={{ marginTop: 12 }}>
              <div className="detail-row"><span>Universidad</span><strong>{approve.university}</strong></div>
              <div className="detail-row"><span>Formación</span><strong>{approve.degree}</strong></div>
              <div className="detail-row"><span>Enfoques</span><strong>{approve.approaches.join(' · ')}</strong></div>
              <div className="detail-row"><span>Experiencia</span><strong>{approve.years} años</strong></div>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={!!reject}
        onClose={() => setReject(null)}
        title="Rechazar solicitud"
        subtitle={reject ? reject.name : ''}
        footer={<><button className="btn btn-ghost" onClick={() => setReject(null)}>Cancelar</button><button className="btn btn-danger" onClick={rejectApp} disabled={busy}>{busy ? 'Guardando…' : 'Rechazar solicitud'}</button></>}
      >
        <Field label="Motivo interno" hint="Queda guardado en la ficha de la solicitud.">
          <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. Sin cupos este semestre, perfil no coincide con la especialidad requerida…" />
        </Field>
      </Modal>

      <Modal
        open={!!credentials}
        onClose={() => setCredentials(null)}
        title="Perfil creado"
        subtitle="Comparte estas credenciales con el profesional"
        footer={<button className="btn" onClick={() => setCredentials(null)}>Entendido</button>}
      >
        {credentials && (
          <>
            <div className="notice" style={{ marginBottom: 14 }}><CheckCircle2 /><span>El terapeuta ya aparece en el equipo y puede recibir citas si tiene horarios configurados.</span></div>
            <div className="pay-box">
              <div className="pay-row"><span>Usuario</span><strong>{credentials.user}</strong></div>
              <div className="pay-row"><span>Contraseña temporal</span><strong>{credentials.password}</strong></div>
              <div className="pay-row"><span>Acceso</span><strong>/#/login</strong></div>
            </div>
            <div className="hstack" style={{ marginTop: 12 }}>
              <CopyButton text={`Usuario: ${credentials.user}\nContraseña: ${credentials.password}\nAcceso: ${location.origin}/#/login`} label="Copiar credenciales" />
              <a className="btn btn-sm btn-ghost" href="/#/admin/horarios">Configurar horarios</a>
            </div>
            <p className="tiny muted" style={{ marginTop: 10 }}>Recuerda asignarle horarios para que aparezca disponible en la agenda pública.</p>
          </>
        )}
      </Modal>
    </AdminPage>
  );
}
