import { useEffect, useState } from 'react';
import { CalendarDays, Clock, Loader2, Plus } from 'lucide-react';
import { api } from '../lib/api';
import { Field, Modal, useToast } from '../lib/ui';
import { addDays, money, today, time12 } from '../lib/format';

export function AppointmentModal({ open, onClose, onSaved, appointment, presetDate, presetTherapist }: {
  open: boolean; onClose: () => void; onSaved: () => void; appointment?: any; presetDate?: string; presetTherapist?: string;
}) {
  const toast = useToast();
  const [patients, setPatients] = useState<any[]>([]);
  const [therapists, setTherapists] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [busy, setBusy] = useState(false);
  const [patientQuery, setPatientQuery] = useState('');
  const [form, setForm] = useState<any>({
    patientId: appointment?.patient_id || '',
    therapistId: appointment?.therapist_id || presetTherapist || '',
    date: appointment?.date || presetDate || today(),
    start: appointment?.start || '',
    modality: appointment?.modality || 'presencial',
    status: appointment?.status || 'confirmada',
    price: appointment?.price ?? '',
    reason: appointment?.reason || '',
    notes: appointment?.notes || '',
  });

  useEffect(() => {
    if (!open) return;
    Promise.all([api('/admin/patients'), api('/admin/therapists')]).then(([p, t]) => {
      setPatients(p); setTherapists(t);
      if (!form.therapistId && t[0]) setForm((f: any) => ({ ...f, therapistId: t[0].id }));
    }).catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !form.therapistId || !form.date) return;
    let alive = true;
    setLoadingSlots(true);
    api(`/public/slots?therapistId=${form.therapistId}&date=${form.date}`)
      .then((r) => {
        if (!alive) return;
        const list = r.slots || [];
        setSlots(list);
        if (!appointment && !list.some((s: any) => s.start === form.start && s.available)) {
          const first = list.find((s: any) => s.available);
          setForm((f: any) => ({ ...f, start: first?.start || '' }));
        }
      })
      .finally(() => alive && setLoadingSlots(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form.therapistId, form.date]);

  const selectedPatient = patients.find((p) => p.id === form.patientId);
  const price = form.price !== '' ? Number(form.price) : selectedPatient?.assigned_price || 20;

  const save = async () => {
    if (!form.patientId) return toast.error('Selecciona un paciente');
    if (!form.start) return toast.error('Selecciona un horario');
    setBusy(true);
    try {
      const body = {
        patientId: form.patientId, therapistId: form.therapistId, date: form.date, start: form.start,
        modality: form.modality, status: form.status, price, reason: form.reason, notes: form.notes,
      };
      if (appointment) await api(`/admin/appointments/${appointment.id}`, { method: 'PATCH', body });
      else await api('/admin/appointments', { method: 'POST', body });
      toast.success(appointment ? 'Cita actualizada' : 'Cita creada');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  const filteredPatients = patients.filter((p) => `${p.name} ${p.email}`.toLowerCase().includes(patientQuery.toLowerCase())).slice(0, 40);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={appointment ? `Editar cita ${appointment.code || ''}` : 'Nueva cita'}
      subtitle={appointment ? 'Cambia horario, estado o valor de la sesión.' : 'Agenda manualmente para un paciente existente.'}
      size="wide"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" onClick={save} disabled={busy}>{busy ? 'Guardando…' : appointment ? 'Guardar cambios' : 'Crear cita'} <Plus /></button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Paciente" className="span-2">
          <input className="input" placeholder="Buscar paciente por nombre o correo…" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} />
          <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 10, marginTop: 6 }}>
            {filteredPatients.map((p) => (
              <button
                key={p.id}
                type="button"
                className="row-between"
                style={{ width: '100%', padding: '8px 10px', border: 0, background: form.patientId === p.id ? 'var(--sage-soft)' : 'transparent', textAlign: 'left', borderBottom: '1px solid var(--line)' }}
                onClick={() => setForm({ ...form, patientId: p.id, price: p.assigned_price ?? form.price })}
              >
                <span><strong style={{ fontSize: 12.5 }}>{p.name}</strong><br /><span className="tiny muted">{p.email}</span></span>
                <span className="tiny muted">{p.frequency?.type}</span>
              </button>
            ))}
            {filteredPatients.length === 0 && <div className="small muted" style={{ padding: 10 }}>Sin resultados</div>}
          </div>
        </Field>
        <Field label="Terapeuta">
          <select className="select" value={form.therapistId} onChange={(e) => setForm({ ...form, therapistId: e.target.value, start: '' })}>
            {therapists.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Fecha">
          <input className="input" type="date" value={form.date} min={addDays(today(), -60)} onChange={(e) => setForm({ ...form, date: e.target.value, start: '' })} />
        </Field>
        <Field label="Horario disponible" className="span-2" hint={loadingSlots ? 'Buscando cupos…' : 'Solo se muestran cupos libres del terapeuta.'}>
          {loadingSlots ? (
            <div className="small muted"><Loader2 className="spinner dark" style={{ width: 15, height: 15, display: 'inline' }} /> Cargando…</div>
          ) : (
            <div className="time-grid" style={{ marginTop: 0 }}>
              {slots.filter((s) => s.available || s.start === appointment?.start).map((s) => (
                <button key={s.start} type="button" className={`time-chip ${form.start === s.start ? 'on' : ''}`} onClick={() => setForm({ ...form, start: s.start })}>
                  {time12(s.start)}
                </button>
              ))}
              {slots.filter((s) => s.available).length === 0 && <p className="small muted" style={{ margin: 0 }}>No hay cupos disponibles ese día. Cambia la fecha o el terapeuta.</p>}
            </div>
          )}
        </Field>
        <Field label="Modalidad">
          <select className="select" value={form.modality} onChange={(e) => setForm({ ...form, modality: e.target.value })}>
            <option value="presencial">Presencial</option>
            <option value="virtual">Virtual</option>
          </select>
        </Field>
        <Field label="Estado">
          <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="pendiente">Pendiente</option>
            <option value="confirmada">Confirmada</option>
            <option value="completada">Completada</option>
            <option value="no_asistio">No asistió</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </Field>
        <Field label="Valor de la sesión (USD)" hint={`Sugerido según tarifa del paciente: ${money(selectedPatient?.assigned_price || 20)}`}>
          <input className="input" type="number" min="0" step="0.5" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder={String(selectedPatient?.assigned_price || 20)} />
        </Field>
        <Field label="Motivo de consulta">
          <input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Ansiedad académica, duelo…" />
        </Field>
        <Field label="Notas administrativas" className="span-2">
          <textarea className="textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Información visible para administración" />
        </Field>
      </div>
      {selectedPatient && (
        <div className="info-grid" style={{ marginTop: 14 }}>
          <div className="info-box"><div className="k">Tarifa asignada</div><div className="v">{money(selectedPatient.assigned_price)} · Nivel {selectedPatient.tier_code}</div></div>
          <div className="info-box"><div className="k">Frecuencia</div><div className="v">{selectedPatient.frequency?.type} · {selectedPatient.frequency?.sessions} sesiones</div></div>
        </div>
      )}
      <p className="tiny muted" style={{ marginTop: 12 }}>
        <CalendarDays style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />
        Las citas creadas aquí quedan registradas en la agenda y la contabilidad cuando se validen los pagos.
      </p>
    </Modal>
  );
}

export function TimeBadge({ start, end }: { start: string; end: string }) {
  return <span className="hstack" style={{ gap: 5, fontSize: 12 }}><Clock style={{ width: 13, height: 13 }} /> {time12(start)} – {time12(end)}</span>;
}
