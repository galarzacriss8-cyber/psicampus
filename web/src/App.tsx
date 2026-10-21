import { useEffect } from 'react';
import { useAuth, homeFor } from './lib/auth';
import { useRouter } from './lib/router';
import { Loader } from './lib/ui';
import { PublicLayout } from './components/PublicLayout';
import { AdminLayout } from './components/AdminLayout';
import { Home } from './pages/Home';
import { Therapists } from './pages/Therapists';
import { SurveyPage } from './pages/Survey';
import { Book } from './pages/Book';
import { Track } from './pages/Track';
import { AuthPage } from './pages/Auth';
import { Portal } from './pages/Portal';
import { TherapistPanel } from './pages/therapist/TherapistPanel';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminAgenda } from './pages/admin/Agenda';
import { AdminAppointments } from './pages/admin/Appointments';
import { AdminPatients } from './pages/admin/Patients';
import { AdminTherapists } from './pages/admin/TherapistsAdmin';
import { AdminSchedule } from './pages/admin/Schedule';
import { AdminPayments } from './pages/admin/Payments';
import { AdminAccounting } from './pages/admin/Accounting';
import { AdminPricing } from './pages/admin/Pricing';
import { AdminContent } from './pages/admin/Content';
import { AdminSettings } from './pages/admin/SettingsPage';
import AdminPatientsAdvanced from './pages/admin/AdminPatientsAdvanced';
import { AdminControlCenter } from './pages/admin/AdminControlCenter';
import AdminAI from './pages/admin/AdminAI';
import { AdminApplications } from './pages/admin/Applications';
import { WorkWithUs } from './pages/WorkWithUs';

function Redirect({ to }: { to: string }) {
  const { navigate } = useRouter();
  useEffect(() => { navigate(to, { replace: true }); }, []);
  return <Loader />;
}

function Guard({ roles, children }: { roles?: string[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { path } = useRouter();
  if (loading) return <Loader />;
  if (!user) return <Redirect to={`/login?next=${encodeURIComponent(path)}`} />;
  if (roles && !roles.includes(user.role)) return <Redirect to={homeFor(user.role)} />;
  return <>{children}</>;
}

function NotFound() {
  return (
    <div className="container" style={{ padding: '90px 0', textAlign: 'center' }}>
      <span className="eyebrow" style={{ justifyContent: 'center' }}>Error 404</span>
      <h1 className="display" style={{ fontSize: 52, marginTop: 14 }}>Esta página no existe</h1>
      <p className="muted">Puede que el enlace haya cambiado. Vuelve al inicio o agenda una cita.</p>
      <div className="hstack" style={{ justifyContent: 'center', marginTop: 20 }}>
        <a className="btn" href="#/">Volver al inicio</a>
        <a className="btn btn-ghost" href="#/agendar">Agendar cita</a>
      </div>
    </div>
  );
}

function AdminRoutes({ path }: { path: string }) {
  switch (path) {
    case '/admin': return <AdminDashboard />;
    case '/admin/agenda': return <AdminAgenda />;
    case '/admin/citas': return <AdminAppointments />;
    case '/admin/pacientes': return <AdminPatients />;
    case '/admin/terapeutas': return <AdminTherapists />;
    case '/admin/solicitudes': return <AdminApplications />;
    case '/admin/horarios': return <AdminSchedule />;
    case '/admin/pagos': return <AdminPayments />;
    case '/admin/contabilidad': return <AdminAccounting />;
    case '/admin/tarifas': return <AdminPricing />;
    case '/admin/contenido': return <AdminContent />;
    case '/admin/configuracion': return <AdminSettings />;
    case '/admin/pacientes-avanzado': return <AdminPatientsAdvanced />;
    case '/admin/centro-control': return <AdminControlCenter />;
    case '/admin/ia': return <AdminAI />;
    default: return <AdminDashboard />;
  }
}

export function AppRoutes() {
  const { path } = useRouter();
  const p = path.split('?')[0];

  if (p === '/login') return <AuthPage mode="login" />;
  if (p === '/registro') return <AuthPage mode="register" />;

  if (p.startsWith('/admin')) {
    return (
      <Guard roles={['admin']}>
        <AdminLayout><AdminRoutes path={p} /></AdminLayout>
      </Guard>
    );
  }

  if (p.startsWith('/portal')) {
    return <Guard roles={['paciente']}><Portal /></Guard>;
  }

  if (p === '/terapeuta') {
    return <Guard roles={['terapeuta']}><TherapistPanel /></Guard>;
  }

  const publicPage = () => {
    if (p === '/') return <Home />;
    if (p === '/terapeutas') return <Therapists />;
    if (p === '/encuesta') return <SurveyPage />;
    if (p === '/agendar') return <Book />;
    if (p === '/seguimiento') return <Track />;
    if (p === '/trabaja-con-nosotros') return <WorkWithUs />;
    return <NotFound />;
  };

  return <PublicLayout>{publicPage()}</PublicLayout>;
}
