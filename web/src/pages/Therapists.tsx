import { useMemo, useState } from 'react';
import { ArrowRight, GraduationCap, Search, Users, ShieldCheck } from 'lucide-react';
import { Link, useRouter } from '../lib/router';
import { useSite } from '../lib/site';
import { Loader, ErrorState, Badge, Empty } from '../lib/ui';
import { TherapistCard, TherapistModal } from '../components/TherapistCard';
import { Reveal } from '../components/Reveal';

export function Therapists() {
  const { data, loading, error, reload } = useSite();
  const { navigate } = useRouter();
  const [gender, setGender] = useState('todos');
  const [modality, setModality] = useState('todas');
  const [approach, setApproach] = useState('');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const approaches = useMemo(() => {
    const set = new Set<string>();
    (data?.therapists || []).forEach((t: any) => t.approaches.forEach((a: string) => set.add(a)));
    return Array.from(set).sort();
  }, [data]);

  if (loading) return <Loader />;
  if (error || !data) return <ErrorState message={error || ''} onRetry={reload} />;

  const list = data.therapists.filter((t: any) => {
    if (gender !== 'todos' && t.gender !== gender) return false;
    if (modality !== 'todas' && t.modality !== modality && t.modality !== 'ambas') return false;
    if (approach && !t.approaches.includes(approach)) return false;
    if (q) {
      const s = q.toLowerCase();
      if (!`${t.name} ${t.university} ${t.description} ${t.approaches.join(' ')}`.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  return (
    <>
      <section style={{ padding: '46px 0 30px' }}>
        <div className="container">
          <div className="row-between" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: 24 }}>
            <div style={{ maxWidth: 640 }}>
              <span className="eyebrow">Equipo clínico</span>
              <h1 className="display" style={{ fontSize: 'clamp(38px,5vw,62px)', marginTop: 12 }}>
                Encuentra a la terapeuta <em style={{ color: 'var(--clay)' }}>o terapeuta</em> que necesitas
              </h1>
              <p className="lead" style={{ maxWidth: 540 }}>
                Puedes elegir por género, enfoque terapéutico o modalidad. Si no sabes con quién empezar, escríbenos y te orientamos sin costo.
              </p>
            </div>
            <div className="card" style={{ maxWidth: 300, padding: 18 }}>
              <div className="hstack"><ShieldCheck style={{ width: 18, height: 18, color: 'var(--forest-2)' }} /><strong style={{ fontSize: 12.5 }}>Todos verificados</strong></div>
              <p className="small muted" style={{ margin: '8px 0 0' }}>Título profesional, registro MSP y supervisión clínica continua. Puedes cambiar de terapeuta cuando quieras.</p>
            </div>
          </div>

          <div className="filters-bar" style={{ marginTop: 34 }}>
            <div className="group">
              <span>Género</span>
              <div className="segmented">
                {[
                  ['todos', 'Todos'],
                  ['femenino', 'Mujeres'],
                  ['masculino', 'Hombres'],
                ].map(([v, l]) => (
                  <button key={v} className={gender === v ? 'on' : ''} onClick={() => setGender(v)}>{l}</button>
                ))}
              </div>
            </div>
            <div className="group">
              <span>Modalidad</span>
              <select className="select input-sm" value={modality} onChange={(e) => setModality(e.target.value)} style={{ width: 150 }}>
                <option value="todas">Todas</option>
                <option value="presencial">Presencial</option>
                <option value="virtual">Virtual</option>
              </select>
            </div>
            <div className="group">
              <span>Enfoque</span>
              <select className="select input-sm" value={approach} onChange={(e) => setApproach(e.target.value)} style={{ width: 210 }}>
                <option value="">Todos los enfoques</option>
                {approaches.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="search" style={{ marginLeft: 'auto', width: 240 }}>
              <Search />
              <input className="input input-sm" placeholder="Buscar por nombre o universidad" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>

          <div className="row-between" style={{ marginBottom: 16 }}>
            <span className="small muted">{list.length} profesional{list.length === 1 ? '' : 'es'} disponible{list.length === 1 ? '' : 's'}</span>
            <span className="tiny muted"><Users style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }} />Atención para personas de todas las edades y profesiones</span>
          </div>

          {list.length === 0 ? (
            <div className="card"><Empty title="No encontramos terapeutas con esos filtros" text="Prueba quitando algún filtro o escríbenos para orientarte." action={<Link className="btn btn-sm" to="/agendar">Agendar sin filtro</Link>} icon={<GraduationCap />} /></div>
          ) : (
            <div className="therapist-marquee">
              <div className="therapist-marquee-track">
                {list.map((t: any, i: number) => (
                  <Reveal key={t.id} className="tm-item" delay={0}><TherapistCard t={t} onOpen={() => setSelected(t)} /></Reveal>
                ))}
              </div>
            </div>
          )}

          <div className="card card-forest" style={{ marginTop: 42, padding: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <h3 className="display" style={{ fontSize: 28, marginBottom: 6 }}>¿No sabes por dónde empezar?</h3>
              <p className="small" style={{ margin: 0, opacity: 0.7, maxWidth: 520 }}>Haz la encuesta económica y agenda una primera sesión de orientación. En 20 minutos definimos juntos el mejor acompañamiento.</p>
            </div>
            <Link className="btn btn-cream" to="/encuesta">Hacer la encuesta <ArrowRight /></Link>
          </div>

          <div className="hstack" style={{ marginTop: 22, justifyContent: 'center' }}>
            <Badge tone="sage" dot={false}>Presencial en Campus Norte y Sur</Badge>
            <Badge tone="sage" dot={false}>Virtual en todo el país</Badge>
            <Badge tone="sage" dot={false}>Lun a Sáb</Badge>
          </div>

          <p className="small muted center" style={{ marginTop: 18 }}>
            ¿Eres psicólogo o psicóloga? <Link to="/trabaja-con-nosotros" style={{ color: 'var(--forest-2)', fontWeight: 700 }}>Postula para unirte al equipo</Link>
          </p>
        </div>
      </section>

      <TherapistModal t={selected} open={!!selected} onClose={() => setSelected(null)} onBook={(id) => navigate(`/agendar?therapist=${id}`)} />
    </>
  );
}
