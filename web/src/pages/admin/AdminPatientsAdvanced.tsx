import { useState, useEffect } from 'react';
import { Users, ShieldCheck, Lock, AlertTriangle, Activity, Clock, CheckCircle2, Search, Filter } from 'lucide-react';
import { AdminPage } from '../../components/AdminLayout';
import { Badge, Loader, Modal, Empty, useToast, useFetch } from '../../lib/ui';
import { api } from '../../lib/api';

export default function AdminPatientsAdvanced() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const { data, reload } = useFetch<any>(() => api('/admin-advanced/patients/list?q=' + encodeURIComponent(q) + (filterStatus ? '&status=' + filterStatus : '')), [q, filterStatus]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    if (openId) api('/admin-advanced/patients/' + openId + '/detail').then(setDetail).catch(() => setDetail(null));
  }, [openId]);

  const patients = (data?.patients || []) as any[];
  const metrics = (data?.metrics || {}) as any;

  return (
    <AdminPage title="Pacientes avanzados" subtitle="Gestión avanzada de fichas, restricciones y asistencia">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12, marginBottom: 16 }}>
        <div className="panel" style={{ padding: 14 }}><div style={{ fontSize: 28, fontWeight: 700 }}>{metrics.activos ?? patients.filter((p: any) => p.status === 'activo').length}</div><div className="small muted">Activos</div></div>
        <div className="panel" style={{ padding: 14 }}><div style={{ fontSize: 28, fontWeight: 700 }}>{metrics.inactivos ?? patients.filter((p: any) => p.status === 'inactivo').length}</div><div className="small muted">Inactivos</div></div>
        <div className="panel" style={{ padding: 14 }}><div style={{ fontSize: 28, fontWeight: 700 }}>{metrics.conRestricciones ?? patients.filter((p: any) => p.restricciones > 0).length}</div><div className="small muted">Con restricciones</div></div>
        <div className="panel" style={{ padding: 14 }}><div style={{ fontSize: 28, fontWeight: 700 }}>{metrics.riesgoAlto ?? patients.filter((p: any) => p.risk === 'alto').length}</div><div className="small muted">Riesgo alto</div></div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: 1 }}><Search style={{ position: 'absolute', left: 8, top: 10, width: 14, color: 'var(--muted)' }} />
          <input className="input" placeholder="Buscar paciente…" value={q} onChange={e => setQ(e.target.value)} style={{ paddingLeft: 32 }} />
        </div>
        <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Nombre</th><th>Email</th><th>Estado</th><th>Riesgo</th><th>Citas</th><th>Inasistencias</th><th>Restricciones</th><th>Acción</th></tr></thead>
          <tbody>
            {patients.map((p: any) => (
              <tr key={p.id}>
                <td><div style={{ fontWeight: 600 }}>{p.name}</div></td>
                <td>{p.email}</td>
                <td><Badge tone={p.status === 'activo' ? 'success' : 'warning'}>{p.status}</Badge></td>
                <td><Badge tone={p.risk === 'alto' ? 'danger' : p.risk === 'medio' ? 'warning' : 'success'}>{p.risk || '—'}</Badge></td>
                <td>{p.total_citas ?? 0}</td>
                <td><span style={{ color: (p.inasistencias || 0) > 0 ? '#c0603c' : undefined, fontWeight: (p.inasistencias || 0) > 2 ? 700 : 400 }}>{p.inasistencias ?? 0}</span></td>
                <td>{p.restricciones ?? 0}</td>
                <td><button className="btn btn-sm btn-ghost" onClick={() => setOpenId(p.id)}>Ver detalle</button></td>
              </tr>
            ))}
            {patients.length === 0 && <tr><td colSpan={8} className="empty">No se encontraron pacientes.</td></tr>}
          </tbody>
        </table>
      </div>

      {openId && <Modal onClose={() => { setOpenId(null); setDetail(null); }} title={`Detalle — ${detail?.patient?.name || openId}`}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><strong>Estado:</strong> <Badge tone={detail?.patient?.status === 'activo' ? 'success' : 'warning'}>{detail?.patient?.status}</Badge></div>
          <div><strong>Inasistencias:</strong> {detail?.attendance?.noShows ?? 0} / {detail?.attendance?.total ?? 0} citadas</div>
          <div><strong>Restricciones activas:</strong> {(detail?.restrictions || []).filter((r: any) => r.active).length}</div>
          <div><strong>Legal (retención):</strong> {detail?.legal ? 'Verificado' : 'Pendiente'}</div>
          <div><strong>Últimas acciones:</strong>
            <ul style={{ paddingLeft: 14, marginTop: 6 }}>{(detail?.actions || []).slice(0, 5).map((a: any) => <li key={a.id}>{a.action} — {a.actor_name || 'Sistema'} — {new Date(a.created_at).toLocaleString()}</li>)}</ul>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-sm" onClick={() => { toast.success('Acción registrada (simulación en demo)'); }}><ShieldCheck /> Suspender</button>
            <button className="btn btn-sm" onClick={() => { toast.success('Acción registrada'); }}><Lock /> Restricción</button>
            <button className="btn btn-sm btn-ghost" onClick={() => { toast.info('En ejecución real: anonimizar con verificación legal'); }}><AlertTriangle /> Anonimizar</button>
          </div>
        </div>
      </Modal>}
    </AdminPage>
  );
}
