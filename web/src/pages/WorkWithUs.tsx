import { useState } from 'react';
import { ArrowRight, CheckCircle2, GraduationCap, HeartHandshake, ShieldCheck, Sparkles, Upload, UserPlus } from 'lucide-react';
import { api, fileToDataUrl } from '../lib/api';
import { Field, useToast } from '../lib/ui';
import { useSite } from '../lib/site';
import { Link } from '../lib/router';

export function WorkWithUs() {
  const toast = useToast();
  const { data } = useSite();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [form, setForm] = useState<any>({
    name: '', email: '', phone: '', gender: 'femenino', birthdate: '', university: '', degree: '',
    license: '', years: 5, modality: 'ambas', approaches: '', description: '', consent: false,
  });

  const set = (k: string, v: any) => setForm({ ...form, [k]: v });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.consent) return toast.error('Debes aceptar la polÃ­tica de tratamiento de datos');
    setBusy(true);
    try {
      await api('/public/applications', { method: 'POST', body: { ...form, photo } });
      setSent(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      toast.error(err.message);
    } finally { setBusy(false); }
  };

  if (sent) {
    return (
      <section style={{ padding: '70px 0 100px' }}>
        <div className="container" style={{ maxWidth: 640 }}>
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <div className="icon-chip lg forest" style={{ margin: '0 auto 16px' }}><CheckCircle2 /></div>
            <h1 className="display" style={{ fontSize: 38 }}>Recibimos tu solicitud</h1>
            <p className="muted" style={{ maxWidth: 460, margin: '10px auto 22px' }}>
              El equipo de Psyconova revisarÃ¡ tu perfil y se pondrÃ¡ en contacto contigo por correo o WhatsApp. Si tu perfil encaja con lo que buscamos, te crearemos el acceso y la agenda.
            </p>
            <Link className="btn" to="/">Volver al inicio <ArrowRight /></Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section style={{ padding: '44px 0 20px' }}>
        <div className="container split" style={{ alignItems: 'start', paddingTop: 14 }}>
          <div>
            <span className="eyebrow">Trabaja con nosotros</span>
            <h1 className="display" style={{ fontSize: 'clamp(38px, 5vw, 60px)', marginTop: 12 }}>
              SÃºmate al equipo que <em style={{ color: 'var(--clay)' }}>cuida el campus</em>
            </h1>
            <p className="lead" style={{ maxWidth: 500 }}>
              Buscamos psicÃ³logos y psicÃ³logas con tÃ­tulo profesional, vocaciÃ³n de servicio y ganas de acompaÃ±ar a estudiantes y docentes. Nosotros ponemos la plataforma, la agenda y la tarifa social; tÃº pones la escucha.
            </p>
            <div className="point-list">
              <div className="point"><ShieldCheck /> SupervisiÃ³n clÃ­nica y respaldo del programa</div>
              <div className="point"><HeartHandshake /> Pacientes que llegan por convenio universitario</div>
              <div className="point"><Sparkles /> Agenda y pagos gestionados por la plataforma</div>
              <div className="point"><GraduationCap /> FormaciÃ³n continua y comunidad profesional</div>
            </div>
            <div className="notice" style={{ marginTop: 20, maxWidth: 480 }}>
              <ShieldCheck />
              <span>No aceptamos a todos los postulantes: revisamos tÃ­tulo, registro profesional y enfoque. Tu perfil se publica solo si es aprobado.</span>
            </div>
          </div>

          <div className="card" style={{ padding: 26 }}>
            <div className="hstack" style={{ marginBottom: 6 }}>
              <span className="icon-chip"><UserPlus /></span>
              <div><strong style={{ fontSize: 14 }}>Postula para unirte</strong><div className="tiny muted">Toma 5 minutos</div></div>
            </div>
            <form onSubmit={submit} className="stack" style={{ marginTop: 16 }}>
              <div className="form-grid">
                <Field label="Nombre completo" className="span-2"><input className="input" required value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
                <Field label="Correo electrÃ³nico"><input className="input" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
                <Field label="TelÃ©fono / WhatsApp"><input className="input" required value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
                <Field label="GÃ©nero">
                  <select className="select" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                    <option value="femenino">Femenino</option><option value="masculino">Masculino</option>
                  </select>
                </Field>
                <Field label="Fecha de nacimiento"><input className="input" type="date" value={form.birthdate} onChange={(e) => set('birthdate', e.target.value)} /></Field>
                <Field label="Universidad de graduaciÃ³n" className="span-2"><input className="input" required value={form.university} onChange={(e) => set('university', e.target.value)} /></Field>
                <Field label="TÃ­tulo / formaciÃ³n" className="span-2"><input className="input" required value={form.degree} onChange={(e) => set('degree', e.target.value)} placeholder="Mgs. en PsicologÃ­a ClÃ­nica" /></Field>
                <Field label="Registro profesional"><input className="input" value={form.license} onChange={(e) => set('license', e.target.value)} placeholder="MSP-00000" /></Field>
                <Field label="AÃ±os de experiencia"><input className="input" type="number" min="0" value={form.years} onChange={(e) => set('years', e.target.value)} /></Field>
                <Field label="Enfoques (separados por coma)" className="span-2"><input className="input" required value={form.approaches} onChange={(e) => set('approaches', e.target.value)} placeholder="Terapia cognitivo-conductual, ACT, EMDR" /></Field>
                <Field label="Modalidad">
                  <select className="select" value={form.modality} onChange={(e) => set('modality', e.target.value)}>
                    <option value="ambas">Presencial y virtual</option>
                    <option value="presencial">Solo presencial</option>
                    <option value="virtual">Solo virtual</option>
                  </select>
                </Field>
                <Field label="Foto de perfil (opcional)">
                  <label className="btn btn-sm btn-ghost" style={{ display: 'inline-flex' }}>
                    <Upload /> Subir foto
                    <input type="file" accept="image/*" hidden onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      try { setPhoto(await fileToDataUrl(f)); toast.success('Foto lista'); } catch (err: any) { toast.error(err.message); }
                    }} />
                  </label>
                </Field>
                <Field label="CuÃ©ntanos de tu trabajo" className="span-2">
                  <textarea className="textarea" required value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Experiencia, poblaciones con las que trabajas y por quÃ© quieres sumarte a Psyconova." />
                </Field>
              </div>
              <label className="check">
                <input type="checkbox" checked={form.consent} onChange={(e) => set('consent', e.target.checked)} />
                <span>Acepto la polÃ­tica de tratamiento de datos y autorizo la revisiÃ³n de mi perfil profesional.</span>
              </label>
              <button className="btn btn-block" disabled={busy}>{busy ? 'Enviandoâ€¦' : 'Enviar mi solicitud'} <ArrowRight /></button>
              <p className="tiny muted" style={{ margin: 0 }}>La administraciÃ³n revisa cada solicitud y decide a quiÃ©n aceptar. No hay costo por postular.</p>
            </form>
          </div>
        </div>
      </section>

      <section className="block tight" style={{ paddingTop: 20 }}>
        <div className="container">
          <div className="card card-forest" style={{ padding: 30, display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <h3 className="display" style={{ color: '#fff', fontSize: 26, marginBottom: 4 }}>Â¿Buscas atenciÃ³n como paciente?</h3>
              <p className="small" style={{ margin: 0, opacity: 0.7 }}>Agenda tu primera sesiÃ³n con el profesional que elijas.</p>
            </div>
            <Link className="btn btn-cream" to="/agendar">Agendar cita <ArrowRight /></Link>
          </div>
        </div>
      </section>
    </>
  );
}

