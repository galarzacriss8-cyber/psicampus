import { useState } from 'react';
import {
  CalendarDays, CheckCircle2, Download, Eye, MapPin, Pencil, Plus, Search, Trash2, Video, Wallet, XCircle,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Link } from '../../lib/router';
import { AdminPage } from '../../components/AdminLayout';
import { AppointmentModal } from '../../components/AppointmentModal';
import { Avatar, Drawer, Empty, ErrorState, Loader, PayBadge, StatusBadge, useFetch, useToast } from '../../lib/ui';
import { addDays, dateShort, money, time12, today } from '../../lib/format';

export function AdminAppointments() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('todas');
  const [therapistId, setTherapistId] = useState('todos');
  const [range, setRange] = useState({ from: addDays(today(), -30), to: addDays(today(), 45) });
  const [selected, setSelected] = useState<any>(null);
  const [edit, setEdit] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  const { data: therapists } = useFetch<any[]>(() => api('/admin/therapists'), []);
  const { data, loading, error, reload } = useFetch<any[]>(
    () => api(`/admin/appointments?from=${range.from}&to=${range.to}&status=${status === 'todas' ? '' : status}&therapistId=${therapistId === 'todos' ? '' : therapistId}&q=${encodeURIComponent(q)}`),
    [range.from, range.to, status, therapistId, q]
  );

  const setApptStatus = async (appt: any, s: string) => {
    try {
      const updated = await api(`/admin/appointments/${appt.id}`, { method: 'PATCH', body: { status: s } });
      toast.success('Estado actualizado');
      setSelected(updated); reload();
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (appt: any) => {
    if (!confirm(`¿Eliminar la cita ${appt.code}? Esta acción no se puede deshacer.`)) return;
    try { await api(`/admin/appointments/${appt.id}`, { method: 'DELETE' }); toast.success('Cita eliminada'); setSelected(null); reload(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <AdminPage
      title="Citas"
      subtitle="Gestiona reservas, estados de asistencia y pagos de cada sesión."
      actions={<button className="btn btn-sm" onClick={() => setCreating(true)}><Plus /> Nueva cita</button>}
    >
      <div className="toolbar">
        <div className="search" style={{ maxWidth: 280 }}>
          <Search />
          <input className="input input-sm" placeholder="Paciente, código o terapeuta" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select input-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="todas">Todos los estados</option>
          {['pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select className="select input-sm" value={therapistId} onChange={(e) => setTherapistId(e.target.value)}>
          <option value="todos">Todos los terapeutas</option>
          {(therapists || []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input className="input input-sm" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} style={{ width: 150 }} />
        <span className="tiny muted">a</span>
        <input className="input input-sm" type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} style={{ width: 150 }} />
        <span className="spacer" />
        <span className="tiny muted">{data?.length || 0} resultados</span>
      </div>

      {loading && !data ? <Loader /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <div className="panel">
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>Cita</th><th>Paciente</th><th>Terapeuta</th><th>Horario</th><th>Estado</th><th>Pago</th><th className="t-right">Valor</th><th /></tr>
              </thead>
              <tbody>
                {(data || []).map((a: any) => (
                  <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(a)}>
                    <td><strong style={{ fontSize: 12 }}>{a.code}</strong><div className="tiny muted">{dateShort(a.date)}</div></td>
                    <td><div className="cell-main"><Avatar name={a.patient_name} size="sm" /><div className="meta"><strong>{a.patient_name}</strong><span>{a.patient_email}</span></div></div></td>
                    <td><div className="cell-main"><Avatar src={a.therapist_photo} name={a.therapist_name} size="sm" /><div className="meta"><strong>{a.therapist_name}</strong><span>{a.modality === 'virtual' ? 'Virtual' : 'Presencial'}</span></div></div></td>
                    <td><strong style={{ fontSize: 12 }}>{time12(a.start)}</strong><div className="tiny muted">{time12(a.end)}</div></td>
                    <td><StatusBadge status={a.status} /></td>
                    <td><PayBadge status={a.payment_status} /></td>
                    <td className="t-right money">{money(a.price)}</td>
                    <td className="t-right" onClick={(e) => e.stopPropagation()}>
                      <div className="row-actions">
                        <button className="icon-btn" title="Editar" onClick={() => setEdit(a)}><Pencil /></button>
                        <button className="icon-btn" title="Eliminar" onClick={() => remove(a)}><Trash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(data || []).length === 0 && <Empty title="Sin citas para estos filtros" text="Prueba ampliar el rango de fechas." icon={<CalendarDays />} />}
          </div>
        </div>
      )}

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.patient_name}
        subtitle={selected ? `${selected.code} · ${dateShort(selected.date)} · ${time12(selected.start)}` : ''}
        footer={selected && (
          <>
            <button className="btn btn-sm btn-danger-soft" onClick={() => remove(selected)}><Trash2 /> Eliminar</button>
            <button className="btn btn-sm btn-ghost" onClick={() => { setEdit(selected); setSelected(null); }}><Pencil /> Editar</button>
            <Link className="btn btn-sm" to="/admin/pagos"><Wallet /> Pagos</Link>
          </>
        )}
      >
        {selected && (
          <>
            <div className="hstack" style={{ marginBottom: 14 }}>
              <StatusBadge status={selected.status} /><PayBadge status={selected.payment_status} />
              <span className="badge no-dot">{selected.modality === 'virtual' ? <><Video style={{ width: 12, height: 12 }} /> Virtual</> : <><MapPin style={{ width: 12, height: 12 }} /> Presencial</>}</span>
            </div>
            <div className="info-grid">
              <div className="info-box"><div className="k">Fecha</div><div className="v">{dateShort(selected.date)}</div></div>
              <div className="info-box"><div className="k">Horario</div><div className="v">{time12(selected.start)} – {time12(selected.end)}</div></div>
              <div className="info-box"><div className="k">Terapeuta</div><div className="v">{selected.therapist_name}</div></div>
              <div className="info-box"><div className="k">Valor</div><div className="v">{money(selected.price)}</div></div>
              <div className="info-box"><div className="k">Correo</div><div className="v" style={{ fontSize: 11.5 }}>{selected.patient_email}</div></div>
              <div className="info-box"><div className="k">Teléfono</div><div className="v">{selected.patient_phone || '—'}</div></div>
            </div>
            <div className="form-section">
              <h4>Motivo</h4>
              <p className="small" style={{ margin: 0 }}>{selected.reason || 'Sin motivo registrado'}</p>
            </div>
            <div className="form-section">
              <h4>Asistencia</h4>
              <div className="hstack">
                <button className="btn btn-sm btn-soft" onClick={() => setApptStatus(selected, 'confirmada')}><CheckCircle2 /> Confirmar</button>
                <button className="btn btn-sm btn-soft" onClick={() => setApptStatus(selected, 'completada')}><CheckCircle2 /> Completada</button>
                <button className="btn btn-sm btn-ghost" onClick={() => setApptStatus(selected, 'no_asistio')}><XCircle /> No asistió</button>
                <button className="btn btn-sm btn-danger-soft" onClick={() => setApptStatus(selected, 'cancelada')}><XCircle /> Cancelar</button>
              </div>
            </div>
            <div className="form-section">
              <h4>Pagos asociados</h4>
              <Link className="btn btn-sm btn-ghost" to="/admin/pagos">Ir a pagos y comprobantes</Link>
            </div>
          </>
        )}
      </Drawer>

      {edit && <AppointmentModal open appointment={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
      {creating && <AppointmentModal open onClose={() => setCreating(false)} onSaved={() => { setCreating(false); reload(); }} />}
    </AdminPage>
  );
}
