import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { AdminPage } from '../../components/AdminLayout';
import { Field, Loader, ErrorState, useFetch, useToast } from '../../lib/ui';

const TABS = [
  ['portada', 'Portada'],
  ['programa', 'Programa'],
  ['equipo', 'Sobre el equipo'],
  ['faq', 'Preguntas'],
  ['testimonios', 'Testimonios'],
  ['contacto', 'Contacto'],
  ['pagos', 'Pagos'],
  ['politicas', 'Políticas'],
];

export function AdminContent() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch<any>(() => api('/admin/settings'), []);
  const [tab, setTab] = useState('portada');
  const [s, setS] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (data?.settings) setS(JSON.parse(JSON.stringify(data.settings))); }, [data]);

  if (loading && !s) return <Loader />;
  if (error || !s) return <ErrorState message={error || 'No se pudo cargar'} onRetry={reload} />;

  const c = s.content;
  const setC = (patch: any) => setS({ ...s, content: { ...s.content, ...patch } });
  const setContact = (patch: any) => setS({ ...s, contact: { ...s.contact, ...patch } });
  const setBank = (patch: any) => setS({ ...s, bank: { ...s.bank, ...patch } });
  const setPolicies = (patch: any) => setS({ ...s, policies: { ...s.policies, ...patch } });

  const save = async () => {
    setBusy(true);
    try {
      await api('/admin/settings', { method: 'PUT', body: { content: c, contact: s.contact, bank: s.bank, policies: s.policies } });
      toast.success('Contenido actualizado. Ya se refleja en el sitio.');
      reload();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <AdminPage
      title="Contenido del sitio"
      subtitle="Edita los textos, preguntas frecuentes, datos de contacto y cuentas bancarias."
      actions={<button className="btn btn-sm" onClick={save} disabled={busy}><Save /> {busy ? 'Guardando…' : 'Publicar cambios'}</button>}
    >
      <div className="tabs-line">
        {TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {tab === 'portada' && (
        <div className="panel"><div className="panel-body">
          <div className="form-grid">
            <Field label="Etiqueta superior" className="span-2"><input className="input" value={c.heroBadge} onChange={(e) => setC({ heroBadge: e.target.value })} /></Field>
            <Field label="Título principal"><input className="input" value={c.heroTitle} onChange={(e) => setC({ heroTitle: e.target.value })} /></Field>
            <Field label="Frase destacada (cursiva)"><input className="input" value={c.heroHighlight} onChange={(e) => setC({ heroHighlight: e.target.value })} /></Field>
            <Field label="Subtítulo" className="span-2"><textarea className="textarea" value={c.heroSubtitle} onChange={(e) => setC({ heroSubtitle: e.target.value })} /></Field>
            <Field label="CTA principal"><input className="input" value={c.primaryCta} onChange={(e) => setC({ primaryCta: e.target.value })} /></Field>
            <Field label="CTA secundario"><input className="input" value={c.secondaryCta} onChange={(e) => setC({ secondaryCta: e.target.value })} /></Field>
            <Field label="Imagen principal (URL)" className="span-2" hint="Puedes subir una foto desde Terapeutas o usar /img/team/camila.jpg"><input className="input" value={c.heroImage} onChange={(e) => setC({ heroImage: e.target.value })} /></Field>
            <Field label="Nota de tarifa" className="span-2"><input className="input" value={c.marketingNote} onChange={(e) => setC({ marketingNote: e.target.value })} /></Field>
          </div>
          <div className="form-section">
            <h4>Cifras destacadas</h4>
            {c.stats.map((st: any, i: number) => (
              <div className="row" key={i} style={{ marginBottom: 8 }}>
                <input className="input input-sm" value={st.value} onChange={(e) => setC({ stats: c.stats.map((x: any, j: number) => j === i ? { ...x, value: e.target.value } : x) })} style={{ width: 120 }} />
                <input className="input input-sm" value={st.label} onChange={(e) => setC({ stats: c.stats.map((x: any, j: number) => j === i ? { ...x, label: e.target.value } : x) })} />
                <button className="icon-btn" onClick={() => setC({ stats: c.stats.filter((_: any, j: number) => j !== i) })}><Trash2 /></button>
              </div>
            ))}
            <button className="btn btn-sm btn-ghost" onClick={() => setC({ stats: [...c.stats, { value: '', label: '' }] })}><Plus /> Agregar cifra</button>
          </div>
        </div></div>
      )}

      {tab === 'programa' && (
        <div className="panel"><div className="panel-body">
          <div className="form-grid">
            <Field label="Título de sección" className="span-2"><input className="input" value={c.aboutTitle} onChange={(e) => setC({ aboutTitle: e.target.value })} /></Field>
            <Field label="Texto descriptivo" className="span-2"><textarea className="textarea" value={c.aboutText} onChange={(e) => setC({ aboutText: e.target.value })} /></Field>
          </div>
          <div className="form-section">
            <h4>Puntos clave</h4>
            {c.aboutPoints.map((p: string, i: number) => (
              <div className="row" key={i} style={{ marginBottom: 8 }}>
                <input className="input input-sm" value={p} onChange={(e) => setC({ aboutPoints: c.aboutPoints.map((x: string, j: number) => j === i ? e.target.value : x) })} />
                <button className="icon-btn" onClick={() => setC({ aboutPoints: c.aboutPoints.filter((_: any, j: number) => j !== i) })}><Trash2 /></button>
              </div>
            ))}
            <button className="btn btn-sm btn-ghost" onClick={() => setC({ aboutPoints: [...c.aboutPoints, ''] })}><Plus /> Agregar punto</button>
          </div>
          <div className="form-section">
            <h4>Pasos del proceso</h4>
            {c.steps.map((st: any, i: number) => (
              <div className="card" key={i} style={{ padding: 12, marginBottom: 8 }}>
                <div className="row" style={{ marginBottom: 6 }}>
                  <strong className="tiny muted">Paso {i + 1}</strong>
                  <button className="icon-btn ml-auto" onClick={() => setC({ steps: c.steps.filter((_: any, j: number) => j !== i) })}><Trash2 /></button>
                </div>
                <input className="input input-sm" value={st.title} onChange={(e) => setC({ steps: c.steps.map((x: any, j: number) => j === i ? { ...x, title: e.target.value } : x) })} placeholder="Título" style={{ marginBottom: 6 }} />
                <textarea className="textarea" value={st.text} onChange={(e) => setC({ steps: c.steps.map((x: any, j: number) => j === i ? { ...x, text: e.target.value } : x) })} style={{ minHeight: 60 }} />
              </div>
            ))}
            <button className="btn btn-sm btn-ghost" onClick={() => setC({ steps: [...c.steps, { title: '', text: '' }] })}><Plus /> Agregar paso</button>
          </div>
        </div></div>
      )}

      {tab === 'equipo' && (
        <div className="panel"><div className="panel-body">
          <p className="small muted">Los perfiles de terapeutas se editan en la sección <strong>Terapeutas</strong>. Aquí puedes cambiar el texto introductorio del equipo.</p>
          <Field label="Título de la sección"><input className="input" value={c.equipoTitle || 'Terapeutas que hablan tu idioma'} onChange={(e) => setC({ equipoTitle: e.target.value })} /></Field>
        </div></div>
      )}

      {tab === 'faq' && (
        <div className="panel"><div className="panel-body">
          {c.faqs.map((f: any, i: number) => (
            <div className="card" key={i} style={{ padding: 14, marginBottom: 10 }}>
              <div className="row-between" style={{ marginBottom: 6 }}>
                <strong className="tiny muted">Pregunta {i + 1}</strong>
                <button className="icon-btn" onClick={() => setC({ faqs: c.faqs.filter((_: any, j: number) => j !== i) })}><Trash2 /></button>
              </div>
              <input className="input input-sm" value={f.q} onChange={(e) => setC({ faqs: c.faqs.map((x: any, j: number) => j === i ? { ...x, q: e.target.value } : x) })} placeholder="Pregunta" style={{ marginBottom: 6 }} />
              <textarea className="textarea" value={f.a} onChange={(e) => setC({ faqs: c.faqs.map((x: any, j: number) => j === i ? { ...x, a: e.target.value } : x) })} placeholder="Respuesta" style={{ minHeight: 70 }} />
            </div>
          ))}
          <button className="btn btn-sm btn-ghost" onClick={() => setC({ faqs: [...c.faqs, { q: '', a: '' }] })}><Plus /> Agregar pregunta</button>
        </div></div>
      )}

      {tab === 'testimonios' && (
        <div className="panel"><div className="panel-body">
          {c.testimonials.map((t: any, i: number) => (
            <div className="card" key={i} style={{ padding: 14, marginBottom: 10 }}>
              <div className="row-between" style={{ marginBottom: 6 }}>
                <strong className="tiny muted">Testimonio {i + 1}</strong>
                <button className="icon-btn" onClick={() => setC({ testimonials: c.testimonials.filter((_: any, j: number) => j !== i) })}><Trash2 /></button>
              </div>
              <div className="form-grid">
                <Field label="Nombre"><input className="input input-sm" value={t.name} onChange={(e) => setC({ testimonials: c.testimonials.map((x: any, j: number) => j === i ? { ...x, name: e.target.value } : x) })} /></Field>
                <Field label="Rol / carrera"><input className="input input-sm" value={t.role} onChange={(e) => setC({ testimonials: c.testimonials.map((x: any, j: number) => j === i ? { ...x, role: e.target.value } : x) })} /></Field>
              </div>
              <textarea className="textarea" value={t.text} onChange={(e) => setC({ testimonials: c.testimonials.map((x: any, j: number) => j === i ? { ...x, text: e.target.value } : x) })} style={{ minHeight: 70, marginTop: 6 }} />
            </div>
          ))}
          <button className="btn btn-sm btn-ghost" onClick={() => setC({ testimonials: [...c.testimonials, { name: '', role: '', text: '' }] })}><Plus /> Agregar testimonio</button>
        </div></div>
      )}

      {tab === 'contacto' && (
        <div className="panel"><div className="panel-body">
          <div className="form-grid">
            <Field label="Teléfono"><input className="input" value={s.contact.phone} onChange={(e) => setContact({ phone: e.target.value })} /></Field>
            <Field label="WhatsApp (solo números)"><input className="input" value={s.contact.whatsapp} onChange={(e) => setContact({ whatsapp: e.target.value })} /></Field>
            <Field label="Correo"><input className="input" value={s.contact.email} onChange={(e) => setContact({ email: e.target.value })} /></Field>
            <Field label="Instagram"><input className="input" value={s.contact.instagram} onChange={(e) => setContact({ instagram: e.target.value })} /></Field>
            <Field label="Dirección" className="span-2"><input className="input" value={s.contact.address} onChange={(e) => setContact({ address: e.target.value })} /></Field>
            <Field label="Ciudad" className="span-2"><input className="input" value={s.contact.city} onChange={(e) => setContact({ city: e.target.value })} /></Field>
            <Field label="Horario de atención" className="span-2"><input className="input" value={s.contact.hours} onChange={(e) => setContact({ hours: e.target.value })} /></Field>
          </div>
        </div></div>
      )}

      {tab === 'pagos' && (
        <div className="panel"><div className="panel-body">
          <p className="small muted">Estos datos aparecen al confirmar una reserva, en el correo y en el portal del paciente.</p>
          <div className="form-grid">
            <Field label="Banco"><input className="input" value={s.bank.bankName} onChange={(e) => setBank({ bankName: e.target.value })} /></Field>
            <Field label="Tipo de cuenta"><input className="input" value={s.bank.accountType} onChange={(e) => setBank({ accountType: e.target.value })} /></Field>
            <Field label="Número de cuenta"><input className="input" value={s.bank.accountNumber} onChange={(e) => setBank({ accountNumber: e.target.value })} /></Field>
            <Field label="Titular"><input className="input" value={s.bank.holder} onChange={(e) => setBank({ holder: e.target.value })} /></Field>
            <Field label="RUC / Cédula"><input className="input" value={s.bank.idNumber} onChange={(e) => setBank({ idNumber: e.target.value })} /></Field>
            <Field label="Correo de pagos"><input className="input" value={s.bank.email} onChange={(e) => setBank({ email: e.target.value })} /></Field>
            <Field label="Instrucciones" className="span-2"><textarea className="textarea" value={s.bank.note} onChange={(e) => setBank({ note: e.target.value })} /></Field>
          </div>
        </div></div>
      )}

      {tab === 'politicas' && (
        <div className="panel"><div className="panel-body">
          <div className="form-grid">
            <Field label="Horas mínimas para cancelar"><input className="input" type="number" value={s.policies.cancellationHours} onChange={(e) => setPolicies({ cancellationHours: Number(e.target.value) })} /></Field>
            <Field label="Tolerancia de llegada (min)"><input className="input" type="number" value={s.policies.lateToleranceMinutes} onChange={(e) => setPolicies({ lateToleranceMinutes: Number(e.target.value) })} /></Field>
            <Field label="Texto de consentimiento informado" className="span-2"><textarea className="textarea" value={s.policies.consent} onChange={(e) => setPolicies({ consent: e.target.value })} /></Field>
            <Field label="Política de confidencialidad" className="span-2"><textarea className="textarea" value={s.policies.privacy} onChange={(e) => setPolicies({ privacy: e.target.value })} /></Field>
            <Field label="Nota de pago" className="span-2"><textarea className="textarea" value={s.policies.paymentNote} onChange={(e) => setPolicies({ paymentNote: e.target.value })} /></Field>
          </div>
        </div></div>
      )}
    </AdminPage>
  );
}
