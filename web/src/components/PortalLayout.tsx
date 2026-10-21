import { type ReactNode } from 'react';
import { Home, CalendarDays, Wallet, ClipboardList, User, LogOut, ArrowUpRight } from 'lucide-react';
import { Link, useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { Avatar } from '../lib/ui';

const TABS = [
  { to: '/portal', label: 'Inicio', icon: Home, exact: true },
  { to: '/portal/citas', label: 'Mis citas', icon: CalendarDays },
  { to: '/portal/pagos', label: 'Pagos', icon: Wallet },
  { to: '/portal/encuesta', label: 'Mi tarifa', icon: ClipboardList },
  { to: '/portal/perfil', label: 'Perfil', icon: User },
];

export function PortalLayout({ children, name, subtitle }: { children: ReactNode; name: string; subtitle?: string }) {
  const { path } = useRouter();
  const { logout } = useAuth();
  const active = (to: string, exact?: boolean) => (exact ? path === to : path.startsWith(to) && to !== '/portal');

  return (
    <div className="portal-shell">
      <header className="portal-head">
        <div className="container-wide">
          <div className="row-between">
            <Link to="/portal" style={{ display: 'inline-flex' }}>
              <span className="brand" style={{ color: 'var(--paper)' }}>
                <svg className="brand-mark" viewBox="0 0 48 48" fill="none" aria-hidden>
                  <rect width="48" height="48" rx="15" fill="#F6F1E6" />
                  <path d="M24 12c4.2 3.2 6.3 6.9 6.3 11.2 0 5.6-2.8 9.4-6.3 12.8-3.5-3.4-6.3-7.2-6.3-12.8C17.7 18.9 19.8 15.2 24 12Z" fill="#0F3B33" />
                  <circle cx="24" cy="24" r="2.6" fill="#F6F1E6" />
                  <circle cx="35" cy="14" r="2.2" fill="#C0603C" />
                </svg>
                <span>Psyconova<small style={{ color: 'rgba(255,255,255,.45)' }}>Portal del paciente</small></span>
              </span>
            </Link>
            <div className="hstack" style={{ color: 'var(--paper)' }}>
              <Link to="/agendar" className="btn btn-sm btn-cream">Agendar cita <ArrowUpRight /></Link>
              <div className="hstack" style={{ gap: 8 }}>
                <Avatar name={name} size="sm" />
                <button className="icon-btn" title="Cerrar sesiÃ³n" onClick={logout} style={{ background: 'rgba(255,255,255,.08)', borderColor: 'transparent', color: '#fff' }}>
                  <LogOut />
                </button>
              </div>
            </div>
          </div>
          <div className="portal-nav">
            {TABS.map((t) => (
              <Link key={t.to} to={t.to} className={active(t.to, t.exact) ? 'active' : ''}>{t.label}</Link>
            ))}
          </div>
        </div>
      </header>
      <div className="portal-wrap">{children}</div>

      <nav className="mobile-tabbar">
        {TABS.map((t) => (
          <Link key={t.to} to={t.to} className={active(t.to, t.exact) ? 'active' : ''}>
            <t.icon />
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

