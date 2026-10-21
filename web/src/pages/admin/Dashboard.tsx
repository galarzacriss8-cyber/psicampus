import { useState } from 'react';
import {
  ArrowRight, ArrowUpRight, CalendarDays, CheckCircle2, Clock, DollarSign, FileWarning, Plus,
  TrendingDown, TrendingUp, Users, Wallet, AlertCircle, Activity, CalendarClock,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Link } from '../../lib/router';
import { Avatar, Badge, Donut, ErrorState, Loader, PayBadge, StatusBadge, useFetch } from '../../lib/ui';
import { AdminPage } from '../../components/AdminLayout';
import { AppointmentModal } from '../../components/AppointmentModal';
import { BarChart } from '../../lib/ui';
import { dateMed, money, pct, time12, today } from '../../lib/format';

const STATUS_COLORS: Record<string, string> = {
  completada: '#2b7355', confirmada: '#35617f', pendiente: '#b98a2f', cancelada: '#a83a35', no_asistio: '#8b6f5c',
};

export function AdminDashboard() {
  const { data, loading, error, reload } = useFetch<any>(() => api('/admin/overview'), []);
  const [newAppt, setNewAppt] = useState(false);

  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const k = data.kpis;
  const series = data.series.map((s: any) => ({ label: new Date(s.month + '-02').toLocaleDateString('es-EC', { month: 'short' }).replace('.', ''), income: s.income, expense: s.expenses }));
  const segments = (data.statusCounts || []).map((s: any) => ({ label: s.status.replace('_', ' '), value: s.c, color: STATUS_COLORS[s.status] || '#999' }));
  const statusTotal = segments.reduce((a: number, b: any) => a + b.value, 0);

  return (
    <AdminPage
      title="Panel general"
      subtitle={`Resumen de la clínica · ${new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })}`}
      actions={
        <>
          <button className="btn btn-ghost btn-sm" onClick={() => reload()}><Activity /> Actualizar</button>
          <Link className="btn btn-sm" to="/admin/contabilidad">Ver contabilidad <ArrowRight /></Link>
          <button className="btn btn-sm" onClick={() => setNewAppt(true)}><Plus /> Nueva cita</button>
        </>
      }
    >
      <div className="kpi-grid">
        <div className="kpi dark">
          <div className="label"><Wallet /> Ingresos del mes</div>
          <div className="value">{money(k.incomeMonth)}</div>
          <div className="delta" style={{ color: k.balanceMonth >= 0 ? '#a7d8bd' : '#f0b4ad' }}>
            {k.balanceMonth >= 0 ? <TrendingUp style={{ width: 13, height: 13 }} /> : <TrendingDown style={{ width: 13, height: 13 }} />}
            Balance {money(k.balanceMonth)} <span>egresos {money(k.expensesMonth)}</span>
          </div>
        </div>
        <div className="kpi">
          <div className="label"><CalendarDays /> Citas de hoy</div>
          <div className="value">{k.todayCount} <small>· {k.weekCount} esta semana</small></div>
          <div className="delta"><CheckCircle2 style={{ width: 13, height: 13 }} /> {k.pendingConfirm} por confirmar <span>· {k.noShowRate}% ausentismo</span></div>
        </div>
        <div className="kpi">
          <div className="label"><Users /> Pacientes activos</div>
          <div className="value">{k.activePatients} <small>de {k.totalPatients}</small></div>
          <div className="delta" style={{ color: 'var(--warning)' }}><AlertCircle style={{ width: 13, height: 13 }} /> {k.inactive} no frecuentes <span>· {k.newPatients} nuevos</span></div>
        </div>
        <div className={`kpi ${k.pendingCount ? 'accent' : ''}`}>
          <div className="label"><FileWarning /> Por validar</div>
          <div className="value">{money(k.pendingAmount)}</div>
          <div className="delta" style={{ color: k.pendingCount ? 'rgba(255,255,255,.85)' : 'var(--success)' }}>
            {k.pendingTotal} comprobantes <span>· ticket {money(k.avgTicket, { decimals: true })}</span>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <div><h3>Ingresos y egresos</h3><span className="tiny muted">Últimos 6 meses</span></div>
            <div className="chart-legend">
              <span><i style={{ background: 'var(--forest)' }} /> Ingresos</span>
              <span><i style={{ background: 'var(--clay-soft)', border: '1px solid rgba(192,96,60,.3)' }} /> Egresos</span>
            </div>
          </div>
          <div className="chart-box">
            <BarChart data={series} height={185} />
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Citas del mes</h3><Badge tone="forest" dot={false}>{statusTotal}</Badge></div>
          <div className="panel-body">
            <Donut segments={segments} center={<div><div style={{ fontFamily: 'var(--serif)', fontSize: 24 }}>{statusTotal}</div><div className="tiny muted">citas</div></div>} />
            <div className="divider" />
            <div className="stat-line"><span>Ocupación semanal</span><strong>{pct(k.weekCount, data.weeklyCapacity)}%</strong></div>
            <div className="bar-track" style={{ height: 7, borderRadius: 4, background: 'var(--cream-2)', overflow: 'hidden' }}>
              <i style={{ display: 'block', height: '100%', width: `${Math.min(100, pct(k.weekCount, data.weeklyCapacity))}%`, background: 'linear-gradient(90deg, var(--forest-2), var(--moss))' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 14 }}>
        <div className="panel">
          <div className="panel-head">
            <div><h3>Agenda de hoy</h3><span className="tiny muted">{dateMed(today())}</span></div>
            <Link className="btn btn-sm btn-ghost" to="/admin/agenda">Ver semana <ArrowRight /></Link>
          </div>
          <div className="panel-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
            {data.today.length === 0 && (
              <div className="empty"><CalendarDays /><h4>Sin citas para hoy</h4><p>Aprovecha para revisar los comprobantes pendientes o agendar un paciente.</p><button className="btn btn-sm" style={{ marginTop: 12 }} onClick={() => setNewAppt(true)}><Plus /> Agendar cita</button></div>
            )}
            {data.today.map((a: any) => (
              <div key={a.id} className="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--line)', gap: 12 }}>
                <div style={{ width: 66, textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: 12.5 }}>{time12(a.start)}</div>
                  <div className="tiny muted">{a.modality === 'virtual' ? 'virtual' : 'campus'}</div>
                </div>
                <Avatar src={a.therapist_photo} name={a.therapist_name} size="sm" />
                <div className="grow" style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: 12.5, display: 'block' }}>{a.patient_name}</strong>
                  <span className="tiny muted">{a.therapist_name} · {a.reason || 'Consulta'}</span>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div><h3>Comprobantes por validar</h3><span className="tiny muted">{money(k.pendingAmount)} en revisión</span></div>
            <Link className="btn btn-sm btn-ghost" to="/admin/pagos">Ver todos <ArrowRight /></Link>
          </div>
          <div className="panel-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
            {data.pendingPayments.length === 0 && <div className="empty"><CheckCircle2 /><h4>Todo validado</h4><p>No hay comprobantes pendientes.</p></div>}
            {data.pendingPayments.map((p: any) => (
              <div key={p.id} className="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--line)', gap: 10 }}>
                <span className="icon-chip clay" style={{ width: 34, height: 34 }}><Wallet style={{ width: 15, height: 15 }} /></span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: 12.5, display: 'block' }}>{p.patient_name}</strong>
                  <span className="tiny muted">{p.code || 'Sin cita'} · {p.reference || 'sin referencia'}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: 13 }}>{money(p.amount)}</strong>
                  <div><Link className="tiny" style={{ color: 'var(--forest-2)', fontWeight: 700 }} to="/admin/pagos">Validar</Link></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 14 }}>
        <div className="panel">
          <div className="panel-head"><h3>Carga por terapeuta</h3><span className="tiny muted">Citas del mes</span></div>
          <div className="panel-body">
            <div className="load-list">
              {data.load.sort((a: any, b: any) => b.appointments - a.appointments).map((t: any) => {
                const max = Math.max(1, ...data.load.map((x: any) => x.appointments));
                return (
                  <div className="load-row" key={t.id}>
                    <Avatar src={t.photo} name={t.name} size="sm" />
                    <div>
                      <div className="who"><strong>{t.name}</strong><span>{t.appointments} citas · {money(t.income)}</span></div>
                      <div className="bar-track"><i style={{ width: `${(t.appointments / max) * 100}%` }} /></div>
                    </div>
                    <span className="tiny muted">{pct(t.appointments, max)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Alertas y seguimiento</h3><Badge tone="warning">{data.alerts.length}</Badge></div>
          <div className="panel-body">
            {data.alerts.length === 0 && <div className="empty"><CheckCircle2 /><h4>Sin alertas</h4><p>Todo está bajo control.</p></div>}
            <div className="stack-sm">
              {data.alerts.map((a: any, i: number) => (
                <Link key={i} to={a.link} className={`notice ${a.kind === 'danger' ? 'notice-danger' : a.kind === 'warning' ? 'notice-warning' : 'notice-info'}`} style={{ alignItems: 'center' }}>
                  {a.kind === 'warning' ? <FileWarning /> : <AlertCircle />}
                  <span className="grow"><strong style={{ display: 'block', fontSize: 12 }}>{a.title}</strong><span className="tiny" style={{ opacity: 0.75 }}>{a.text}</span></span>
                  <ArrowUpRight style={{ width: 15, height: 15 }} />
                </Link>
              ))}
            </div>
            <div className="divider" />
            <div className="grid-2e" style={{ gap: 8 }}>
              <div className="info-box"><div className="k">Encuestas del mes</div><div className="v">{k.surveysMonth}</div></div>
              <div className="info-box"><div className="k">Ticket promedio</div><div className="v">{money(k.avgTicket, { decimals: true })}</div></div>
            </div>
          </div>
        </div>
      </div>

      <AppointmentModal open={newAppt} onClose={() => setNewAppt(false)} onSaved={reload} />
    </AdminPage>
  );
}
