import { Info, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import { useRouter } from '../lib/router';
import { useSite } from '../lib/site';
import { Loader, ErrorState } from '../lib/ui';
import { SurveyForm } from '../components/SurveyForm';

export function SurveyPage() {
  const { data, loading, error, reload } = useSite();
  const { navigate } = useRouter();

  if (loading) return <Loader />;
  if (error || !data) return <ErrorState message={error || ''} onRetry={reload} />;
  const s = data.settings.content;

  return (
    <section style={{ padding: '44px 0 90px' }}>
      <div className="container">
        <div className="survey-wrap">
          <div className="survey-top">
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Encuesta económica</span>
            <h1 className="display" style={{ fontSize: 'clamp(36px,4.6vw,56px)', marginTop: 12 }}>Tu aporte, a tu medida</h1>
            <p className="lead" style={{ maxWidth: 600, margin: '10px auto 0', fontSize: 16 }}>
              Responde 9 preguntas y calculamos tu tarifa dentro de la escala de {data.tiers[0]?.price} a {data.tiers[data.tiers.length - 1]?.price} USD. No condiciona tu atención y puedes repetirla cuando quieras.
            </p>
            <div className="hstack" style={{ justifyContent: 'center', marginTop: 18 }}>
              <span className="badge badge-sage no-dot"><ShieldCheck style={{ width: 13, height: 13 }} /> Confidencial</span>
              <span className="badge badge-sage no-dot"><Wallet style={{ width: 13, height: 13 }} /> Sin costo de inscripción</span>
              <span className="badge badge-sage no-dot"><Sparkles style={{ width: 13, height: 13 }} /> 2 minutos</span>
            </div>
          </div>

          <div className="survey-card">
            <SurveyForm onDone={() => navigate('/agendar')} />
          </div>

          <div className="notice notice-info" style={{ marginTop: 22 }}>
            <Info />
            <span>
              ¿Tu situación cambió? Puedes repetir la encuesta desde tu portal o escribir a {data.settings.contact.email}. El equipo administrativo puede ajustar tu tarifa de forma manual en casos especiales.
            </span>
          </div>

          <p className="tiny muted center" style={{ marginTop: 18 }}>{s.marketingNote}</p>
        </div>
      </div>
    </section>
  );
}
