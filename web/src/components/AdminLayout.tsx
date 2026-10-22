import { useEffect, useState, type ReactNode } from 'react';
import {
  LayoutDashboard, CalendarDays, CalendarCheck, Users, Stethoscope, Clock, Wallet, PieChart,
  SlidersHorizontal, LayoutTemplate, Settings, Bell, LogOut, Menu, X, ExternalLink, CheckCheck, ArrowLeft, UserPlus, ShieldCheck, Zap, Sparkles,
} from 'lucide-react';
import { Link, useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { Avatar, Badge, useFetch, useToast } from '../lib/ui';
import { api } from '../lib/api';
import { dateShort } from '../lib/format';

const NAV: { section?: string; to?: string; label?: string; icon?: any; exact?: boolean }[] = [
  { section: 'Clínica' },
  { to: '/admin', label: 'Panel general', icon: LayoutDashboard, exact: true },
  { to: '/admin/agenda', label: 'Agenda semanal', icon: CalendarDays },
  { to: '/admin/citas', label: 'Citas', icon: CalendarCheck },
  { to: '/admin/pacientes', label: 'Pacientes', icon: Users },
  { to: '/admin/pacientes-avanzado', label: 'Pacientes avanzados', icon: ShieldCheck },
  { to: '/admin/terapeutas', label: 'Terapeutas', icon: Stethoscope },
  { to: '/admin/solicitudes', label: 'Solicitudes', icon: UserPlus },
  { to: '/admin/horarios', label: 'Horarios y bloqueos', icon: Clock },
  { section: 'Finanzas' },
  { to: '/admin/pagos', label: 'Pagos y comprobantes', icon: Wallet },
  { to: '/admin/contabilidad', label: 'Contabilidad', icon: PieChart },
  { section: 'Gestión' },
  { to: '/admin/tarifas', label: 'Tarifas y encuesta', icon: SlidersHorizontal },
  { to: '/admin/contenido', label: 'Contenido del sitio', icon: LayoutTemplate },
  { to: '/admin/centro-control', label: 'Centro de control', icon: Zap },
  { to: '/admin/ia', label: 'Asistente IA', icon: Sparkles },
  { to: '/admin/configuracion', label: 'Configuración', icon: Settings },
];

const TITLES: Record<string, string> = {
  '/admin': 'Panel general',
  '/admin/agenda': 'Agenda semanal',
  '/admin/citas': 'Citas',
  '/admin/pacientes': 'Pacientes',
  '/admin/pacientes-avanzado': 'Pacientes avanzados',
  '/admin/terapeutas': 'Terapeutas',
  '/admin/solicitudes': 'Solicitudes de profesionales',
  '/admin/horarios': 'Horarios y bloqueos',
  '/admin/pagos': 'Pagos y comprobantes',
  '/admin/contabilidad': 'Contabilidad',
  '/admin/tarifas': 'Tarifas y encuesta',
  '/admin/contenido': 'Contenido del sitio',
  '/admin/centro-control': 'Centro de control',
  '/admin/ia': 'Asistente IA',
  '/admin/configuracion': 'Configuración',
};

export function AdminLayout({ children }: { children: ReactNode }) {
  const { path, navigate } = useRouter();
  const { user, logout } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [bell, setBell] = useState(false);
  const [menu, setMenu] = useState(false);
  const { data: notifs, reload } = useFetch<any[]>(() => api('/admin/notifications'), []);
  const { data: applications } = useFetch<any[]>(() => api('/admin/applications?status=pendiente'), []);
  const unread = (notifs || []).filter((n) => !n.read).length;
  const pendingApps = (applications || []).length;

  useEffect(() => setOpen(false), [path]);

  const title = TITLES[path.split('?')[0]] || 'Administración';

  const openBell = async () => {
    setBell(true);
    if (unread) {
      try { await api('/admin/notifications/read', { method: 'POST' }); reload(); } catch { /* noop */ }
    }
  };

  return (
    <div className="app-shell">
      {open && <div className="overlay" style={{ zIndex: 45 }} onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <button className="close-btn sidebar-close" onClick={() => setOpen(false)}><X /></button>
        <Link to="/admin" onClick={() => setOpen(false)}>
          <span className="brand">
            <svg className="brand-mark" viewBox="0 0 48 48" fill="none" aria-hidden style={{ filter: 'none' }}>
              <rect width="48" height="48" rx="15" fill="#0F3B33" />
              <path d="M24 12c4.2 3.2 6.3 6.9 6.3 11.2 0 5.6-2.8 9.4-6.3 12.8-3.5-3.4-6.3-7.2-6.3-12.8C17.7 18.9 19.8 15.2 24 12Z" fill="#F6F1E6" />
              <circle cx="24" cy="24" r="2.6" fill="#0F3B33" />
              <circle cx="35" cy="14" r="2.2" fill="#C0603C" />
            </svg>
            <span>Psyconova<small>Panel administrativo</small></span>
          </span>
        </Link>
        <nav className="side-nav">
          {NAV.map((item, i) =>
            item.section ? (
              <div className="side-section" key={'s' + i}>{item.section}</div>
            ) : (
              <Link
                key={item.to}
                to={item.to!}
                className={(item.exact ? path === item.to : path.startsWith(item.to!)) ? 'active' : ''}
              >
                <item.icon />
                {item.label}
                {item.to === '/admin/pagos' && unread > 0 && <span className="pill">{unread}</span>}
                {item.to === '/admin/solicitudes' && pendingApps > 0 && <span className="pill">{pendingApps}</span>}
              </Link>
            )
          )}
        </nav>
        <div className="sidebar-foot">
          <div className="side-user">
            <Avatar name={user?.name} size="sm" />
            <div style={{ minWidth: 0 }}>
              <strong>{user?.name}</strong>
              <span>Administración</span>
            </div>
            <button onClick={logout} title="Cerrar sesión"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-btn menu-btn" onClick={() => setOpen(true)}><Menu /></button>
            <div className="crumb"><span>Administración</span><span>/</span><strong>{title}</strong></div>
          </div>
          <div className="topbar-right">
            <a className="btn btn-sm btn-ghost" href="/" target="_blank" rel="noreferrer" style={{ display: 'inline-flex' }}>
              Ver sitio <ExternalLink style={{ width: 13, height: 13 }} />
            </a>
            <button className="icon-btn" onClick={openBell} title="Notificaciones">
              <Bell />
              {unread > 0 && <span className="ping" />}
            </button>
            <div style={{ position: 'relative' }}>
              <button className="icon-btn" onClick={() => setMenu((v) => !v)} title="Cuenta" style={{ padding: 2 }}>
                <Avatar name={user?.name} size="sm" />
              </button>
              {menu && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setMenu(false)} />
                  <div className="card" style={{ position: 'absolute', right: 0, top: 44, width: 220, padding: 8, zIndex: 50, boxShadow: 'var(--shadow)' }}>
                    <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid var(--line)', marginBottom: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{user?.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{user?.email}</div>
                    </div>
                    <button className="btn btn-sm btn-ghost btn-block" style={{ justifyContent: 'flex-start' }} onClick={() => { setMenu(false); navigate('/admin/configuracion'); }}>
                      <Settings /> Configuración
                    </button>
                    <button className="btn btn-sm btn-ghost btn-block" style={{ justifyContent: 'flex-start', marginTop: 4 }} onClick={logout}>
                      <LogOut /> Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        {children}
      </div>

      {bell && (
        <>
          <div className="overlay" onClick={() => setBell(false)} />
          <aside className="drawer">
            <div className="drawer-head">
              <div>
                <h3>Notificaciones</h3>
                <p>{unread ? `${unread} sin leer` : 'Todo al día'}</p>
              </div>
              <button className="close-btn" onClick={() => setBell(false)}><X /></button>
            </div>
            <div className="drawer-body">
              {(notifs || []).length === 0 && <p className="muted small">No hay notificaciones todavía.</p>}
              <div className="stack-sm">
                {(notifs || []).map((n) => (
                  <div key={n.id} className="card" style={{ padding: 14, opacity: n.read ? 0.7 : 1 }}>
                    <div className="row-between" style={{ alignItems: 'flex-start' }}>
                      <strong style={{ fontSize: 13 }}>{n.title}</strong>
                      <span className="tiny muted">{dateShort(n.created_at)}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 0' }}>{n.body}</p>
                    {n.link && <button className="btn btn-sm btn-ghost" style={{ marginTop: 8, textAlign: 'left' }} onClick={async () => { setBell(false); try { await api('/admin/notifications/read', { method: 'POST', body: { id: n.id } }); } catch {}; navigate(n.link); }}>{n.read ? 'Ver' : 'Abrir'}</button>}
                  </div>
                ))}
              </div>
            </div>
            <div className="drawer-foot">
              <button className="btn btn-sm btn-ghost" onClick={() => { setBell(false); navigate('/admin/pagos'); }}>
                <Wallet /> Ir a pagos
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

export function AdminPage({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 style={{ color: '#171c24', letterSpacing: '-0.02em' }}>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function BackLink({ to, label }: { to: string; label: string }) {
  return <Link to={to} className="btn btn-sm btn-ghost"><ArrowLeft /> {label}</Link>;
}
