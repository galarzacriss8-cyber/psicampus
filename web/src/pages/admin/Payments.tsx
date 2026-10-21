import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Eye, FileText, Plus, ReceiptText, Wallet, XCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { AdminPage } from '../../components/AdminLayout';
import { Avatar, Badge, Empty, ErrorState, Field, Loader, Modal, PayBadge, StatusBadge, useFetch, useToast } from '../../lib/ui';
import { addDays, dateShort, money, time12, today } from '../../lib/format';

const TABS = [
  ['en_revision', 'Por validar'],
  ['verificado', 'Verificados'],
  ['rechazado', 'Rechazados'],
  ['todos', 'Todos'],
];

export function AdminPayments() {
  const toast = useToast();
  const [tab, setTab] = useState('en_revision');
  const [manual, setManual] = useState(false);
  const { data, loading, error, reload } = useFetch<any[]>(() => api(`/admin/payments?status=${tab}`), [tab]);

  const totals = useMemo(() => {
    const list = data || [];
    return { count: list.length, amount: list.reduce((s, p) => s + Number(p.amount), 0) };
  }, [data]);

  const act = async (pay: any, action: 'verify' | 'reject') => {
    let note = '';
    if (action === 'reject') {
      const reason = window.prompt('Motivo del rechazo (se guardará en el pago):', 'Comprobante ilegible o monto incorrecto');
      if (reason === null) return;
      note = reason;
    }
    try {
      await api(`/admin/payments/${pay.id}`, { method: 'PATCH', body: { action, note } });
      toast.success(action === 'verify' ? 'Pago verificado y cita marcada como pagada' : 'Pago rechazado');
      reload();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <AdminPage
      title="Pagos y comprobantes"
      subtitle="Valida las transferencias de los pacientes y mantén la contabilidad al día."
      actions={<button className="btn btn-sm" onClick={() => setManual(true)}><Plus /> Registrar pago manual</button>}
    >
      <div className="row-between" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div className="segmented wrap">
          {TABS.map(([v, l]) => <button key={v} className={tab === v ? 'on' : ''} onClick={() => setTab(v)}>{l}</button>)}
        </div>
        <div className="hstack">
          <Badge tone="forest" dot={false}>{totals.count} registros</Badge>
          <strong style={{ fontFamily: 'var(--serif)', fontSize: 24 }}>{money(totals.amount)}</strong>
        </div>
      </div>

      {loading && !data ? <Loader /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <>
          {tab === 'en_revision' ? (
            <div className="grid-2">
              {(data || []).map((p: any) => (
                <div className="panel" key={p.id}>
                  <div className="panel-body" style={{ display: 'flex', gap: 14 }}>
                    <div style={{ width: 96, flex: 'none' }}>
                      {p.receipt ? (
                        <a href={p.receipt} target="_blank" rel="noreferrer">
                          <div style={{ aspectRatio: '3/4', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)', background: 'var(--cream)' }}>
                            <img src={p.receipt} alt="Comprobante" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        </a>
                      ) : (
                        <div style={{ aspectRatio: '3/4', borderRadius: 10, border: '1px dashed var(--line-strong)', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}><ReceiptText style={{ width: 22, height: 22 }} /></div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row-between" style={{ alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: 13.5 }}>{p.patient_name}</strong>
                          <div className="tiny muted">{p.code || 'Sin cita'} · {dateShort(p.created_at)}</div>
                        </div>
                        <span style={{ fontFamily: 'var(--serif)', fontSize: 24 }}>{money(p.amount)}</span>
                      </div>
                      <div className="detail-list" style={{ marginTop: 8 }}>
                        <div className="detail-row"><span>Referencia</span><strong>{p.reference || '—'}</strong></div>
                        <div className="detail-row"><span>Sesión</span><strong>{p.session_date ? `${dateShort(p.session_date)} ${time12(p.start)}` : '—'}</strong></div>
                        <div className="detail-row"><span>Terapeuta</span><strong>{p.therapist_name || '—'}</strong></div>
                      </div>
                      <div className="hstack" style={{ marginTop: 10 }}>
                        {p.receipt && <a className="btn btn-sm btn-ghost" href={p.receipt} target="_blank" rel="noreferrer"><Eye /> Ver</a>}
                        <button className="btn btn-sm btn-ghost" onClick={() => act(p, 'reject')}><XCircle /> Rechazar</button>
                        <button className="btn btn-sm" onClick={() => act(p, 'verify')}><CheckCircle2 /> Validar pago</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(data || []).length === 0 && <div className="panel" style={{ gridColumn: '1/-1' }}><Empty title="No hay comprobantes por validar" text="Cuando un paciente suba un comprobante aparecerá aquí." icon={<CheckCircle2 />} /></div>}
            </div>
          ) : (
            <div className="panel">
              <div className="table-wrap">
                <table className="data">
                  <thead><tr><th>Paciente</th><th>Cita</th><th>Fecha</th><th>Monto</th><th>Método</th><th>Estado</th><th>Comprobante</th><th /></tr></thead>
                  <tbody>
                    {(data || []).map((p: any) => (
                      <tr key={p.id}>
                        <td><div className="cell-main"><Avatar name={p.patient_name} size="sm" /><div className="meta"><strong>{p.patient_name}</strong><span>{p.patient_email}</span></div></div></td>
                        <td>{p.code || '—'}<div className="tiny muted">{p.therapist_name}</div></td>
                        <td>{dateShort(p.created_at)}</td>
                        <td className="money">{money(p.amount)}</td>
                        <td>{p.method}</td>
                        <td><PayBadge status={p.status} /></td>
                        <td>{p.receipt ? <a className="btn btn-sm btn-ghost" href={p.receipt} target="_blank" rel="noreferrer">Ver</a> : <span className="tiny muted">—</span>}</td>
                        <td className="t-right">
                          {p.status === 'en_revision' && (
                            <div className="row-actions">
                              <button className="icon-btn" title="Validar" onClick={() => act(p, 'verify')}><CheckCircle2 /></button>
                              <button className="icon-btn" title="Rechazar" onClick={() => act(p, 'reject')}><XCircle /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(data || []).length === 0 && <Empty title="Sin pagos en esta categoría" icon={<Wallet />} />}
              </div>
            </div>
          )}
        </>
      )}

      {manual && <ManualPayment onClose={() => setManual(false)} onSaved={() => { setManual(false); reload(); }} />}
    </AdminPage>
  );
}

function ManualPayment({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ appointmentId: '', amount: '', method: 'transferencia', reference: '', note: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/admin/appointments?from=${addDays(today(), -90)}&to=${addDays(today(), 60)}`).then((rows: any[]) => {
      setAppointments(rows.filter((a) => a.payment_status !== 'pagado'));
    }).catch(() => {});
  }, []);

  const selected = appointments.find((a) => a.id === form.appointmentId);
  const save = async () => {
    if (!form.appointmentId) return toast.error('Selecciona una cita');
    setBusy(true);
    try {
      await api('/admin/payments', { method: 'POST', body: { ...form, amount: Number(form.amount || selected?.price), status: 'verificado' } });
      toast.success('Pago registrado'); onSaved();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="Registrar pago manual" subtitle="Para transferencias externas o pagos en efectivo."
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Registrar pago'}</button></>}>
      <div className="stack">
        <Field label="Cita / paciente">
          <select className="select" value={form.appointmentId} onChange={(e) => setForm({ ...form, appointmentId: e.target.value, amount: appointments.find((a) => a.id === e.target.value)?.price ?? '' })}>
            <option value="">Selecciona una cita sin pagar</option>
            {appointments.map((a) => <option key={a.id} value={a.id}>{a.patient_name} · {dateShort(a.date)} {time12(a.start)} · {a.code}</option>)}
          </select>
        </Field>
        <div className="form-grid">
          <Field label="Monto (USD)"><input className="input" type="number" step="0.5" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="Método">
            <select className="select" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              <option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option><option value="deposito">Depósito</option>
            </select>
          </Field>
          <Field label="Referencia" className="span-2"><input className="input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></Field>
          <Field label="Nota" className="span-2"><input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Detalle interno del pago" /></Field>
        </div>
      </div>
    </Modal>
  );
}
