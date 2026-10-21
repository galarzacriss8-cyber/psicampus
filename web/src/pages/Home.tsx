import { useState } from 'react';
import {
  ArrowRight, ArrowUpRight, CalendarDays, Check, ClipboardList, HeartHandshake, ShieldCheck,
  Sparkles, Star, Upload, GraduationCap, Clock, Video, Wallet, Quote, Users,
} from 'lucide-react';
import { Link, useRouter } from '../lib/router';
import { useSite } from '../lib/site';
import { Loader, ErrorState, Avatar, Badge } from '../lib/ui';
import { TherapistCard, TherapistModal } from '../components/TherapistCard';
import { Reveal } from '../components/Reveal';
import { money } from '../lib/format';

export function Home() {
  const { data, loading, error, reload } = useSite();
  const { navigate } = useRouter();
  const [selected, setSelected] = useState<any>(null);

  if (loading) return <Loader label="Preparando el campus…" />;
  if (error || !data) return <ErrorState message={error || 'No se pudo cargar el sitio'} onRetry={reload} />;

  const { settings, tiers, therapists, stats } = data;
  const c = settings.content;
  const featured = therapists.filter((t: any) => t.featured);
  const team = [...featured, ...therapists.filter((t: any) => !t.featured)].slice(0, 3);
  const stepIcons = [ClipboardList, CalendarDays, Upload, HeartHandshake];

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">{c.heroBadge}</span>
            <h1 className="display">
              {c.heroTitle} <em>{c.heroHighlight}</em>
            </h1>
            <p className="lead">{c.heroSubtitle}</p>
            <div className="hero-actions">
              <Link className="btn btn-lg" to="/agendar">{c.primaryCta} <ArrowUpRight /></Link>
              <a className="btn btn-lg btn-ghost" href="#equipo" onClick={(e) => { e.preventDefault(); document.getElementById('equipo')?.scrollIntoView({ behavior: 'smooth' }); }}>
                {c.secondaryCta}
              </a>
            </div>
            <div className="hero-trust">
              <div className="hero-avatars">
                {therapists.slice(0, 4).map((t: any) => <Avatar key={t.id} src={t.photo} name={t.name} size="sm" />)}
              </div>
              <div>
                <div className="rating"><span className="stars">★★★★★</span> {stats.rating} · {stats.sessions} sesiones acompañadas</div>
                <div className="tiny muted">Equipo acreditado · Confidencialidad garantizada</div>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-arch">
              <img src={c.heroImage || '/img/team/camila.jpg'} alt="Terapeuta de Psyconova" />
              <div className="hero-arch-caption">
                <strong>Camila Herrera</strong>
                <span>Psicóloga clínica · Universidad Central del Ecuador</span>
              </div>
            </div>
            <div className="hero-float price">
              <span className="icon-chip clay"><Wallet /></span>
              <div><strong>Desde $7 por sesión</strong><span>Tarifa social según tus ingresos</span></div>
            </div>
            <div className="hero-float slot">
              <span className="icon-chip"><Clock /></span>
              <div><strong>Cupos todas las semanas</strong><span>Presencial en campus o virtual</span></div>
            </div>
            <div className="hero-float verified">
              <span className="icon-chip forest"><ShieldCheck /></span>
              <div><strong>Pago por transferencia</strong><span>Sube tu comprobante en línea</span></div>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="stats-band">
          {c.stats.map((s: any) => (
            <div className="stat-item" key={s.label}>
              <div className="v">{s.value}</div>
              <div className="l">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="container" style={{ marginTop: 6 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', padding: '10px 0', background: 'rgba(15,59,51,.06)', borderRadius: 10 }}>
          <span className="badge no-dot" style={{ background: '#1a7e5c', color: '#fff' }}><ShieldCheck style={{ width: 12, height: 12 }} /> Plataforma en línea</span>
          <span className="badge no-dot"><Users style={{ width: 12, height: 12 }} /> {therapists.length} terapeutas acreditados</span>
          <span className="badge no-dot"><Clock style={{ width: 12, height: 12 }} /> {stats.sessions || '0'} sesiones acompañadas</span>
          <span className="badge no-dot" style={{ color: '#c0603c' }}><Sparkles style={{ width: 12, height: 12 }} /> Pronto: cupos disponibles para esta semana</span>
        </div>
      </div>

      <section className="block" id="programa">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Cómo funciona</span>
            <h2 className="display">Agendar es tan simple como pedir ayuda</h2>
            <p>Cuatro pasos, sin llamadas ni filas. Todo desde tu celular y con acompañamiento del equipo cuando lo necesites.</p>
          </div>
          <div className="steps-grid">
            {c.steps.map((s: any, i: number) => {
              const Icon = stepIcons[i] || ClipboardList;
              return (
                <Reveal key={s.title} delay={i * 70}>
                  <div className="step">
                    <span className="num">Paso {String(i + 1).padStart(2, '0')}</span>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                    <span className="icon-chip"><Icon /></span>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="block" id="equipo" style={{ paddingTop: 30 }}>
        <div className="container">
          <div className="section-head-row">
            <div className="section-head" style={{ marginBottom: 0 }}>
              <span className="eyebrow">Nuestro equipo</span>
              <h2 className="display">Terapeutas que hablan tu idioma</h2>
              <p>Elige por enfoque, género o modalidad. Todos nuestros profesionales están titulados, acreditados y en supervisión clínica continua.</p>
            </div>
            <Link className="btn btn-ghost" to="/terapeutas">Ver los {therapists.length} terapeutas <ArrowRight /></Link>
          </div>
          <div className="therapist-marquee">
            <div className="therapist-marquee-track">
              {[...team, ...team].map((t: any, i: number) => (
                <Reveal key={`${t.id}-${i}`} className="tm-item" delay={0}><TherapistCard t={t} onOpen={() => setSelected(t)} /></Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="block" id="tarifas">
        <div className="container">
          <div className="scale-card">
            <div className="row-between" style={{ alignItems: 'flex-end', gap: 30, flexWrap: 'wrap' }}>
              <div style={{ maxWidth: 560 }}>
                <span className="eyebrow" style={{ color: 'var(--sage)' }}>Tarifa social</span>
                <h2 className="display">Una escala de {money(5)} a {money(40)} que se adapta a ti</h2>
                <p className="lead" style={{ marginTop: 14 }}>
                  No creemos en un precio único. Respondes una encuesta económica de 9 preguntas y te proponemos un aporte justo según tus ingresos, dependientes y situación actual.
                </p>
              </div>
              <Link className="btn btn-cream btn-lg" to="/encuesta">Calcular mi aporte <ArrowRight /></Link>
            </div>
            <div className="scale-ladder">
              {tiers.map((t: any) => (
                <div className="ladder-step" key={t.code}>
                  <div className="amount">{money(t.price)}</div>
                  <div className="code">Nivel {t.code}</div>
                </div>
              ))}
            </div>
            <div className="scale-foot">
              <p className="note">
                El aporte se destina a sostener el programa: honorarios de terapeutas, supervisión clínica y cupos solidarios.
                Ninguna persona se queda sin atención por no poder pagar. {c.marketingNote}
              </p>
              <div className="hstack">
                <Badge tone="sage" dot={false}><ShieldCheck style={{ width: 12, height: 12 }} /> Sin costo de inscripción</Badge>
                <Badge tone="sage" dot={false}><Check style={{ width: 12, height: 12 }} /> Cambia cuando lo necesites</Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="block tight">
        <div className="container split">
          <Reveal>
            <div className="split-media">
              <div className="img-main"><img src="/img/team/mateo.jpg" alt="Terapeuta en consulta" /></div>
              <div className="img-small"><img src="/img/team/camila.jpg" alt="Psicóloga" /></div>
              <div className="badge-float"><ShieldCheck style={{ width: 18, height: 18, color: 'var(--forest-2)' }} /> Supervisión clínica permanente</div>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div>
              <span className="eyebrow">El programa</span>
              <h2 className="display" style={{ fontSize: 'clamp(30px,3.6vw,44px)', marginTop: 12 }}>{c.aboutTitle}</h2>
              <p className="lead" style={{ fontSize: 15.5 }}>{c.aboutText}</p>
              <div className="point-list">
                {c.aboutPoints.map((p: string) => (
                  <div className="point" key={p}><Check /> {p}</div>
                ))}
              </div>
              <div className="hstack" style={{ marginTop: 26 }}>
                <Link className="btn" to="/terapeutas">Conocer al equipo <ArrowRight /></Link>
                <Link className="btn btn-ghost" to="/seguimiento">Estado de mi reserva</Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="block tight">
        <div className="container">
          <div className="section-head center">
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Voces del campus</span>
            <h2 className="display">Historias que empiezan con una cita</h2>
          </div>
          <div className="quote-grid">
            {c.testimonials.map((t: any, i: number) => (
              <Reveal key={t.name} delay={i * 80}>
                <div className="quote-card">
                  <span className="mark">“</span>
                  <p>{t.text}</p>
                  <div className="who">
                    <Avatar name={t.name} size="sm" />
                    <div><strong>{t.name}</strong><span>{t.role}</span></div>
                    <span className="stars" style={{ marginLeft: 'auto', color: 'var(--gold)', fontSize: 11 }}>★★★★★</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="block" id="faq">
        <div className="container">
          <div className="section-head center">
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Preguntas frecuentes</span>
            <h2 className="display">Lo que suelen preguntarnos</h2>
          </div>
          <div className="faq-list">
            {c.faqs.map((f: any) => (
              <details className="faq-item" key={f.q}>
                <summary>{f.q}<span className="plus" /></summary>
                <div className="answer">{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="block tight" style={{ paddingBottom: 20 }}>
        <div className="container">
          <div className="cta-band">
            <span className="eyebrow" style={{ color: 'rgba(255,255,255,.75)' }}>Empieza hoy</span>
            <h2 className="display">Dar el primer paso también es cuidarte</h2>
            <p>Reserva tu primera sesión en menos de 3 minutos. Elige terapeuta, horario y modalidad. Nosotros nos encargamos del resto.</p>
            <div className="hstack" style={{ marginTop: 22 }}>
              <Link className="btn btn-cream btn-lg" to="/agendar">Agendar mi sesión <ArrowUpRight /></Link>
              <Link className="btn btn-lg" to="/encuesta" style={{ background: 'transparent', borderColor: 'rgba(255,255,255,.35)' }}>Primero ver mi tarifa</Link>
            </div>
          </div>
        </div>
      </section>

      <TherapistModal
        t={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onBook={(id) => navigate(`/agendar?therapist=${id}`)}
      />
    </>
  );
}
