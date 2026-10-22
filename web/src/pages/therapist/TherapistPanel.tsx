import { useState } from 'react';
import { CalendarDays, CheckCircle2, Clock, FileText, LogOut, Plus, Trash2, Users, Video, Wallet, XCircle } from 'lucide-react';
import { api, fileToDataUrl } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Link } from '../../lib/router';
import { Avatar, Badge, Empty, ErrorState, Field, Loader, Modal, StatusBadge, useFetch, useToast } from '../../lib/ui';
import { dateMed, dateShort, money, time12, today } from '../../lib/format';

export function TherapistPanel() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch<any>(() => api('/therapist/overview'), []);
  const [tab, setTab] = useState('hoy');
  const [profile, setProfile] = useState({ ...(data?.therapist || {}), approaches: Array.isArray((data?.therapist || {}).approaches) ? (data?.therapist || {}).approaches.join(', ') : ((data?.therapist || {}).approaches || '') });
  const [photo, setPhoto] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<any>(null);

  if (loading && !data) return <Loader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const t = data.therapist;

  const setStatus = async (appt: any, status: string) => {
    try { await api(`/therapist/appointments/${appt.id}/status`, { method: 'POST', body: { status } }); toast.success('Asistencia registrada'); reload(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', paddingBottom: 60 }}>
      <header className="site-header scrolled" style={{ position: 'sticky' }}>
        <div className="container site-nav" style={{ height: 66 }}>
          <Link to="/terapeuta" style={{ display: 'inline-flex' }}>
            <span className="brand" style={{ fontSize: 21 }}>
              <svg className="brand-mark" viewBox="0 0 48 48" fill="none" style={{ width: 32, height: 32 }}>
                <rect width="48" height="48" rx="15" fill="#0F3B33" />
                <path d="M24 12c4.2 3.2 6.3 6.9 6.3 11.2 0 5.6-2.8 9.4-6.3 12.8-3.5-3.4-6.3-7.2-6.3-12.8C17.7 18.9 19.8 15.2 24 12Z" fill="#F6F1E6" />
                <circle cx="24" cy="24" r="2.6" fill="#0F3B33" />
                <circle cx="35" cy="14" r="2.2" fill="#C0603C" />
              </svg>
              <span>Psyconova<small>Panel del terapeuta</small></span>
            </span>
          </Link>
          <div className="hstack">
            <Avatar src={t.photo} name={t.name} size="sm" />
            <div style={{ lineHeight: 1.25 }}><strong style={{ fontSize: 12.5 }}>{t.name}</strong><div className="tiny muted">{t.license}</div></div>
            <button className="icon-btn" onClick={logout} title="Salir"><LogOut /></button>
          </div>
        </div>
      </header>

      <div className="container" style={{ paddingTop: 24 }}>
        <div className="row-between" style={{ marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span className="eyebrow">Hola, {t.name.split(' ')[0]}</span>
            <h1 className="display" style={{ fontSize: 34, marginTop: 8 }}>Tu agenda de hoy</h1>
            <p className="small muted" style={{ margin: '4px 0 0' }}>{new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })} · {data.today.length} sesiones</p>
          </div>
          <div className="hstack">
            <Badge tone="sage" dot={false}>{t.approaches.join(' · ')}</Badge>
            <Link className="btn btn-sm btn-ghost" to="/">Ver sitio</Link>
          </div>
        </div>

        <div className="kpi-grid">
          <div className="kpi dark"><div className="label"><CalendarDays /> Sesiones hoy</div><div className="value">{data.today.length}</div><div className="delta" style={{ color: '#a7d8bd' }}>{data.upcoming.length} próximas</div></div>
          <div className="kpi"><div className="label"><Users /> Pacientes activos</div><div className="value">{data.patients.length}</div><div className="delta"><span>En tu cartera</span></div></div>
          <div className="kpi"><div className="label"><CheckCircle2 /> Completadas este mes</div><div className="value">{data.month.completed}</div><div className="delta"><span>Sesiones cerradas</span></div></div>
          <div className="kpi"><div className="label"><Wallet /> Ingresos del mes</div><div className="value">{money(data.month.income)}</div><div className="delta"><span>Pagos verificados</span></div></div>
        </div>

        <div className="tabs-line" style={{ marginTop: 20 }}>
          {[['hoy', `Hoy (${data.today.length})`], ['proximas', `Próximas (${data.upcoming.length})`], ['pacientes', `Pacientes (${data.patients.length})`], ['notas', 'Notas de sesión'], ['perfil', 'Mi perfil']].map(([k, l]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        {tab === 'hoy' && (
          <div className="grid-2">
            <div className="panel">
              <div className="panel-head"><h3>Agenda de hoy</h3><span className="tiny muted">{dateMed(today())}</span></div>
              <div className="panel-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
                {data.today.length === 0 && <Empty title="Sin sesiones hoy" text="Disfruta el espacio entre sesiones o revisa tus próximas citas." icon={<CalendarDays />} />}
                {data.today.map((a: any) => (
                  <div key={a.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
                    <div className="row" style={{ gap: 12 }}>
                      <div style={{ width: 58 }}><strong style={{ fontSize: 12.5 }}>{time12(a.start)}</strong><div className="tiny muted">{a.modality === 'virtual' ? 'Virtual' : 'Presencial'}</div></div>
                      <Avatar name={a.patient_name} size="sm" />
                      <div className="grow"><strong style={{ fontSize: 13 }}>{a.patient_name}</strong><div className="tiny muted">{a.reason || 'Consulta'} · {a.code}</div></div>
                      <StatusBadge status={a.status} />
                    </div>
                    <div className="hstack" style={{ marginTop: 8, paddingLeft: 70 }}>
                      <button className="btn btn-sm btn-soft" onClick={() => setStatus(a, 'completada')}><CheckCircle2 /> Asistió</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => setStatus(a, 'no_asistio')}><XCircle /> No asistió</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => setNoteFor(a)}><FileText /> Nota</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="stack">
              <div className="panel">
                <div className="panel-head"><h3>Tu disponibilidad</h3><Badge tone="sage" dot={false}>Semanal · edita</Badge></div>
                <div className="panel-body">
                  <AvailabilityEditor />
                </div>
              </div>
              <div className="card card-forest">
                <Video style={{ width: 22, height: 22, opacity: 0.7 }} />
                <h3 className="serif" style={{ color: '#fff', fontSize: 20, margin: '8px 0 4px' }}>Sesiones virtuales</h3>
                <p className="small" style={{ opacity: 0.7, margin: 0 }}>Comparte el enlace de la videollamada 10 minutos antes. Si el paciente no se conecta, registra “no asistió” después de 15 minutos.</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'proximas' && (
          <div className="panel">
            <div className="panel-head"><h3>Próximas sesiones</h3><span className="tiny muted">{data.upcoming.length} agendadas</span></div>
            <div className="panel-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
              {data.upcoming.length === 0 && <Empty title="Sin sesiones próximas" icon={<CalendarDays />} />}
              {data.upcoming.map((a: any) => (
                <div key={a.id} className="appt-item">
                  <div className="appt-date"><div className="d">{new Date(a.date + 'T12:00:00').getDate()}</div><div className="m">{new Date(a.date + 'T12:00:00').toLocaleDateString('es-EC', { month: 'short' }).replace('.', '')}</div></div>
                  <div><h4>{a.patient_name}</h4><p>{time12(a.start)} · {a.modality} · {money(a.price)} · {a.code}</p></div>
                  <div className="hstack"><StatusBadge status={a.status} /><PayBadgeMini status={a.payment_status} /></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'pacientes' && (
          <div className="panel">
            <div className="panel-head"><h3>Mis pacientes</h3><span className="tiny muted">Solo quienes tienen citas contigo</span></div>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Paciente</th><th>Universidad</th><th>Frecuencia</th><th>Total aportado</th><th>Sesiones</th><th /></tr></thead>
                <tbody>
                  {data.patients.map((p: any) => (
                    <tr key={p.id}>
                      <td><div className="cell-main"><Avatar name={p.name} size="sm" /><div className="meta"><strong>{p.name}</strong><span>{p.email}</span></div></div></td>
                      <td className="tiny">{p.university || '—'}</td>
                      <td><Badge tone={p.frequency.type === 'frecuente' ? 'success' : p.frequency.type === 'inactivo' ? 'warning' : 'info'}>{p.frequency.type}</Badge></td>
                      <td>{money(p.paid_total)}</td>
                      <td>{p.frequency.totalSessions}</td>
                      <td className="t-right"><button className="btn btn-sm btn-ghost" onClick={() => setNoteFor({ patient_id: p.id, patient_name: p.name })}><Plus /> Nota</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'perfil' && (
          <div className="panel" style={{ maxWidth: 520 }}>
            <div className="panel-head"><h3>Mi perfil</h3><span className="tiny muted">Edita tu información y guarda</span></div>
            <div className="panel-body" style={{ paddingTop: 8 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
                <Avatar src={photo || t.photo} name={t.name} size="xl" />
                <label className="btn btn-sm btn-ghost" style={{ display: 'inline-flex' }}>
                  <Plus /> Subir foto
                  <input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { setPhoto(await fileToDataUrl(f)); toast.success('Foto lista'); } catch {} }} />
                </label>
              </div>
              <div className="stack-sm">
                <Field label="Nombre completo"><input className="input" value={profile.name || ''} onChange={e => setProfile({ ...profile, name: e.target.value })} /></Field>
                <div className="form-grid">
                  <Field label="Género"><select className="select" value={profile.gender || 'femenino'} onChange={e => setProfile({ ...profile, gender: e.target.value })}><option>Femenino</option><option>Masculino</option></select></Field>
                  <Field label="Fecha de nacimiento"><input className="input" type="date" value={profile.birthdate || ''} onChange={e => setProfile({ ...profile, birthdate: e.target.value })} /></Field>
                </div>
                <Field label="Universidad"><input className="input" value={profile.university || ''} onChange={e => setProfile({ ...profile, university: e.target.value })} /></Field>
                <Field label="Título / formación"><input className="input" value={profile.degree || ''} onChange={e => setProfile({ ...profile, degree: e.target.value })} /></Field>
                <Field label="Registro profesional"><input className="input" value={profile.license || ''} onChange={e => setProfile({ ...profile, license: e.target.value })} placeholder="MSP-00000" /></Field>
                <Field label="Años de experiencia"><input className="input" type="number" min="0" value={profile.years || 0} onChange={e => setProfile({ ...profile, years: Number(e.target.value) })} /></Field>
                <Field label="Enfoques (separados por coma)"><input className="input" value={profile.approaches || ''} onChange={e => setProfile({ ...profile, approaches: e.target.value })} /></Field>
                <Field label="Modalidad"><select className="select" value={profile.modality || 'ambas'} onChange={e => setProfile({ ...profile, modality: e.target.value })}><option>Ambas</option><option>Presencial</option><option>Virtual</option></select></Field>
                <Field label="Descripción"><textarea className="textarea" rows={3} value={profile.description || ''} onChange={e => setProfile({ ...profile, description: e.target.value })} placeholder="Sobre tu práctica..." /></Field>
              </div>
              <button className="btn btn-block" style={{ marginTop: 14 }} onClick={async () => { try { const body: any = { ...profile, approaches: profile.approaches ? profile.approaches.split(',').map((s: string) => s.trim()).filter(Boolean) : [] }; if (photo) body.photo = photo; await api('/therapist/profile', { method: 'PATCH', body }); toast.success('Perfil actualizado'); reload(); } catch (e: any) { toast.error(e.message); } }}>Guardar cambios</button>
            </div>
          </div>
        )}

        {tab === 'notas' && (
          <div className="panel">
            <div className="panel-head"><h3>Notas recientes</h3><span className="tiny muted">Confidencial · solo visible para ti</span></div>
            <div className="panel-body">
              {data.notes.length === 0 && <Empty title="Aún no hay notas" text="Registra notas después de cada sesión para dar seguimiento clínico." icon={<FileText />} />}
              <div className="stack-sm">
                {data.notes.map((n: any) => (
                  <div key={n.id} className="card" style={{ padding: 14 }}>
                    <div className="row-between"><strong style={{ fontSize: 13 }}>{n.patient_name}</strong><span className="tiny muted">{dateShort(n.created_at)} · {n.mood || 'sin estado'}</span></div>
                    <p className="small" style={{ margin: '8px 0 0', color: 'var(--ink-soft)' }}>{n.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {noteFor && <NoteModal target={noteFor} onClose={() => setNoteFor(null)} onSaved={() => { setNoteFor(null); reload(); }} />}
    </div>
  );
}

function PayBadgeMini({ status }: { status: string }) {
  return <span className={`badge ${status === 'pagado' ? 'badge-success' : 'badge-warning'} no-dot`} style={{ fontSize: 9.5 }}>{status === 'pagado' ? 'pagado' : 'pendiente'}</span>;
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function AvailabilityEditor() {
  const toast = useToast();
  const { data, loading, reload } = useFetch<any[]>(() => api('/therapist/availability'), []);
  const [form, setForm] = useState<any>({ weekday: 0, start: '08:00', end: '12:00', slotMinutes: 50, modality: 'ambas' });
  const [busy, setBusy] = useState(false);
  const rows = data || [];

  const add = async () => {
    setBusy(true);
    try {
      await api('/therapist/availability', { method: 'POST', body: { ...form, weekday: Number(form.weekday) } });
      toast.success('Horario agregado');
      reload();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    try { await api(`/therapist/availability/${id}`, { method: 'DELETE' }); toast.success('Horario eliminado'); reload(); }
    catch (e: any) { toast.error(e.message); }
  };

  const update = async (id: string, patch: any) => {
    try { await api(`/therapist/availability/${id}`, { method: 'PATCH', body: patch }); toast.success('Horario actualizado'); reload(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="stack-sm">
      {loading && !data && <Loader />}
      {!loading && rows.length === 0 && (
        <p className="tiny muted">No tienes bloques configurados. Agrégalos abajo para que los pacientes puedan agendarte.</p>
      )}
      <div className="stack-xs">
        {rows.map((r: any) => (
          <div key={r.id} className="row-between" style={{ fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--line)', gap: 8 }}>
            <span className="muted" style={{ minWidth: 78 }}>{DIAS[r.weekday] || `Día ${r.weekday}`}</span>
            <span className="hstack" style={{ gap: 6 }}>
              <input className="input" style={{ width: 92, padding: '4px 8px', fontSize: 12 }} type="time" value={r.start} onChange={(e) => setForm({ ...form })} onBlur={(e) => e.target.value !== r.start && update(r.id, { start: e.target.value })} />
              <span className="muted">–</span>
              <input className="input" style={{ width: 92, padding: '4px 8px', fontSize: 12 }} type="time" value={r.end} onChange={(e) => setForm({ ...form })} onBlur={(e) => e.target.value !== r.end && update(r.id, { end: e.target.value })} />
              <span className="tiny muted">{r.slot_minutes}′</span>
            </span>
            <button className="icon-btn" title="Eliminar" onClick={() => remove(r.id)}><Trash2 style={{ width: 15, height: 15 }} /></button>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 4 }}>
        <p className="tiny muted" style={{ margin: '0 0 8px' }}>Agregar bloque horario</p>
        <div className="form-grid">
          <Field label="Día">
            <select className="select" value={form.weekday} onChange={e => setForm({ ...form, weekday: e.target.value })}>
              {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </Field>
          <Field label="Modalidad">
            <select className="select" value={form.modality} onChange={e => setForm({ ...form, modality: e.target.value })}>
              <option value="ambas">Ambas</option>
              <option value="presencial">Presencial</option>
              <option value="virtual">Virtual</option>
            </select>
          </Field>
          <Field label="Desde"><input className="input" type="time" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} /></Field>
          <Field label="Hasta"><input className="input" type="time" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} /></Field>
          <Field label="Duración (min)"><input className="input" type="number" min="20" step="5" value={form.slotMinutes} onChange={e => setForm({ ...form, slotMinutes: Number(e.target.value) })} /></Field>
        </div>
        <button className="btn btn-sm btn-block" style={{ marginTop: 10 }} onClick={add} disabled={busy}>{busy ? 'Guardando…' : 'Agregar horario'}</button>
      </div>
    </div>
  );
}

function NoteModal({ target, onClose, onSaved }: { target: any; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('estable');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!content.trim()) return toast.error('Escribe la nota de la sesión');
    setBusy(true);
    try {
      await api('/therapist/notes', { method: 'POST', body: { patientId: target.patient_id, appointmentId: target.id, content, mood } });
      toast.success('Nota guardada de forma confidencial');
      onSaved();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Nota de sesión" subtitle={`${target.patient_name} · ${dateShort(target.date || today())}`}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar nota'}</button></>}>
      <Field label="Estado emocional">
        <select className="select" value={mood} onChange={(e) => setMood(e.target.value)}>
          {['mejor', 'estable', 'sensible', 'ansioso', 'motivado', 'en riesgo'].map((m) => <option key={m}>{m}</option>)}
        </select>
      </Field>
      <div style={{ height: 10 }} />
      <Field label="Evolución y acuerdos" hint="Esta nota es confidencial y solo la ves tú.">
        <textarea className="textarea" style={{ minHeight: 150 }} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Temas trabajados, técnicas, respuesta del paciente y tareas para la próxima sesión…" />
      </Field>
    </Modal>
  );
}
