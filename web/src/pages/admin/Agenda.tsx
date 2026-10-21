import { useState } from 'react';
import {
  ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, MapPin,
  Pencil, Plus, Trash2, UserX, XCircle, Video, Wallet,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Link } from '../../lib/router';
import { AdminPage } from '../../components/AdminLayout';
import { AppointmentModal } from '../../components/AppointmentModal';
import { Avatar, Badge, Drawer, ErrorState, Field, Loader, Modal, PayBadge, StatusBadge, useFetch, useToast } from '../../lib/ui';
import { addDays, dateLong, dateMed, money, startOfWeek, time12, today } from '../../lib/format';

export function AdminAgenda() {
  const toast = useToast();
  const [week, setWeek] = useState(startOfWeek(today()));
  const [therapistId, setTherapistId] = useState('todos');
  const [selected, setSelected] = useState<any>(null);
  const [edit, setEdit] = useState<any>(null);
  const [creating, setCreating] = useState<{ date?: string; therapist?: string } | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  const from = week;
  const to = addDays(week, 6);
  const { data, loading, error, reload } = useFetch<any>(() => api(`/admin/agenda?from=${from}&to=${to}&therapistId=${therapistId}`), [from, to, therapistId]);

  if (loading && !data) return <Loader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const byDay = (d: string) => (data?.appointments || []).filter((a: any) => a.date === d);
  const total = data?.appointments.length || 0;
  const capacity = data?.capacity || 0;
  const occupancy = capacity ? Math.round((total / capacity) * 100) : 0;

  const setStatus = async (appt: any, status: string) => {
    try {
      const updated = await api(`/admin/appointments/${appt.id}`, { method: 'PATCH', body: { status } });
      toast.success('Estado actualizado');
      setSelected(updated);
      reload();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <AdminPage
      title="Agenda semanal"
      subtitle={`${dateMed(from)} – ${dateMed(to)} · ${total} citas · ${occupancy}% de ocupación`}
      actions={
        <>
          <div className="segmented">
            <button onClick={() => setWeek(addDays(week, -7))}><ChevronLeft style={{ width: 14, height: 14, verticalAlign: 'middle' }} /></button>
            <button onClick={() => setWeek(startOfWeek(today()))}>Hoy</button>
            <button onClick={() => setWeek(addDays(week, 7))}><ChevronRight style={{ width: 14, height: 14, verticalAlign: 'middle' }} /></button>
          </div>
          <select className="select input-sm" value={therapistId} onChange={(e) => setTherapistId(e.target.value)} style={{ width: 180 }}>
            <option value="todos">Todos los terapeutas</option>
            {(data?.therapists || []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button className="btn btn-sm" onClick={() => setCreating({ date: week })}><Plus /> Nueva cita</button>
        </>
      }
    >
      <div className="panel" style={{ padding: 14 }}>
        <div className="row-between" style={{ marginBottom: 12 }}>
          <div className="agenda-legend">
            {[['pendiente', 'Pendiente'], ['confirmada', 'Confirmada'], ['completada', 'Completada'], ['cancelada', 'Cancelada']].map(([k, l]) => (
              <span key={k}><i style={{ background: k === 'pendiente' ? 'var(--gold)' : k === 'confirmada' ? 'var(--info)' : k === 'completada' ? 'var(--success)' : 'var(--danger)' }} />{l}</span>
            ))}
          </div>
          <span className="tiny muted">{data?.exceptions?.length ? `${data.exceptions.length} bloqueos en la semana` : 'Sin bloqueos esta semana'}</span>
        </div>

        <div className="week-grid">
          {days.map((d) => {
            const appts = byDay(d);
            const isToday = d === today();
            return (
              <div key={d} className={`day-col ${isToday ? 'today' : ''}`}>
                <h5>
                  <span>{new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { weekday: 'short' }).replace('.', '')}</span>
                  <b>{new Date(d + 'T12:00:00').getDate()}</b>
                </h5>
                <div className="appts">
                  {appts.map((a: any) => (
                    <button key={a.id} className={`appt-chip ${a.status}`} onClick={() => setSelected(a)} title={`${a.patient_name} · ${a.therapist_name}`}>
                      <strong>{time12(a.start)} · {a.patient_name.split(' ')[0]}</strong>
                      <span>{a.therapist_name.split(' ')[0]} · {a.modality === 'virtual' ? 'virtual' : 'campus'}</span>
                    </button>
                  ))}
                  {appts.length === 0 && <span className="tiny muted" style={{ padding: '4px 2px' }}>—</span>}
                </div>
                <button className="more" onClick={() => setCreating({ date: d })} style={{ border: 0, background: 'none', cursor: 'pointer' }}>
                  <Plus style={{ width: 11, height: 11, verticalAlign: 'middle' }} /> agendar
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid-2e" style={{ marginTop: 14 }}>
        <div className="panel">
          <div className="panel-head"><h3>Resumen de la semana</h3><Badge tone="forest" dot={false}>{occupancy}% ocupación</Badge></div>
          <div className="panel-body">
            <div className="stat-line"><span>Citas agendadas</span><strong>{total}</strong></div>
            <div className="stat-line"><span>Cupos disponibles en la semana</span><strong>{capacity}</strong></div>
            <div className="stat-line"><span>Citas confirmadas</span><strong>{data?.appointments.filter((a: any) => a.status === 'confirmada').length}</strong></div>
            <div className="stat-line"><span>Pendientes de pago</span><strong>{data?.appointments.filter((a: any) => a.payment_status !== 'pagado').length}</strong></div>
            <div className="bar-track" style={{ height: 8, borderRadius: 5, background: 'var(--cream-2)', overflow: 'hidden', marginTop: 10 }}>
              <i style={{ display: 'block', height: '100%', width: `${Math.min(100, occupancy)}%`, background: 'linear-gradient(90deg, var(--forest-2), var(--moss))' }} />
            </div>
            <p className="tiny muted" style={{ marginTop: 10 }}>La ocupación se calcula sobre los bloques de disponibilidad activos de los terapeutas.</p>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h3>Bloqueos y excepciones</h3><Link className="btn btn-sm btn-ghost" to="/admin/horarios">Gestionar</Link></div>
          <div className="panel-body" style={{ paddingTop: 6, paddingBottom: 6 }}>
            {(data?.exceptions || []).length === 0 && <p className="small muted">No hay bloqueos en esta semana.</p>}
            {(data?.exceptions || []).map((e: any) => (
              <div key={e.id} className="row" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <span className="icon-chip clay" style={{ width: 32, height: 32 }}><CalendarDays style={{ width: 14, height: 14 }} /></span>
                <div className="grow"><strong style={{ fontSize: 12 }}>{dateMed(e.date)} · {e.therapist_name}</strong><div className="tiny muted">{e.all_day ? 'Todo el día' : `${e.start}–${e.end}`} · {e.reason || 'Bloqueo'}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.patient_name}` : ''}
        subtitle={selected ? `${selected.code} · ${dateLong(selected.date)} · ${time12(selected.start)}` : ''}
        footer={selected && (
          <>
            <button className="btn btn-sm btn-ghost" onClick={() => { setEdit(selected); setSelected(null); }}><Pencil /> Editar</button>
            <button className="btn btn-sm btn-ghost" onClick={() => { setPayOpen(true); }}>
              <Wallet /> Registrar pago
            </button>
            {selected.status !== 'completada' && <button className="btn btn-sm" onClick={() => setStatus(selected, 'completada')}><CheckCircle2 /> Completar</button>}
          </>
        )}
      >
        {selected && (
          <>
            <div className="hstack" style={{ marginBottom: 14 }}>
              <StatusBadge status={selected.status} />
              <PayBadge status={selected.payment_status} />
              <Badge tone="sage" dot={false}>{selected.modality === 'virtual' ? <><Video style={{ width: 12, height: 12 }} /> Virtual</> : <><MapPin style={{ width: 12, height: 12 }} /> Presencial</>}</Badge>
            </div>
            <div className="info-grid">
              <div className="info-box"><div className="k">Paciente</div><div className="v">{selected.patient_name}</div></div>
              <div className="info-box"><div className="k">Terapeuta</div><div className="v">{selected.therapist_name}</div></div>
              <div className="info-box"><div className="k">Horario</div><div className="v">{time12(selected.start)} – {time12(selected.end)}</div></div>
              <div className="info-box"><div className="k">Valor</div><div className="v">{money(selected.price)}</div></div>
            </div>
            <div className="form-section">
              <h4>Motivo de consulta</h4>
              <p className="small" style={{ margin: 0 }}>{selected.reason || 'No registrado'}</p>
            </div>
            <div className="form-section">
              <h4>Cambiar estado</h4>
              <div className="hstack">
                {['pendiente', 'confirmada', 'completada', 'no_asistio', 'cancelada'].map((s) => (
                  <button key={s} className={`option-pill ${selected.status === s ? 'on' : ''}`} onClick={() => setStatus(selected, s)} style={{ fontSize: 11.5, padding: '7px 11px' }}>{s.replace('_', ' ')}</button>
                ))}
              </div>
            </div>
            <div className="form-section">
              <h4>Accesos rápidos</h4>
              <div className="hstack">
                <Link className="btn btn-sm btn-ghost" to={`/admin/pacientes?q=${encodeURIComponent(selected.patient_name)}`}>Ver paciente</Link>
                <Link className="btn btn-sm btn-ghost" to="/admin/pagos">Ver pagos</Link>
              </div>
            </div>
          </>
        )}
      </Drawer>

      {edit && <AppointmentModal open={!!edit} appointment={edit} onClose={() => setEdit(null)} onSaved={reload} />}
      {creating && (
        <AppointmentModal
          open={!!creating}
          presetDate={creating.date}
          presetTherapist={creating.therapist}
          onClose={() => setCreating(null)}
          onSaved={reload}
        />
      )}
      {payOpen && selected && (
        <ManualPaymentModal appointment={selected} onClose={() => setPayOpen(false)} onSaved={() => { setPayOpen(false); reload(); }} />
      )}
    </AdminPage>
  );
}

function ManualPaymentModal({ appointment, onClose, onSaved }: { appointment: any; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [amount, setAmount] = useState(String(appointment.price));
  const [reference, setReference] = useState('');
  const [method, setMethod] = useState('transferencia');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await api('/admin/payments', { method: 'POST', body: { appointmentId: appointment.id, amount: Number(amount), reference, method, status: 'verificado' } });
      toast.success('Pago registrado y cita marcada como pagada');
      onSaved();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="Registrar pago manual" subtitle={`${appointment.patient_name} · ${appointment.code}`}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Registrar pago'}</button></>}>
      <div className="form-grid">
        <Field label="Monto (USD)"><input className="input" type="number" step="0.5" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Método">
          <select className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="transferencia">Transferencia</option>
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="deposito">Depósito</option>
          </select>
        </Field>
        <Field label="Referencia" className="span-2"><input className="input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Número de comprobante" /></Field>
      </div>
      <div className="notice" style={{ marginTop: 12 }}><CheckCircle2 /><span>El pago se registra como verificado y aparecerá en contabilidad.</span></div>
    </Modal>
  );
}
