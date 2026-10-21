import { useEffect, useState } from 'react';
import { ArrowRight, ClipboardList, Save, SlidersHorizontal, Wallet } from 'lucide-react';
import { api } from '../../lib/api';
import { AdminPage } from '../../components/AdminLayout';
import { Badge, Empty, ErrorState, Loader, useFetch, useToast } from '../../lib/ui';
import { dateShort, money } from '../../lib/format';

export function AdminPricing() {
  const toast = useToast();
  const { data: cfg, loading, error, reload } = useFetch<any>(() => api('/admin/settings'), []);
  const { data: surveys, loading: sl, reload: reloadSurveys } = useFetch<any>(() => api('/admin/surveys'), []);
  const [tiers, setTiers] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (cfg?.tiers) setTiers(cfg.tiers.map((t: any) => ({ ...t }))); }, [cfg]);

  if (loading && !cfg) return <Loader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const save = async () => {
    setBusy(true);
    try {
      await api('/admin/tiers', { method: 'PUT', body: { tiers } });
      toast.success('Escala de tarifas actualizada');
      reload();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const stats = surveys?.stats || {};

  return (
    <AdminPage
      title="Tarifas y encuesta"
      subtitle="Escala solidaria de aportes y resultados de la encuesta económica."
      actions={<button className="btn btn-sm" onClick={save} disabled={busy}><Save /> {busy ? 'Guardando…' : 'Guardar escala'}</button>}
    >
      <div className="grid-2">
        <div className="panel">
          <div className="panel-head"><h3>Escala de aportes</h3><Badge tone="sage" dot={false}>{tiers.length} niveles</Badge></div>
          <div className="panel-body">
            <p className="small muted" style={{ marginTop: 0 }}>El puntaje de la encuesta va de 0 a 100. Cada nivel cubre un rango y define el aporte sugerido por sesión. Los pacientes pueden aportar más, nunca menos sin autorización.</p>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Nivel</th><th>Nombre</th><th>Aporte</th><th>Desde</th><th>Hasta</th><th>Activo</th></tr></thead>
                <tbody>
                  {tiers.map((t, i) => (
                    <tr key={t.code}>
                      <td><strong>{t.code}</strong></td>
                      <td><input className="input input-sm" value={t.name} onChange={(e) => setTiers(tiers.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} /></td>
                      <td><input className="input input-sm" type="number" step="0.5" value={t.price} onChange={(e) => setTiers(tiers.map((x, j) => j === i ? { ...x, price: Number(e.target.value) } : x))} style={{ width: 80 }} /></td>
                      <td><input className="input input-sm" type="number" value={t.min_score} onChange={(e) => setTiers(tiers.map((x, j) => j === i ? { ...x, min_score: Number(e.target.value) } : x))} style={{ width: 70 }} /></td>
                      <td><input className="input input-sm" type="number" value={t.max_score} onChange={(e) => setTiers(tiers.map((x, j) => j === i ? { ...x, max_score: Number(e.target.value) } : x))} style={{ width: 70 }} /></td>
                      <td><input type="checkbox" checked={!!t.active} onChange={(e) => setTiers(tiers.map((x, j) => j === i ? { ...x, active: e.target.checked ? 1 : 0 } : x))} style={{ accentColor: 'var(--forest-2)' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="notice notice-info" style={{ marginTop: 12 }}><SlidersHorizontal /><span>Si cambias un rango, revisa que no se cruce con el siguiente. Los pacientes conservan la tarifa asignada hasta que repitan la encuesta o administración la ajuste.</span></div>
          </div>
        </div>

        <div className="stack">
          <div className="panel">
            <div className="panel-head"><h3>Resumen de encuestas</h3><ClipboardList style={{ width: 17, height: 17, color: 'var(--muted)' }} /></div>
            <div className="panel-body">
              <div className="grid-2e" style={{ gap: 10 }}>
                <div className="info-box"><div className="k">Encuestas</div><div className="v">{stats.count || 0}</div></div>
                <div className="info-box"><div className="k">Puntaje promedio</div><div className="v">{Math.round(stats.avgScore || 0)}/100</div></div>
                <div className="info-box"><div className="k">Sugerido promedio</div><div className="v">{money(stats.avgSuggested || 0, { decimals: true })}</div></div>
                <div className="info-box"><div className="k">Declarado promedio</div><div className="v">{money(stats.avgDeclared || 0, { decimals: true })}</div></div>
              </div>
              <div className="divider" />
              {(surveys?.distribution || []).map((d: any) => (
                <div className="stat-line" key={d.tier_code}><span>Nivel {d.tier_code}</span><strong>{d.c} pacientes</strong></div>
              ))}
            </div>
          </div>
          <div className="card card-forest">
            <div className="hstack"><Wallet style={{ width: 18, height: 18 }} /><strong style={{ fontSize: 13 }}>Fondo solidario</strong></div>
            <p className="small" style={{ opacity: 0.7, margin: '8px 0 0' }}>Los aportes de niveles G, H e I financian cupos de nivel A y B. Puedes ver la proporción en la distribución de encuestas.</p>
            <button className="btn btn-sm btn-cream" style={{ marginTop: 12 }} onClick={() => location.assign('#/admin/contabilidad')}>Ver contabilidad <ArrowRight /></button>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 14 }}>
        <div className="panel-head"><h3>Últimas encuestas</h3><span className="tiny muted">{surveys?.rows?.length || 0} registros</span></div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Fecha</th><th>Paciente</th><th>Universidad</th><th>Puntaje</th><th>Nivel</th><th>Sugerido</th><th>Declarado</th><th>Asignado</th></tr></thead>
            <tbody>
              {(surveys?.rows || []).map((s: any) => (
                <tr key={s.id}>
                  <td>{dateShort(s.created_at)}</td>
                  <td>{s.patient_name || '—'}</td>
                  <td className="tiny muted">{s.university || '—'}</td>
                  <td>{s.score}/100</td>
                  <td><Badge tone="sage" dot={false}>{s.tier_code}</Badge></td>
                  <td className="money">{money(s.suggested_price)}</td>
                  <td className="money">{money(s.declared_price)}</td>
                  <td className="money">{money(s.assigned_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!surveys?.rows || surveys.rows.length === 0) && <Empty title="Sin encuestas todavía" />}
        </div>
      </div>
    </AdminPage>
  );
}
