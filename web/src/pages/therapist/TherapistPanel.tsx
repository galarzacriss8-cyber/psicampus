import { useState } from 'react';
import { CalendarDays, CheckCircle2, Clock, FileText, LogOut, Plus, Users, Video, Wallet, XCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Link } from '../../lib/router';
import { Avatar, Badge, Empty, ErrorState, Field, Loader, Modal, StatusBadge, useFetch, useToast } from '../../lib/ui';
import { dateMed, dateShort, money, time12, today } from '../../lib/format';

export function TherapistPanel() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch<any>(() => api('/therapist/overview'), []);
  const [tab, setTab] = useState('hoy');
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
            <p className="small muted" style={{ margin: '4px 0 0' }}>{new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })} Â· {data.today.length} sesiones</p>
          </div>
          <div className="hstack">
            <Badge tone="sage" dot={false}>{t.approaches.join(' Â· ')}</Badge>
            <Link className="btn btn-sm btn-ghost" to="/">Ver sitio</Link>
          </div>
        </div>

        <div className="kpi-grid">
          <div className="kpi dark"><div className="label"><CalendarDays /> Sesiones hoy</div><div className="value">{data.today.length}</div><div className="delta" style={{ color: '#a7d8bd' }}>{data.upcoming.length} prÃ³ximas</div></div>
          <div className="kpi"><div className="label"><Users /> Pacientes activos</div><div className="value">{data.patients.length}</div><div className="delta"><span>En tu cartera</span></div></div>
          <div className="kpi"><div className="label"><CheckCircle2 /> Completadas este mes</div><div className="value">{data.month.completed}</div><div className="delta"><span>Sesiones cerradas</span></div></div>
          <div className="kpi"><div className="label"><Wallet /> Ingresos del mes</div><div className="value">{money(data.month.income)}</div><div className="delta"><span>Pagos verificados</span></div></div>
        </div>

        <div className="tabs-line" style={{ marginTop: 20 }}>
          {[['hoy', `Hoy (${data.today.length})`], ['proximas', `PrÃ³ximas (${data.upcoming.length})`], ['pacientes', `Pacientes (${data.patients.length})`], ['notas', 'Notas de sesiÃ³n']].map(([k, l]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        {tab === 'hoy' && (
          <div className="grid-2">
            <div className="panel">
              <div className="panel-head"><h3>Agenda de hoy</h3><span className="tiny muted">{dateMed(today())}</span></div>
              <div className="panel-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
                {data.today.length === 0 && <Empty title="Sin sesiones hoy" text="Disfruta el espacio entre sesiones o revisa tus prÃ³ximas citas." icon={<CalendarDays />} />}
                {data.today.map((a: any) => (
                  <div key={a.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
                    <div className="row" style={{ gap: 12 }}>
                      <div style={{ width: 58 }}><strong style={{ fontSize: 12.5 }}>{time12(a.start)}</strong><div className="tiny muted">{a.modality === 'virtual' ? 'Virtual' : 'Presencial'}</div></div>
                      <Avatar name={a.patient_name} size="sm" />
                      <div className="grow"><strong style={{ fontSize: 13 }}>{a.patient_name}</strong><div className="tiny muted">{a.reason || 'Consulta'} Â· {a.code}</div></div>
                      <StatusBadge status={a.status} />
                    </div>
                    <div className="hstack" style={{ marginTop: 8, paddingLeft: 70 }}>
                      <button className="btn btn-sm btn-soft" onClick={() => setStatus(a, 'completada')}><CheckCircle2 /> AsistiÃ³</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => setStatus(a, 'no_asistio')}><XCircle /> No asistiÃ³</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => setNoteFor(a)}><FileText /> Nota</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="stack">
              <div className="panel">
                <div className="panel-head"><h3>Tu disponibilidad</h3><Badge tone="sage" dot={false}>Semanal</Badge></div>
                <div className="panel-body">
                  <div className="stack-xs">
                    {['Lun', 'Mar', 'MiÃ©', 'Jue', 'Vie', 'SÃ¡b', 'Dom'].map((d, i) => (
                      <div key={d} className="row-between" style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
                        <span className="muted">{d}</span>
                        <span className="strong">08:00â€“12:00 Â· 14:00â€“18:30</span>
                      </div>
                    ))}
                  </div>
                  <p className="tiny muted" style={{ marginTop: 10 }}>La administraciÃ³n gestiona tus bloqueos y vacaciones. EscrÃ­beles para cambios.</p>
                </div>
              </div>
              <div className="card card-forest">
                <Video style={{ width: 22, height: 22, opacity: 0.7 }} />
                <h3 className="serif" style={{ color: '#fff', fontSize: 20, margin: '8px 0 4px' }}>Sesiones virtuales</h3>
                <p className="small" style={{ opacity: 0.7, margin: 0 }}>Comparte el enlace de la videollamada 10 minutos antes. Si el paciente no se conecta, registra â€œno asistiÃ³â€ despuÃ©s de 15 minutos.</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'proximas' && (
          <div className="panel">
            <div className="panel-head"><h3>PrÃ³ximas sesiones</h3><span className="tiny muted">{data.upcoming.length} agendadas</span></div>
            <div className="panel-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
              {data.upcoming.length === 0 && <Empty title="Sin sesiones prÃ³ximas" icon={<CalendarDays />} />}
              {data.upcoming.map((a: any) => (
                <div key={a.id} className="appt-item">
                  <div className="appt-date"><div className="d">{new Date(a.date + 'T12:00:00').getDate()}</div><div className="m">{new Date(a.date + 'T12:00:00').toLocaleDateString('es-EC', { month: 'short' }).replace('.', '')}</div></div>
                  <div><h4>{a.patient_name}</h4><p>{time12(a.start)} Â· {a.modality} Â· {money(a.price)} Â· {a.code}</p></div>
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
                      <td className="tiny">{p.university || 'â€”'}</td>
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

        {tab === 'notas' && (
          <div className="panel">
            <div className="panel-head"><h3>Notas recientes</h3><span className="tiny muted">Confidencial Â· solo visible para ti</span></div>
            <div className="panel-body">
              {data.notes.length === 0 && <Empty title="AÃºn no hay notas" text="Registra notas despuÃ©s de cada sesiÃ³n para dar seguimiento clÃ­nico." icon={<FileText />} />}
              <div className="stack-sm">
                {data.notes.map((n: any) => (
                  <div key={n.id} className="card" style={{ padding: 14 }}>
                    <div className="row-between"><strong style={{ fontSize: 13 }}>{n.patient_name}</strong><span className="tiny muted">{dateShort(n.created_at)} Â· {n.mood || 'sin estado'}</span></div>
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

function NoteModal({ target, onClose, onSaved }: { target: any; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('estable');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!content.trim()) return toast.error('Escribe la nota de la sesiÃ³n');
    setBusy(true);
    try {
      await api('/therapist/notes', { method: 'POST', body: { patientId: target.patient_id, appointmentId: target.id, content, mood } });
      toast.success('Nota guardada de forma confidencial');
      onSaved();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Nota de sesiÃ³n" subtitle={`${target.patient_name} Â· ${dateShort(target.date || today())}`}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn" onClick={save} disabled={busy}>{busy ? 'Guardandoâ€¦' : 'Guardar nota'}</button></>}>
      <Field label="Estado emocional">
        <select className="select" value={mood} onChange={(e) => setMood(e.target.value)}>
          {['mejor', 'estable', 'sensible', 'ansioso', 'motivado', 'en riesgo'].map((m) => <option key={m}>{m}</option>)}
        </select>
      </Field>
      <div style={{ height: 10 }} />
      <Field label="EvoluciÃ³n y acuerdos" hint="Esta nota es confidencial y solo la ves tÃº.">
        <textarea className="textarea" style={{ minHeight: 150 }} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Temas trabajados, tÃ©cnicas, respuesta del paciente y tareas para la prÃ³xima sesiÃ³nâ€¦" />
      </Field>
    </Modal>
  );
}

