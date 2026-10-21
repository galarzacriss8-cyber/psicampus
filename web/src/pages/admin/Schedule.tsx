import { useEffect, useState } from 'react';
import { CalendarOff, Clock, Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { AdminPage } from '../../components/AdminLayout';
import { Badge, Empty, ErrorState, Field, Loader, Modal, useFetch, useToast } from '../../lib/ui';
import { addDays, dateMed, time12, today } from '../../lib/format';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DOW_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function AdminSchedule() {
  const toast = useToast();
  const { data: therapists } = useFetch<any[]>(() => api('/admin/therapists'), []);
  const [therapistId, setTherapistId] = useState('');
  const [addOpen, setAddOpen] = useState<{ weekday?: number } | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [exceptions, setExceptions] = useState<any[]>([]);

  useEffect(() => { if (!therapistId && therapists?.length) setTherapistId(therapists[0].id); }, [therapists, therapistId]);

  const { data: availability, loading, error, reload } = useFetch<any[]>(
    () => (therapistId ? api(`/admin/therapists/${therapistId}/availability`) : Promise.resolve([])),
    [therapistId]
  );

  const loadExceptions = () => {
    api(`/admin/exceptions?from=${today()}&to=${addDays(today(), 90)}`).then(setExceptions).catch(() => {});
  };
  useEffect(() => { loadExceptions(); }, []);

  const removeRange = async (id: string) => {
    if (!confirm('¿Eliminar este bloque de horario? Las citas ya agendadas no se borran.')) return;
    try { await api(`/admin/availability/${id}`, { method: 'DELETE' }); toast.success('Horario eliminado'); reload(); }
    catch (e: any) { toast.error(e.message); }
  };

  const removeException = async (id: string) => {
    try { await api(`/admin/exceptions/${id}`, { method: 'DELETE' }); toast.success('Bloqueo eliminado'); loadExceptions(); }
    catch (e: any) { toast.error(e.message); }
  };

  const totalHours = (availability || []).reduce((s: number, r: any) => s + (Number(r.end.split(':')[0]) + Number(r.end.split(':')[1]) / 60) - (Number(r.start.split(':')[0]) + Number(r.start.split(':')[1]) / 60), 0);

  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <AdminPage
      title="Horarios y bloqueos"
      subtitle="Define la disponibilidad semanal de cada terapeuta y bloquea fechas especiales."
      actions={
        <>
          <select className="select input-sm" value={therapistId} onChange={(e) => setTherapistId(e.target.value)} style={{ width: 200 }}>
            {(therapists || []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button className="btn btn-sm btn-ghost" onClick={() => setBlockOpen(true)}><CalendarOff /> Bloquear fecha</button>
          <button className="btn btn-sm" onClick={() => setAddOpen({})}><Plus /> Agregar horario</button>
        </>
      }
    >
      <div className="grid-2" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <div className="panel">
          <div className="panel-head"><h3>Disponibilidad semanal</h3><Badge tone="sage" dot={false}>{totalHours.toFixed(1)} h / semana</Badge></div>
          <div className="panel-body">
            {loading && !availability ? <Loader /> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                {[1, 2, 3, 4, 5, 6, 0].map((wd) => {
                  const ranges = (availability || []).filter((r: any) => r.weekday === wd);
                  return (
                    <div key={wd} className="day-col" style={{ minHeight: 160, padding: 7 }}>
                      <h5><span>{DOW_SHORT[wd]}</span><b style={{ fontSize: 12 }}>{ranges.length}</b></h5>
                      <div className="stack-xs" style={{ flex: 1 }}>
                        {ranges.map((r: any) => (
                          <div key={r.id} className="appt-chip confirmada" style={{ position: 'relative', paddingRight: 18 }}>
                            <strong style={{ fontSize: 9.5 }}>{r.start}–{r.end}</strong>
                            <span style={{ fontSize: 8.5 }}>{r.slot_minutes} min · {r.modality}</span>
                            <button onClick={() => removeRange(r.id)} style={{ position: 'absolute', right: 2, top: 2, border: 0, background: 'none', color: 'var(--muted)', padding: 0 }}>
                              <Trash2 style={{ width: 10, height: 10 }} />
                            </button>
                          </div>
                        ))}
                        {ranges.length === 0 && <span className="tiny muted">Libre</span>}
                      </div>
                      <button className="more" style={{ border: 0, background: 'none', cursor: 'pointer' }} onClick={() => setAddOpen({ weekday: wd })}>
                        <Plus style={{ width: 10, height: 10, verticalAlign: 'middle' }} /> agregar
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="tiny muted" style={{ marginTop: 12 }}>
              Los cupos se generan automáticamente cada {availability?.[0]?.slot_minutes || 50} minutos. Si un día no tiene bloques, no aparece disponible para agendar.
            </p>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Bloqueos próximos</h3><Badge tone="warning">{exceptions.length}</Badge></div>
          <div className="panel-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
            {exceptions.length === 0 && <Empty title="Sin bloqueos" text="No hay fechas bloqueadas en los próximos 90 días." icon={<CalendarOff />} />}
            {exceptions.map((e: any) => (
              <div key={e.id} className="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                <span className="icon-chip clay" style={{ width: 32, height: 32 }}><CalendarOff style={{ width: 14, height: 14 }} /></span>
                <div className="grow">
                  <strong style={{ fontSize: 12 }}>{dateMed(e.date)} · {e.therapist_name}</strong>
                  <div className="tiny muted">{e.all_day ? 'Todo el día' : `${time12(e.start)}–${time12(e.end)}`} · {e.reason || 'Bloqueo'}</div>
                </div>
                <button className="icon-btn" onClick={() => removeException(e.id)}><Trash2 /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {addOpen && <AddRangeModal weekday={addOpen.weekday} therapistId={therapistId} onClose={() => setAddOpen(null)} onSaved={() => { setAddOpen(null); reload(); }} />}
      {blockOpen && <BlockModal therapistId={therapistId} onClose={() => setBlockOpen(false)} onSaved={() => { setBlockOpen(false); loadExceptions(); }} />}
    </AdminPage>
  );
}

function AddRangeModal({ weekday, therapistId, onClose, onSaved }: { weekday?: number; therapistId: string; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<any>({ weekday: weekday ?? 1, start: '08:00', end: '12:00', slotMinutes: 50, modality: 'ambas', room: '' });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api('/admin/availability', { method: 'POST', body: { ...form, therapistId } });
      toast.success('Horario agregado'); onSaved();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Agregar bloque de horario"
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Agregar horario'}</button></>}>
      <div className="form-grid">
        <Field label="Día" className="span-2">
          <select className="select" value={form.weekday} onChange={(e) => setForm({ ...form, weekday: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5, 6, 0].map((d) => <option key={d} value={d}>{DAYS[d]}</option>)}
          </select>
        </Field>
        <Field label="Hora de inicio"><input className="input" type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></Field>
        <Field label="Hora de fin"><input className="input" type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></Field>
        <Field label="Duración de sesión (min)"><input className="input" type="number" value={form.slotMinutes} onChange={(e) => setForm({ ...form, slotMinutes: Number(e.target.value) })} /></Field>
        <Field label="Modalidad">
          <select className="select" value={form.modality} onChange={(e) => setForm({ ...form, modality: e.target.value })}>
            <option value="ambas">Ambas</option><option value="presencial">Presencial</option><option value="virtual">Virtual</option>
          </select>
        </Field>
        <Field label="Consultorio" className="span-2"><input className="input" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="Consultorio 3 · Campus Norte" /></Field>
      </div>
    </Modal>
  );
}

function BlockModal({ therapistId, onClose, onSaved }: { therapistId: string; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<any>({ date: today(), allDay: true, start: '08:00', end: '12:00', reason: '' });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api('/admin/exceptions', { method: 'POST', body: { ...form, therapistId } });
      toast.success('Fecha bloqueada'); onSaved();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Bloquear fecha" subtitle="Vacaciones, congresos o imprevistos."
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Bloquear'}</button></>}>
      <div className="form-grid">
        <Field label="Fecha"><input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
        <Field label="Alcance">
          <select className="select" value={form.allDay ? '1' : '0'} onChange={(e) => setForm({ ...form, allDay: e.target.value === '1' })}>
            <option value="1">Todo el día</option><option value="0">Rango de horas</option>
          </select>
        </Field>
        {!form.allDay && (
          <>
            <Field label="Desde"><input className="input" type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></Field>
            <Field label="Hasta"><input className="input" type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></Field>
          </>
        )}
        <Field label="Motivo" className="span-2"><input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Congreso, vacaciones, trámite…" /></Field>
      </div>
      <div className="notice notice-warning" style={{ marginTop: 12 }}><Clock /><span>Los cupos de ese día dejarán de mostrarse. Verifica que no tengas citas agendadas antes de bloquear.</span></div>
    </Modal>
  );
}
