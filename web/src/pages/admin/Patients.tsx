import { useEffect, useState } from 'react';
import {
  CalendarDays, ClipboardList, FileText, Mail, Pencil, Phone, Plus, Search, Stethoscope, Users, Wallet, X,
} from 'lucide-react';
import { api } from '../../lib/api';
import { AdminPage } from '../../components/AdminLayout';
import { Avatar, Badge, Drawer, Empty, ErrorState, Field, FreqBadge, Loader, Modal, PayBadge, StatusBadge, useFetch, useToast } from '../../lib/ui';
import { dateMed, dateShort, money, time12, today } from '../../lib/format';

export function AdminPatients() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [freq, setFreq] = useState('todos');
  const [status, setStatus] = useState('todos');
  const [therapistId, setTherapistId] = useState('todos');
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [tab, setTab] = useState('resumen');
  const [edit, setEdit] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  const { data: therapists } = useFetch<any[]>(() => api('/admin/therapists'), []);
  const { data: cfg } = useFetch<any>(() => api('/admin/settings'), []);
  const { data, loading, error, reload } = useFetch<any[]>(
    () => api(`/admin/patients?q=${encodeURIComponent(q)}&freq=${freq}&status=${status}&therapistId=${therapistId}`),
    [q, freq, status, therapistId]
  );

  const openPatient = async (id: string) => {
    setOpen(true); setTab('resumen'); setDetail(null);
    try { setDetail(await api(`/admin/patients/${id}`)); } catch (e: any) { toast.error(e.message); }
  };

  const save = async (patch: any) => {
    try {
      await api(`/admin/patients/${detail.patient.id}`, { method: 'PATCH', body: patch });
      toast.success('Paciente actualizado');
      const d = await api(`/admin/patients/${detail.patient.id}`);
      setDetail(d); setEdit(null); reload();
    } catch (e: any) { toast.error(e.message); }
  };

  const list = data || [];
  const counts = {
    total: list.length,
    frecuente: list.filter((p) => p.frequency.type === 'frecuente').length,
    ocasional: list.filter((p) => p.frequency.type === 'ocasional').length,
    inactivo: list.filter((p) => p.frequency.type === 'inactivo').length,
  };

  return (
    <AdminPage
      title="Pacientes"
      subtitle="Historial, frecuencia de asistencia, tarifas y seguimiento."
      actions={<button className="btn btn-sm" onClick={() => setCreating(true)}><Plus /> Nuevo paciente</button>}
    >
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="kpi"><div className="label"><Users /> Total</div><div className="value">{counts.total}</div></div>
        <div className="kpi"><div className="label">Frecuentes</div><div className="value" style={{ color: 'var(--success)' }}>{counts.frecuente}</div></div>
        <div className="kpi"><div className="label">Ocasionales</div><div className="value" style={{ color: 'var(--info)' }}>{counts.ocasional}</div></div>
        <div className="kpi"><div className="label">No frecuentes</div><div className="value" style={{ color: 'var(--warning)' }}>{counts.inactivo}</div></div>
      </div>

      <div className="toolbar">
        <div className="search" style={{ maxWidth: 280 }}>
          <Search />
          <input className="input input-sm" placeholder="Nombre, correo, universidad" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select input-sm" value={freq} onChange={(e) => setFreq(e.target.value)}>
          <option value="todos">Toda frecuencia</option>
          <option value="frecuente">Frecuentes</option>
          <option value="ocasional">Ocasionales</option>
          <option value="inactivo">No frecuentes</option>
          <option value="nuevo">Nuevos</option>
        </select>
        <select className="select input-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="todos">Todos</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
        <select className="select input-sm" value={therapistId} onChange={(e) => setTherapistId(e.target.value)}>
          <option value="todos">Todos los terapeutas</option>
          {(therapists || []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <span className="spacer" />
        <span className="tiny muted">{list.length} pacientes</span>
      </div>

      {loading && !data ? <Loader /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <div className="panel">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Paciente</th><th>Universidad / carrera</th><th>Frecuencia</th><th>Sesiones</th><th>Última sesión</th><th>Aporte</th><th>Estado</th><th /></tr></thead>
              <tbody>
                {list.map((p: any) => (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => openPatient(p.id)}>
                    <td><div className="cell-main"><Avatar name={p.name} size="sm" /><div className="meta"><strong>{p.name}</strong><span>{p.email}</span></div></div></td>
                    <td><span style={{ fontSize: 12 }}>{p.university || '—'}</span><div className="tiny muted">{p.career || ''} {p.semester ? `· ${p.semester}` : ''}</div></td>
                    <td><FreqBadge type={p.frequency.type} /></td>
                    <td>{p.sessions_total} <span className="tiny muted">· {p.no_shows} faltas</span></td>
                    <td>{p.last_visit ? dateShort(p.last_visit) : '—'}<div className="tiny muted">{p.frequency.daysSince != null ? `hace ${p.frequency.daysSince} días` : ''}</div></td>
                    <td className="money">{money(p.assigned_price)}</td>
                    <td><Badge tone={p.status === 'activo' ? 'success' : 'warning'}>{p.status}</Badge></td>
                    <td className="t-right" onClick={(e) => e.stopPropagation()}>
                      <div className="row-actions">
                        <button className="icon-btn" onClick={() => { setEdit({ ...p, tierCode: p.tier_code, assignedPrice: p.assigned_price }); }}><Pencil /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && <Empty title="No hay pacientes con esos filtros" icon={<Users />} />}
          </div>
        </div>
      )}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        wide
        title={detail?.patient?.name || 'Paciente'}
        subtitle={detail ? `${detail.patient.email} · ${detail.patient.university || 'Sin institución'}` : 'Cargando…'}
        footer={detail && (
          <>
            <button className="btn btn-sm btn-ghost" onClick={() => setEdit({ ...detail.patient, tierCode: detail.patient.tier_code, assignedPrice: detail.patient.assigned_price })}><Pencil /> Editar</button>
            <button className="btn btn-sm" onClick={() => save({ status: detail.patient.status === 'activo' ? 'inactivo' : 'activo' })}>{detail.patient.status === 'activo' ? 'Marcar inactivo' : 'Reactivar'}</button>
          </>
        )}
      >
        {!detail ? <Loader /> : (
          <>
            <div className="hstack" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
              <FreqBadge type={detail.frequency.type} />
              <Badge tone={detail.patient.status === 'activo' ? 'success' : 'warning'}>{detail.patient.status}</Badge>
              <Badge tone={detail.patient.risk === 'alto' ? 'danger' : detail.patient.risk === 'medio' ? 'warning' : 'sage'} dot={false}>Riesgo {detail.patient.risk}</Badge>
              <span className="tiny muted">Nivel {detail.patient.tier_code} · {money(detail.patient.assigned_price)}</span>
            </div>
            <div className="tabs-line">
              {[['resumen', 'Resumen'], ['citas', `Citas (${detail.appointments.length})`], ['pagos', `Pagos (${detail.payments.length})`], ['encuestas', 'Encuestas'], ['notas', 'Notas']].map(([k, l]) => (
                <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>

            {tab === 'resumen' && (
              <>
                <div className="info-grid">
                  <div className="info-box"><div className="k">Edad</div><div className="v">{detail.patient.age ?? '—'} años</div></div>
                  <div className="info-box"><div className="k">Género</div><div className="v">{detail.patient.gender || '—'}</div></div>
                  <div className="info-box"><div className="k">Carrera</div><div className="v">{detail.patient.career || '—'}</div></div>
                  <div className="info-box"><div className="k">Semestre</div><div className="v">{detail.patient.semester || '—'}</div></div>
                  <div className="info-box"><div className="k">Sesiones completadas</div><div className="v">{detail.frequency.totalSessions}</div></div>
                  <div className="info-box"><div className="k">Total aportado</div><div className="v">{money(detail.paid)}</div></div>
                  <div className="info-box"><div className="k">Última sesión</div><div className="v">{detail.frequency.lastVisit ? dateMed(detail.frequency.lastVisit) : '—'}</div></div>
                  <div className="info-box"><div className="k">Inasistencias</div><div className="v">{detail.frequency.noShows}</div></div>
                </div>
                <div className="form-section">
                  <h4>Contacto</h4>
                  <div className="stack-xs small">
                    <span className="hstack"><Mail style={{ width: 13, height: 13 }} /> {detail.patient.email}</span>
                    <span className="hstack"><Phone style={{ width: 13, height: 13 }} /> {detail.patient.phone || '—'}</span>
                  </div>
                </div>
                <div className="form-section">
                  <h4>Notas administrativas</h4>
                  <textarea className="textarea" defaultValue={detail.patient.notes || ''} onBlur={(e) => e.target.value !== (detail.patient.notes || '') && save({ notes: e.target.value })} placeholder="Observaciones de seguimiento, acuerdos, etc." />
                  <p className="tiny muted" style={{ marginTop: 6 }}>Se guarda al salir del campo. Las notas clínicas son privadas del terapeuta.</p>
                </div>
                <div className="form-section">
                  <h4>Tarifa y estado</h4>
                  <div className="form-grid">
                    <Field label="Nivel de tarifa">
                      <select className="select" value={detail.patient.tier_code || ''} onChange={(e) => save({ tier_code: e.target.value, assigned_price: (cfg?.tiers || []).find((t: any) => t.code === e.target.value)?.price })}>
                        {(cfg?.tiers || []).map((t: any) => <option key={t.code} value={t.code}>{t.code} · {t.name} · {money(t.price)}</option>)}
                      </select>
                    </Field>
                    <Field label="Aporte asignado (USD)">
                      <input className="input" type="number" defaultValue={detail.patient.assigned_price || 0} onBlur={(e) => Number(e.target.value) !== detail.patient.assigned_price && save({ assigned_price: Number(e.target.value) })} />
                    </Field>
                  </div>
                </div>
              </>
            )}

            {tab === 'citas' && (
              <div className="stack-sm">
                {detail.appointments.length === 0 && <Empty title="Sin citas registradas" icon={<CalendarDays />} />}
                {detail.appointments.map((a: any) => (
                  <div key={a.id} className="card" style={{ padding: 12 }}>
                    <div className="row-between">
                      <div><strong style={{ fontSize: 12.5 }}>{dateShort(a.date)} · {time12(a.start)}</strong><div className="tiny muted">{a.therapist_name} · {a.code}</div></div>
                      <div className="hstack"><StatusBadge status={a.status} /><PayBadge status={a.payment_status} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'pagos' && (
              <div className="table-wrap">
                <table className="data">
                  <thead><tr><th>Fecha</th><th>Monto</th><th>Método</th><th>Estado</th><th /></tr></thead>
                  <tbody>
                    {detail.payments.map((p: any) => (
                      <tr key={p.id}>
                        <td>{dateShort(p.created_at)}</td><td className="money">{money(p.amount)}</td><td>{p.method}</td>
                        <td><PayBadge status={p.status} /></td>
                        <td className="t-right">{p.receipt && <a className="btn btn-sm btn-ghost" href={p.receipt} target="_blank" rel="noreferrer">Ver</a>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {detail.payments.length === 0 && <Empty title="Sin pagos" icon={<Wallet />} />}
              </div>
            )}

            {tab === 'encuestas' && (
              <div className="stack-sm">
                {detail.surveys.length === 0 && <Empty title="Sin encuestas" icon={<ClipboardList />} />}
                {detail.surveys.map((s: any) => (
                  <div key={s.id} className="card" style={{ padding: 14 }}>
                    <div className="row-between">
                      <div><strong style={{ fontSize: 13 }}>Nivel {s.tier_code} · {money(s.suggested_price)}</strong><div className="tiny muted">{dateShort(s.created_at)} · declaró {money(s.declared_price)}</div></div>
                      <Badge tone="sage" dot={false}>Puntaje {s.score}/100</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'notas' && (
              <div className="stack-sm">
                <div className="notice notice-info"><FileText /><span>Las notas de sesión son confidenciales. Solo se muestra su existencia y el terapeuta tratante.</span></div>
                {detail.notes.length === 0 && <Empty title="Sin notas registradas" icon={<FileText />} />}
                {detail.notes.map((n: any) => (
                  <div key={n.id} className="card" style={{ padding: 12 }}>
                    <div className="row-between"><strong style={{ fontSize: 12.5 }}>{n.therapist_name}</strong><span className="tiny muted">{dateShort(n.created_at)} · {n.mood || 'sin estado'}</span></div>
                    <div className="tiny muted" style={{ marginTop: 4 }}>Contenido protegido · visible solo para el terapeuta</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Drawer>

      {edit && <PatientModal patient={edit} tiers={cfg?.tiers || []} onClose={() => setEdit(null)} onSave={async (patch) => {
        try {
          await api(`/admin/patients/${edit.id}`, { method: 'PATCH', body: patch });
          toast.success('Paciente actualizado');
          setEdit(null);
          reload();
          if (detail?.patient?.id === edit.id) setDetail(await api(`/admin/patients/${edit.id}`));
        } catch (e: any) { toast.error(e.message); }
      }} />}
      {creating && <NewPatientModal tiers={cfg?.tiers || []} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); reload(); }} />}
    </AdminPage>
  );
}

function PatientModal({ patient, tiers, onClose, onSave }: { patient: any; tiers: any[]; onClose: () => void; onSave: (p: any) => void }) {
  const [form, setForm] = useState<any>({ ...patient });
  return (
    <Modal open onClose={onClose} title="Editar paciente" subtitle={patient.email}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn" onClick={() => onSave({
        name: form.name, phone: form.phone, university: form.university, career: form.career, semester: form.semester,
        city: form.city, birthdate: form.birthdate, gender: form.gender, tier_code: form.tier_code, assigned_price: Number(form.assigned_price), status: form.status,
      })}>Guardar cambios</button></>}>
      <div className="form-grid">
        <Field label="Nombre" className="span-2"><input className="input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Teléfono"><input className="input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Fecha de nacimiento"><input className="input" type="date" value={form.birthdate || ''} onChange={(e) => setForm({ ...form, birthdate: e.target.value })} /></Field>
        <Field label="Universidad" className="span-2"><input className="input" value={form.university || ''} onChange={(e) => setForm({ ...form, university: e.target.value })} /></Field>
        <Field label="Carrera"><input className="input" value={form.career || ''} onChange={(e) => setForm({ ...form, career: e.target.value })} /></Field>
        <Field label="Semestre"><input className="input" value={form.semester || ''} onChange={(e) => setForm({ ...form, semester: e.target.value })} /></Field>
        <Field label="Nivel de tarifa">
          <select className="select" value={form.tier_code || ''} onChange={(e) => setForm({ ...form, tier_code: e.target.value, assigned_price: tiers.find((t) => t.code === e.target.value)?.price ?? form.assigned_price })}>
            {tiers.map((t) => <option key={t.code} value={t.code}>{t.code} · {t.name} · {money(t.price)}</option>)}
          </select>
        </Field>
        <Field label="Aporte (USD)"><input className="input" type="number" value={form.assigned_price ?? ''} onChange={(e) => setForm({ ...form, assigned_price: e.target.value })} /></Field>
        <Field label="Estado">
          <select className="select" value={form.status || 'activo'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="activo">Activo</option><option value="inactivo">Inactivo</option>
          </select>
        </Field>
      </div>
    </Modal>
  );
}

function NewPatientModal({ tiers, onClose, onSaved }: { tiers: any[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<any>({ name: '', email: '', phone: '', university: '', career: '', tierCode: 'E', assignedPrice: 20 });
  const [busy, setBusy] = useState(false);
  const create = async () => {
    if (!form.name || !form.email) return toast.error('Nombre y correo son obligatorios');
    setBusy(true);
    try { await api('/admin/patients', { method: 'POST', body: form }); toast.success('Paciente creado'); onSaved(); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Nuevo paciente"
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn" onClick={create} disabled={busy}>{busy ? 'Creando…' : 'Crear paciente'}</button></>}>
      <div className="form-grid">
        <Field label="Nombre completo" className="span-2"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Correo"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Teléfono"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Universidad"><input className="input" value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} /></Field>
        <Field label="Carrera"><input className="input" value={form.career} onChange={(e) => setForm({ ...form, career: e.target.value })} /></Field>
        <Field label="Nivel de tarifa">
          <select className="select" value={form.tierCode} onChange={(e) => setForm({ ...form, tierCode: e.target.value, assignedPrice: tiers.find((t) => t.code === e.target.value)?.price ?? 20 })}>
            {tiers.map((t) => <option key={t.code} value={t.code}>{t.code} · {t.name} · {money(t.price)}</option>)}
          </select>
        </Field>
        <Field label="Aporte (USD)"><input className="input" type="number" value={form.assignedPrice} onChange={(e) => setForm({ ...form, assignedPrice: Number(e.target.value) })} /></Field>
      </div>
    </Modal>
  );
}
