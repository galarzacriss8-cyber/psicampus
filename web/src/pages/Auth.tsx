import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, useRouter } from '../lib/router';
import { useAuth, homeFor } from '../lib/auth';
import { Field, useToast } from '../lib/ui';

function GoogleSignIn({ mode }: { mode: string }) {
  const { loginWithGoogle } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const cfg = await api('/auth/google/config');
        if (cancelled || !cfg?.clientId) return;
        const start = () => {
          if (!window.google?.accounts) return setTimeout(start, 300);
          window.google.accounts.id.initialize({
            client_id: cfg.clientId,
            callback: async (response: any) => {
              try {
                const u = await loginWithGoogle(response.credential);
                toast.success(`Bienvenido, ${u.name.split(' ')[0]}`);
                navigate(homeFor(u.role));
              } catch (err: any) {
                toast.error(err.message || 'No pudimos iniciar sesiÃ³n con Google');
              }
            },
          });
          setEnabled(true);
        };
        start();
      } catch { /* sin configuraciÃ³n de Google */ }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  if (!enabled) return null;

  return (
    <div style={{ marginTop: 14, textAlign: 'center' }}>
      <button type="button" className="btn btn-block" style={{ background: '#4285F4', color: '#fff', border: 'none', fontWeight: 600 }}
        onClick={() => window.google?.accounts?.id.prompt()}>
        Continuar con Google
      </button>
      <p className="tiny muted" style={{ marginTop: 6 }}>Inicia con tu cuenta de Gmail. Si eres terapeuta aprobado, se asigna el rol automÃ¡ticamente.</p>
    </div>
  );
}

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { user, login, register, loading } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', university: '' });

  useEffect(() => {
    if (!loading && user) navigate(homeFor(user.role), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = mode === 'login' ? await login(form.email, form.password) : await register(form);
      toast.success(`Bienvenido, ${u.name.split(' ')[0]}`);
      navigate(homeFor(u.role));
    } catch (err: any) {
      toast.error(err.message || 'No pudimos iniciar sesiÃ³n');
    } finally {
      setBusy(false);
    }
  };

  const demo = (email: string, password: string) => setForm({ ...form, email, password });

  return (
    <div className="auth-shell">
      <div className="auth-visual">
        <img src="/img/team/camila.jpg" alt="SesiÃ³n de terapia" />
        <div className="overlay" />
        <div className="q">
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,.65)' }}>Psyconova</span>
          <h3>Un espacio seguro para lo que sientes.</h3>
          <p>Accede a tus citas, comprobantes y tu proceso terapÃ©utico desde cualquier lugar.</p>
          <div className="hstack" style={{ marginTop: 18 }}>
            <span className="badge no-dot" style={{ background: 'rgba(255,255,255,.12)', color: '#fff' }}><ShieldCheck style={{ width: 12, height: 12 }} /> Datos protegidos</span>
            <span className="badge no-dot" style={{ background: 'rgba(255,255,255,.12)', color: '#fff' }}><Sparkles style={{ width: 12, height: 12 }} /> Confidencial</span>
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-form">
          <Link to="/" className="btn btn-sm btn-ghost"><ArrowLeft /> Volver al sitio</Link>
          <h1 className="display">{mode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}</h1>
          <p className="muted small">
            {mode === 'login' ? 'Ingresa a tu portal de paciente, panel de terapeuta o administraciÃ³n.' : 'RegÃ­strate para agendar, ver tus citas y subir comprobantes.'}
          </p>

          <form onSubmit={submit} className="stack" style={{ marginTop: 22 }}>
            {mode === 'register' && (
              <Field label="Nombre completo"><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tu nombre" /></Field>
            )}
            <Field label="Usuario o correo electrÃ³nico"><input className="input" name="identifier" type="text" required autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="tu@universidad.edu.ec" /></Field>
            <Field label="ContraseÃ±a">
              <div style={{ position: 'relative' }}>
                <input className="input" type={show ? 'text' : 'password'} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" style={{ paddingRight: 42 }} />
                <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', border: 0, background: 'none', color: 'var(--muted)' }}>
                  {show ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                </button>
              </div>
            </Field>
            {mode === 'register' && (
              <>
                <Field label="TelÃ©fono / WhatsApp"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+593 99 000 0000" /></Field>
                <Field label="Universidad o instituciÃ³n (opcional)"><input className="input" value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} placeholder="Universidad Central del Ecuador" /></Field>
              </>
            )}
            <button className="btn btn-block" disabled={busy}>{busy ? 'Un momentoâ€¦' : mode === 'login' ? 'Ingresar' : 'Crear mi cuenta'} <ArrowRight /></button>
          </form>

          <p className="small muted" style={{ marginTop: 16, textAlign: 'center' }}>
            {mode === 'login' ? (
              <>Â¿No tienes cuenta? <Link to="/registro" style={{ color: 'var(--forest-2)', fontWeight: 700 }}>RegÃ­strate</Link></>
            ) : (
              <>Â¿Ya tienes cuenta? <Link to="/login" style={{ color: 'var(--forest-2)', fontWeight: 700 }}>Inicia sesiÃ³n</Link></>
            )}
          </p>

          <GoogleSignIn mode={mode} />
        </div>
      </div>
    </div>
  );
}

