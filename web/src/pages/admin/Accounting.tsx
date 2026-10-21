import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Download, FileText, Plus, ReceiptText, Trash2, TrendingUp, Wallet } from 'lucide-react';
import { api, apiUrl, getToken } from '../../lib/api';
import { AdminPage } from '../../components/AdminLayout';
import { BarChart, Empty, ErrorState, Field, Loader, Modal, useFetch, useToast } from '../../lib/ui';
import { dateShort, money } from '../../lib/format';

const monthStart = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
const monthEnd = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10); };
const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

export function AdminAccounting() {
  const toast = useToast();
  const [range, setRange] = useState({ from: monthStart(), to: monthEnd() });
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [tab, setTab] = useState<'ingresos' | 'egresos'>('ingresos');
  const { data, loading, error, reload } = useFetch<any>(() => api(`/admin/accounting?from=${range.from}&to=${range.to}`), [range.from, range.to]);

  const series = useMemo(() => (data?.series || []).map((s: any) => ({
    label: new Date(s.month + '-02').toLocaleDateString('es-EC', { month: 'short' }).replace('.', ''), income: s.income, expense: s.expenses,
  })), [data]);

  const exportCsv = async () => {
    try {
      const res = await fetch(apiUrl(`/admin/accounting/export.csv?from=${range.from}&to=${range.to}`), { headers: { Authorization: `Bearer ${getToken()}` } });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `psicampus-contabilidad-${range.from}-${range.to}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Reporte descargado');
    } catch { toast.error('No se pudo descargar el reporte'); }
  };

  const delExpense = async (id: string) => {
    if (!confirm('¿Eliminar este egreso?')) return;
    try { await api(`/admin/expenses/${id}`, { method: 'DELETE' }); toast.success('Egreso eliminado'); reload(); }
    catch (e: any) { toast.error(e.message); }
  };

  if (loading && !data) return <Loader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const margin = data.income ? Math.round((data.balance / data.income) * 100) : 0;

  return (
    <AdminPage
      title="Contabilidad"
      subtitle="Ingresos por sesiones, egresos operativos y balance del periodo."
      actions={
        <>
          <input className="input input-sm" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} style={{ width: 145 }} />
          <input className="input input-sm" type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} style={{ width: 145 }} />
          <button className="btn btn-sm btn-ghost" onClick={exportCsv}><Download /> Exportar CSV</button>
          <button className="btn btn-sm" onClick={() => setExpenseOpen(true)}><Plus /> Registrar egreso</button>
        </>
      }
    >
      <div className="kpi-grid">
        <div className="kpi dark"><div className="label"><ArrowUpRight /> Ingresos</div><div className="value">{money(data.income)}</div><div className="delta" style={{ color: '#a7d8bd' }}>{data.incomeRows.length} pagos verificados</div></div>
        <div className="kpi"><div className="label"><ArrowDownRight /> Egresos</div><div className="value">{money(data.expenses)}</div><div className="delta down">{data.expenseRows.length} movimientos</div></div>
        <div className="kpi"><div className="label"><Wallet /> Balance</div><div className="value" style={{ color: data.balance >= 0 ? 'var(--success)' : 'var(--danger)' }}>{money(data.balance)}</div><div className="delta"><TrendingUp style={{ width: 13, height: 13 }} /> Margen {margin}%</div></div>
        <div className="kpi"><div className="label"><ReceiptText /> Ticket promedio</div><div className="value">{money(data.incomeRows.length ? data.income / data.incomeRows.length : 0, { decimals: true })}</div><div className="delta"><span>por sesión cobrada</span></div></div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head"><h3>Evolución mensual</h3><div className="chart-legend"><span><i style={{ background: 'var(--forest)' }} /> Ingresos</span><span><i style={{ background: 'var(--clay-soft)' }} /> Egresos</span></div></div>
          <div className="chart-box"><BarChart data={series} height={200} /></div>
        </div>
        <div className="panel">
          <div className="panel-head"><h3>Egresos por categoría</h3></div>
          <div className="panel-body">
            {Object.keys(data.byCategory).length === 0 && <Empty title="Sin egresos" icon={<FileText />} />}
            {Object.entries(data.byCategory).sort((a: any, b: any) => b[1] - a[1]).map(([cat, val]: any) => (
              <div key={cat} style={{ marginBottom: 12 }}>
                <div className="row-between" style={{ fontSize: 12, marginBottom: 4 }}><span>{cat}</span><strong>{money(val)}</strong></div>
                <div className="bar-track" style={{ height: 6, borderRadius: 4, background: 'var(--cream-2)', overflow: 'hidden' }}>
                  <i style={{ display: 'block', height: '100%', width: `${(val / data.expenses) * 100}%`, background: 'var(--clay)', borderRadius: 4 }} />
                </div>
              </div>
            ))}
            <div className="divider" />
            <div className="stat-line"><span>Ingresos por terapeuta</span><strong /></div>
            {Object.entries(data.byTherapist).sort((a: any, b: any) => b[1] - a[1]).map(([name, val]: any) => (
              <div className="stat-line" key={name}><span>{name}</span><strong>{money(val)}</strong></div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 14 }}>
        <div className="panel-head">
          <div className="tabs-line" style={{ margin: 0, border: 0 }}>
            <button className={tab === 'ingresos' ? 'on' : ''} onClick={() => setTab('ingresos')}>Ingresos ({data.incomeRows.length})</button>
            <button className={tab === 'egresos' ? 'on' : ''} onClick={() => setTab('egresos')}>Egresos ({data.expenseRows.length})</button>
          </div>
          <span className="tiny muted">{dateShort(range.from)} – {dateShort(range.to)}</span>
        </div>
        <div className="table-wrap">
          {tab === 'ingresos' ? (
            <table className="data">
              <thead><tr><th>Fecha</th><th>Cita</th><th>Paciente</th><th>Terapeuta</th><th>Método</th><th className="t-right">Monto</th></tr></thead>
              <tbody>
                {data.incomeRows.map((r: any) => (
                  <tr key={r.id}>
                    <td>{dateShort(r.session_date || r.created_at)}</td>
                    <td>{r.code || '—'}</td>
                    <td>{r.patient_name}</td>
                    <td>{r.therapist_name || '—'}</td>
                    <td>{r.method}</td>
                    <td className="t-right money positive">+{money(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="data">
              <thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Método</th><th className="t-right">Monto</th><th /></tr></thead>
              <tbody>
                {data.expenseRows.map((r: any) => (
                  <tr key={r.id}>
                    <td>{dateShort(r.date)}</td>
                    <td><span className="tag">{r.category}</span></td>
                    <td>{r.description || '—'}</td>
                    <td>{r.method}</td>
                    <td className="t-right money negative">-{money(r.amount)}</td>
                    <td className="t-right"><button className="icon-btn" onClick={() => delExpense(r.id)}><Trash2 /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {((tab === 'ingresos' && data.incomeRows.length === 0) || (tab === 'egresos' && data.expenseRows.length === 0)) && (
            <Empty title="Sin movimientos en el periodo" text="Cambia el rango de fechas o registra un egreso." icon={<Wallet />} />
          )}
        </div>
        <div className="panel-foot row-between">
          <span className="tiny muted">Los ingresos se calculan solo con pagos verificados. Los egresos se registran manualmente.</span>
          <strong style={{ fontSize: 13 }}>Balance: {money(data.balance)}</strong>
        </div>
      </div>

      {expenseOpen && <ExpenseModal onClose={() => setExpenseOpen(false)} onSaved={() => { setExpenseOpen(false); reload(); }} />}
    </AdminPage>
  );
}

function ExpenseModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<any>({ date: new Date().toISOString().slice(0, 10), category: 'Servicios', description: '', amount: '', method: 'transferencia' });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!form.amount) return toast.error('Ingresa el monto');
    setBusy(true);
    try { await api('/admin/expenses', { method: 'POST', body: { ...form, amount: Number(form.amount) } }); toast.success('Egreso registrado'); onSaved(); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Registrar egreso"
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar egreso'}</button></>}>
      <div className="form-grid">
        <Field label="Fecha"><input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
        <Field label="Categoría">
          <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {['Alquiler', 'Servicios', 'Materiales', 'Marketing', 'Capacitación', 'Tecnología', 'Transporte', 'Otros'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Descripción" className="span-2"><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ej. Alquiler consultorio octubre" /></Field>
        <Field label="Monto (USD)"><input className="input" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
        <Field label="Método">
          <select className="select" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            <option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option>
          </select>
        </Field>
      </div>
    </Modal>
  );
}
