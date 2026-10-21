import { LayoutDashboard, TrendingUp, TrendingDown, Users, ShieldCheck, Wifi, Zap, Activity, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { AdminPage } from '../../components/AdminLayout';
import { Badge, Empty, Loader, useFetch, useToast } from '../../lib/ui';
import { dateShort } from '../../lib/format';

export function AdminControlCenter() {
  const toast = useToast();

  // Estado del sistema
  const { data: bootstrap, loading: loadBootstrap, error: errBootstrap, reload: reloadBootstrap } = useFetch<any>(
    () => api('/public/bootstrap'),
    []
  );
  const { data: patientsData, loading: loadPatients, error: errPatients, reload: reloadPatients } = useFetch<any>(
    () => api('/admin-advanced/patients/list?status=activo'),
    []
  );
  const { data: therapistsData, loading: loadTherapists, error: errTherapists, reload: reloadTherapists } = useFetch<any[]>(
    () => api('/admin/therapists'),
    []
  );
  const { data: accountingData, loading: loadAccounting, error: errAccounting, reload: reloadAccounting } = useFetch<any>(
    () => api('/admin/accounting'),
    []
  );

  // Integraciones
  const { data: integrations, loading: loadInt, error: errInt, reload: reloadInt } = useFetch<any[]>(
    () => api('/admin-advanced/integrations/status'),
    []
  );

  // Diagnósticos
  const { data: diagnostics, loading: loadDiag, error: errDiag, reload: reloadDiag } = useFetch<any>(
    () => api('/admin-advanced/system/diagnostics'),
    []
  );

  // Asistencia (alertas)
  const { data: attendance, loading: loadAtt, error: errAtt, reload: reloadAtt } = useFetch<any>(
    () => api('/admin-advanced/attendance/overview'),
    []
  );

  const stats = bootstrap?.stats || {};
  const activePatients = patientsData ? (Array.isArray(patientsData) ? patientsData.length : (patientsData.total || patientsData.count || 0)) : 0;
  const therapistCount = Array.isArray(therapistsData) ? therapistsData.length : (therapistsData?.total || therapistsData?.count || 0);
  const monthIncome = accountingData?.monthIncome || accountingData?.income || accountingData?.total || accountingData?.incomeMonth || 0;

  return (
    <AdminPage
      title="Centro de control"
      subtitle="Estado del sistema, integraciones y alertas"
      actions={
        <>
          <button className="btn btn-ghost btn-sm" onClick={() => { reloadBootstrap(); reloadPatients(); reloadTherapists(); reloadAccounting(); reloadInt(); reloadDiag(); reloadAtt(); }}>
            <Activity style={{ width: 14, height: 14 }} /> Actualizar
          </button>
        </>
      }
    >
      {/* Estado del sistema */}
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, marginTop: 0 }}>Estado del sistema</h2>
      <div className="kpi-grid" style={{ marginBottom: 22 }}>
        <div className="panel" style={{ padding: 18, minHeight: 128 }}>
          <div className="label" style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
            <LayoutDashboard style={{ width: 14, height: 14, verticalAlign: 'middle', marginRight: 4 }} /> Sesiones
          </div>
          <div className="value" style={{ fontFamily: 'var(--serif)', fontSize: 28, lineHeight: 1.1 }}>
            {loadBootstrap ? '—' : errBootstrap ? '—' : (stats.sessions ?? 0)}
          </div>
          <div className="delta" style={{ fontSize: 11, color: 'var(--muted)' }}>
            {loadBootstrap ? 'Cargando...' : errBootstrap ? 'Sin datos disponibles' : 'Completadas'}
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => reloadBootstrap()}>Recargar</button>
        </div>

        <div className="panel" style={{ padding: 18, minHeight: 128 }}>
          <div className="label" style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
            <Users style={{ width: 14, height: 14, verticalAlign: 'middle', marginRight: 4 }} /> Pacientes activos
          </div>
          <div className="value" style={{ fontFamily: 'var(--serif)', fontSize: 28, lineHeight: 1.1 }}>
            {loadPatients ? '—' : errPatients ? '—' : (activePatients)}
          </div>
          <div className="delta" style={{ fontSize: 11, color: 'var(--muted)' }}>
            {loadPatients ? 'Cargando...' : errPatients ? 'Endpoint sin datos' : 'Estado activo'}
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => reloadPatients()}>Recargar</button>
        </div>

        <div className="panel" style={{ padding: 18, minHeight: 128 }}>
          <div className="label" style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
            <ShieldCheck style={{ width: 14, height: 14, verticalAlign: 'middle', marginRight: 4 }} /> Terapeutas
          </div>
          <div className="value" style={{ fontFamily: 'var(--serif)', fontSize: 28, lineHeight: 1.1 }}>
            {loadTherapists ? '—' : errTherapists ? '—' : (therapistCount)}
          </div>
          <div className="delta" style={{ fontSize: 11, color: 'var(--muted)' }}>
            {loadTherapists ? 'Cargando...' : errTherapists ? 'Sin datos' : 'Registrados'}
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => reloadTherapists()}>Recargar</button>
        </div>

        <div className="panel" style={{ padding: 18, minHeight: 128 }}>
          <div className="label" style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
            <TrendingUp style={{ width: 14, height: 14, verticalAlign: 'middle', marginRight: 4 }} /> Ingresos del mes
          </div>
          <div className="value" style={{ fontFamily: 'var(--serif)', fontSize: 28, lineHeight: 1.1 }}>
            {loadAccounting ? '—' : errAccounting ? '—' : (monthIncome)}
          </div>
          <div className="delta" style={{ fontSize: 11, color: 'var(--muted)' }}>
            {loadAccounting ? 'Cargando...' : errAccounting ? 'Sin datos disponibles' : 'Este mes'}
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => reloadAccounting()}>Recargar</button>
        </div>
      </div>

      {/* Integraciones */}
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Integraciones</h2>
      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h3><Wifi style={{ width: 14, height: 14, verticalAlign: 'middle', marginRight: 4 }} /> Estado</h3>
            <Badge tone="info">{loadInt ? '...' : (Array.isArray(integrations) ? integrations.length : 0)}</Badge>
          </div>
          <div className="panel-body">
            {loadInt ? (
              <p className="muted small">Cargando integraciones...</p>
            ) : errInt ? (
              <Empty title="Sin datos de integraciones" text="El endpoint no devolvió datos o dio error." icon={<Wifi />} />
            ) : !Array.isArray(integrations) || integrations.length === 0 ? (
              <Empty title="Sin integraciones" text="No hay integraciones registradas." icon={<Wifi />} />
            ) : (
              <div className="stack-sm">
                {integrations.map((item: any, i: number) => (
                  <div key={i} className="row" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <strong style={{ fontSize: 13, display: 'block' }}>{item.name || item.service || 'Servicio'}</strong>
                      <span className="tiny muted">{item.status || item.state || '—'}</span>
                    </div>
                    <Badge tone={item.status === 'ok' || item.status === 'active' ? 'success' : item.status === 'warning' ? 'warning' : 'info'} dot={false}>
                      {item.status || item.state || '—'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 10 }}>
              <button className="btn btn-sm btn-ghost" onClick={() => reloadInt()}>Recargar</button>
            </div>
          </div>
        </div>
      </div>

      {/* Diagnósticos */}
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, marginTop: 26 }}>Diagnósticos</h2>
      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h3><Zap style={{ width: 14, height: 14, verticalAlign: 'middle', marginRight: 4 }} /> Sistema</h3>
          </div>
          <div className="panel-body">
            {loadDiag ? (
              <Loader label="Cargando diagnósticos..." />
            ) : errDiag ? (
              <Empty title="Sin datos" text="No se pudo cargar el diagnóstico del sistema." icon={<Zap />} />
            ) : !diagnostics ? (
              <Empty title="Sin datos" text="El endpoint no devolvió datos." icon={<Zap />} />
            ) : (
              <div>
                <div style={{ marginBottom: 10 }}>
                  <strong>Registros:</strong> <span className="muted">{diagnostics.count ?? diagnostics.diagnostics?.length ?? 0}</span>
                </div>
                {(diagnostics.diagnostics || []).slice(0, 5).map((d: any, i: number) => (
                  <div key={i} className="card" style={{ padding: 10, marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{d.message || d.title || 'Evento'}</div>
                    <div className="tiny muted">{dateShort(d.created_at || d.date) || '—'}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 10 }}>
              <button className="btn btn-sm btn-ghost" onClick={() => reloadDiag()}>Recargar</button>
            </div>
          </div>
        </div>
      </div>

      {/* Asistencia (alertas) */}
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, marginTop: 26 }}>Asistencia (alertas)</h2>
      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h3><AlertCircle style={{ width: 14, height: 14, verticalAlign: 'middle', marginRight: 4 }} /> Alertas</h3>
            <Badge tone="warning">{loadAtt ? '...' : (attendance?.flagged ? attendance.flagged.length : 0)}</Badge>
          </div>
          <div className="panel-body">
            {loadAtt ? (
              <Loader label="Cargando alertas..." />
            ) : errAtt ? (
              <Empty title="Sin datos" text="No se pudo cargar la asistencia." icon={<AlertCircle />} />
            ) : !attendance ? (
              <Empty title="Sin datos" text="El endpoint no devolvió información." icon={<AlertCircle />} />
            ) : (
              <div>
                <div style={{ fontSize: 12, marginBottom: 8 }}>
                  <span className="muted">Configuración: </span>
                  <strong>{attendance.config ? (attendance.config.name || JSON.stringify(attendance.config)) : 'No definida'}</strong>
                </div>
                {(attendance.flagged || []).length === 0 ? (
                  <Empty title="Sin alertas" text="No hay pacientes con alertas de asistencia." icon={<AlertCircle />} />
                ) : (
                  <div className="stack-sm">
                    {(attendance.flagged || []).slice(0, 8).map((p: any, i: number) => (
                      <div key={i} className="row" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                        <div className="grow" style={{ minWidth: 0 }}>
                          <strong style={{ fontSize: 13 }}>{p.name || '—'}</strong>
                          <div className="tiny muted">{p.email || '—'} · {p.totalFlagged || p.flagged || 0} alertas</div>
                        </div>
                        <Badge tone="warning" dot={false}>{p.totalFlagged || 0}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div style={{ marginTop: 10 }}>
              <button className="btn btn-sm btn-ghost" onClick={() => reloadAtt()}>Recargar</button>
            </div>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}

export default AdminControlCenter;
