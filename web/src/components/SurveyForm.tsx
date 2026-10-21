import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Info, RotateCcw } from 'lucide-react';
import { api } from '../lib/api';
import { useSite } from '../lib/site';
import { useToast } from '../lib/ui';
import { money } from '../lib/format';

type Result = { score: number; tier: any; ladder: any[]; declared: number };

export function SurveyForm({ onDone, compact = false, cta = 'Ver mi aporte sugerido' }: { onDone?: (r: Result) => void; compact?: boolean; cta?: string }) {
  const { data } = useSite();
  const toast = useToast();
  const questions = data?.questions || [];
  const [answers, setAnswers] = useState<Record<string, any>>({ declared: 10 });
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  const choiceQuestions = questions.filter((q: any) => q.type === 'choice');
  const answered = choiceQuestions.filter((q: any) => answers[q.id] !== undefined).length;
  const progress = Math.round((answered / Math.max(1, choiceQuestions.length)) * 100);

  const submit = async () => {
    const missing = choiceQuestions.find((q: any) => answers[q.id] === undefined);
    if (missing) {
      toast.error('Responde todas las preguntas para calcular tu aporte');
      document.getElementById('q-' + missing.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setBusy(true);
    try {
      const r = await api('/public/survey', { method: 'POST', body: { answers } });
      setResult(r);
      toast.success(`Tu aporte sugerido es ${money(r.tier.price)} por sesión`);
      setTimeout(() => document.getElementById('survey-result')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const ladder = result?.ladder || data?.tiers || [];

  if (result) {
    return (
      <div id="survey-result" className="survey-result animate-up">
        <div className="result-ring" style={{ ['--pct' as any]: result.score }}>
          <div>
            <div className="price">{money(result.tier.price)}</div>
            <div className="per">por sesión</div>
          </div>
        </div>
        <span className="eyebrow bare" style={{ justifyContent: 'center' }}>Nivel {result.tier.code} · Tarifa {result.tier.name}</span>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 30, marginTop: 10 }}>Tu aporte sugerido: {money(result.tier.price)}</h3>
        <p className="muted" style={{ maxWidth: 480, margin: '8px auto 0', fontSize: 14 }}>
          {result.tier.description} Calculamos este valor según tus ingresos, dependientes y situación actual. Puedes aportar más para financiar cupos solidarios, o escribirnos si necesitas un ajuste.
        </p>
        <div className="ladder-row">
          {ladder.map((t: any) => (
            <div key={t.code} className={`ladder-mini ${t.code === result.tier.code ? 'on' : ''}`}>
              {money(t.price)}
              <div style={{ fontWeight: 500, opacity: 0.65, fontSize: 9 }}>{t.code}</div>
            </div>
          ))}
        </div>
        <div className="hstack" style={{ justifyContent: 'center' }}>
          <button className="btn" onClick={() => onDone?.(result)}>
            {onDone ? 'Continuar con este aporte' : 'Agendar mi sesión'} <ArrowRight />
          </button>
          {!onDone && <a className="btn btn-ghost" href="#/agendar">Agendar <ArrowRight /></a>}
          <button className="btn btn-ghost" onClick={() => setResult(null)}><RotateCcw /> Volver a responder</button>
        </div>
        <p className="tiny muted" style={{ marginTop: 18 }}>
          <Info style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />
          Este valor es una sugerencia, no un requisito de acceso. Si tu situación cambia, puedes repetir la encuesta.
        </p>
      </div>
    );
  }

  return (
    <div>
      {!compact && (
        <div className="row-between" style={{ marginBottom: 6 }}>
          <span className="tiny muted"><strong>{answered}</strong> de {choiceQuestions.length} preguntas</span>
          <span className="tiny muted">{progress}%</span>
        </div>
      )}
      <div className="survey-progress"><i style={{ width: `${progress}%` }} /></div>
      <div style={{ marginTop: 22 }}>
        {questions.map((q: any, i: number) => (
          <div className="q-block" key={q.id} id={`q-${q.id}`}>
            <h3><span className="idx">{String(i + 1).padStart(2, '0')}</span>{q.label}</h3>
            {q.hint && <div className="hint">{q.hint}</div>}
            {q.type === 'choice' ? (
              <div className="option-pills">
                {q.options.map((o: any) => (
                  <button
                    key={o.v}
                    type="button"
                    className={`option-pill ${String(answers[q.id]) === String(o.v) ? 'on' : ''}`}
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: o.v }))}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            ) : (
              <div className="scale-range">
                <input
                  type="range"
                  min={q.min}
                  max={q.max}
                  step={q.step}
                  value={answers[q.id] ?? 10}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: Number(e.target.value) }))}
                  aria-label={q.label}
                />
                <div className="scale-value">{money(answers[q.id] ?? 10)}</div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="notice" style={{ marginTop: 8 }}>
        <CheckCircle2 />
        <span>La encuesta es confidencial y no condiciona tu atención. Solo nos ayuda a proponerte un aporte justo dentro de la escala de {money(5)} a {money(40)}.</span>
      </div>
      <div className="row-between" style={{ marginTop: 22, gap: 12, flexWrap: 'wrap' }}>
        <span className="tiny muted">Puedes repetirla cuando cambie tu situación.</span>
        <button className="btn" onClick={submit} disabled={busy}>
          {busy ? 'Calculando…' : cta} <ArrowRight />
        </button>
      </div>
    </div>
  );
}
