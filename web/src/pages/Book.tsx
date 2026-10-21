import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Building2, CalendarDays, CheckCircle2, ChevronRight, Clock, Copy,
  CreditCard, FileUp, GraduationCap, Landmark, Loader2, MapPin, ShieldCheck, Video, Wallet,
} from 'lucide-react';
import { api, fileToDataUrl } from '../lib/api';
import { Link, useQuery, useRouter } from '../lib/router';
import { useSite } from '../lib/site';
import { Avatar, Badge, ErrorState, Field, Loader, Steps, useToast } from '../lib/ui';
import { SurveyForm } from '../components/SurveyForm';
import { addDays, dateLong, dateMed, money, today, time12 } from '../lib/format';

const STEP_LABELS = ['Terapeuta', 'Horario', 'Tarifa', 'Tus datos', 'Listo'];

export function Book() {
  const { data, loading, error, reload } = useSite();
  const { navigate } = useRouter();
  const query = useQuery();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [therapistId, setTherapistId] = useState(query.get('therapist') || '');
  const [genderFilter, setGenderFilter] = useState('todos');
  const [date, setDate] = useState(today());
  const [slot, setSlot] = useState<any>(null);
  const [modality, setModality] = useState('presencial');
  const [survey, setSurvey] = useState<any>(null);
  const [calendar, setCalendar] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<any>(null);
  const [uploaded, setUploaded] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', university: '', career: '', semester: '', birthdate: '', gender: '',
    reason: '', password: '', consent: false,
  });

  const therapist = data?.therapists.find((t: any) => t.id === therapistId);
  const price = survey?.tier?.price ?? therapist?.price_base ?? 20;

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [step]);

  useEffect(() => {
    if (!therapistId) { setCalendar([]); return; }
    let alive = true;
    api(`/public/calendar?therapistId=${therapistId}`)
      .then((cal) => {
        if (!alive) return;
        setCalendar(cal);
        const first = cal.find((c: any) => c.available > 0);
        if (first) setDate(first.date);
        else setDate(today());
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [therapistId]);

  useEffect(() => {
    if (!therapistId) return;
    let alive = true;
    setSlotsLoading(true);
    setSlot(null);
    api(`/public/slots?therapistId=${therapistId}&date=${date}`)
      .then((r) => { if (alive) setSlots(r.slots || []); })
      .catch(() => { if (alive) setSlots([]); })
      .finally(() => { if (alive) setSlotsLoading(false); });
    return () => { alive = false; };
  }, [therapistId, date]);

  useEffect(() => {
    if (therapist?.modality === 'virtual') setModality('virtual');
    if (therapist?.modality === 'presencial') setModality('presencial');
  }, [therapist?.id]);

  const filtered = useMemo(() => (data?.therapists || []).filter((t: any) => genderFilter === 'todos' || t.gender === genderFilter), [data, genderFilter]);
  const visibleDays = calendar.slice(0, 21);

  if (loading) return <Loader />;
  if (error || !data) return <ErrorState message={error || ''} onRetry={reload} />;

  const canNext = step === 0 ? !!therapistId : step === 1 ? !!slot : step === 2 ? !!survey : true;

  const submit = async () => {
    if (!form.name || !form.email || !form.phone) return toast.error('Completa tu nombre, correo y teléfono');
    if (!form.consent) return toast.error('Debes aceptar el consentimiento informado');
    setBusy(true);
    try {
      const res = await api('/public/bookings', {
        method: 'POST',
        body: {
          therapistId, date, start: slot.start, modality, name: form.name, email: form.email, phone: form.phone,
          university: form.university, career: form.career, semester: form.semester, birthdate: form.birthdate,
          gender: form.gender, reason: form.reason, password: form.password || undefined,
          answers: survey?.answers,
        },
      });
      setCreated(res);
      setStep(4);
      toast.success('¡Reserva creada! Guarda tu código de cita.');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const uploadReceipt = async (file: File) => {
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await api(`/public/bookings/${created.code}/receipt`, { method: 'POST', body: { dataUrl } });
      setUploaded(res.receipt);
      toast.success('Comprobante recibido. Administración lo validará en breve.');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <section style={{ padding: '30px 0 90px' }}>
      <div className="container">
        <div className="row-between" style={{ marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span className="eyebrow">Reserva en línea</span>
            <h1 className="display" style={{ fontSize: 'clamp(32px,4vw,46px)', marginTop: 10 }}>Agenda tu sesión</h1>
          </div>
          <div className="hstack">
            <Badge tone="sage" dot={false}><ShieldCheck style={{ width: 12, height: 12 }} /> Confidencial</Badge>
            <Badge tone="sage" dot={false}><Clock style={{ width: 12, height: 12 }} /> 50 minutos</Badge>
          </div>
        </div>

        <Steps current={step} steps={STEP_LABELS} />

        <div className="booking-shell">
          <div className="booking-main">
            <div className="booking-card">
              {step === 0 && (
                <>
                  <h2 className="serif">¿Con quién quieres empezar?</h2>
                  <p className="sub">Puedes filtrar por género. Todos los terapeutas atienden personas de todas las edades y profesiones.</p>
                  <div className="segmented" style={{ marginBottom: 16 }}>
                    {[['todos', 'Todos'], ['femenino', 'Mujeres'], ['masculino', 'Hombres']].map(([v, l]) => (
                      <button key={v} className={genderFilter === v ? 'on' : ''} onClick={() => setGenderFilter(v)}>{l}</button>
                    ))}
                  </div>
                  <div className="pick-grid">
                    {filtered.map((t: any) => (
                      <button key={t.id} type="button" className={`pick-card ${therapistId === t.id ? 'on' : ''}`} onClick={() => { setTherapistId(t.id); setSlot(null); }}>
                        <Avatar src={t.photo} name={t.name} size="md" />
                        <span style={{ minWidth: 0 }}>
                          <strong>{t.name}</strong>
                          <span>{t.approaches[0]}</span>
                          <span>{t.university}</span>
                        </span>
                        <span style={{ marginLeft: 'auto', textAlign: 'right' }}>
                          <span style={{ fontSize: 9.5, color: 'var(--muted)' }}>desde</span>
                          <strong style={{ fontFamily: 'var(--serif)', fontSize: 17 }}>{money(t.price_base)}</strong>
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="notice" style={{ marginTop: 18 }}>
                    <GraduationCap />
                    <span>¿No sabes con quién? Elige a cualquier profesional y en la primera sesión definimos juntos el mejor acompañamiento.</span>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <h2 className="serif">Elige fecha y hora</h2>
                  <p className="sub">{therapist?.name} · {therapist?.room || 'Campus'}</p>
                  {visibleDays.length === 0 ? (
                    <div className="empty"><CalendarDays /><h4>Sin cupos disponibles</h4><p>Este terapeuta no tiene horarios configurados. Prueba con otro profesional.</p></div>
                  ) : (
                    <>
                      <div className="date-strip">
                        {visibleDays.map((d: any) => {
                          const dt = new Date(d.date + 'T12:00:00');
                          return (
                            <button key={d.date} type="button" className={`date-chip ${date === d.date ? 'on' : ''} ${!d.available ? 'off' : ''}`} onClick={() => setDate(d.date)}>
                              <div className="dw">{dt.toLocaleDateString('es-EC', { weekday: 'short' }).replace('.', '')}</div>
                              <div className="dd">{dt.getDate()}</div>
                              <div className="av">{d.available ? `${d.available} cupos` : 'sin cupos'}</div>
                            </button>
                          );
                        })}
                      </div>
                      <div className="row-between" style={{ marginTop: 20 }}>
                        <span className="small strong">{dateMed(date)}</span>
                        <span className="tiny muted">{slots.filter((s) => s.available).length} horarios disponibles</span>
                      </div>
                      {slotsLoading ? (
                        <div className="center muted small" style={{ padding: 26 }}><Loader2 className="spinner dark" style={{ display: 'inline', width: 18, height: 18 }} /> Cargando horarios…</div>
                      ) : (
                        <div className="time-grid">
                          {slots.map((s) => (
                            <button key={s.start} type="button" className={`time-chip ${slot?.start === s.start ? 'on' : ''}`} disabled={!s.available} onClick={() => setSlot(s)}>
                              {time12(s.start)}
                            </button>
                          ))}
                          {slots.length === 0 && <p className="small muted">No hay horarios este día. Elige otra fecha.</p>}
                        </div>
                      )}
                      <div className="form-section" style={{ marginTop: 22 }}>
                        <span className="label">Modalidad de la sesión</span>
                        <div className="segmented" style={{ marginTop: 8 }}>
                          <button className={modality === 'presencial' ? 'on' : ''} disabled={therapist?.modality === 'virtual'} onClick={() => setModality('presencial')}><MapPin style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }} />Presencial</button>
                          <button className={modality === 'virtual' ? 'on' : ''} disabled={therapist?.modality === 'presencial'} onClick={() => setModality('virtual')}><Video style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }} />Virtual</button>
                        </div>
                        <p className="tiny muted" style={{ marginTop: 6 }}>{modality === 'virtual' ? 'Recibirás un enlace de videollamada antes de la sesión.' : `Te esperamos en ${therapist?.room || 'el consultorio del campus'}.`}</p>
                      </div>
                    </>
                  )}
                </>
              )}

              {step === 2 && (
                <>
                  <h2 className="serif">Calcula tu aporte</h2>
                  <p className="sub">Así definimos una tarifa justa. Si ya la hiciste antes, puedes repetirla; no afecta tu acceso.</p>
                  <SurveyForm compact onDone={(r) => { setSurvey(r); setStep(3); }} />
                </>
              )}

              {step === 3 && (
                <>
                  <h2 className="serif">Tus datos</h2>
                  <p className="sub">Los usamos para tu historia clínica y para contactarte. Nunca compartimos tu información.</p>
                  <div className="form-grid">
                    <Field label="Nombre completo" className="span-2"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Sofía Morales" /></Field>
                    <Field label="Correo electrónico"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="tu@universidad.edu.ec" /></Field>
                    <Field label="Teléfono / WhatsApp"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+593 99 000 0000" /></Field>
                    <Field label="Universidad o institución"><input className="input" value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} placeholder="Universidad Central del Ecuador" /></Field>
                    <Field label="Carrera o área"><input className="input" value={form.career} onChange={(e) => setForm({ ...form, career: e.target.value })} placeholder="Arquitectura · 6.º semestre" /></Field>
                    <Field label="Género">
                      <select className="select" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                        <option value="">Prefiero no decirlo</option>
                        <option value="femenino">Femenino</option>
                        <option value="masculino">Masculino</option>
                        <option value="otro">Otro</option>
                      </select>
                    </Field>
                    <Field label="Fecha de nacimiento"><input className="input" type="date" value={form.birthdate} onChange={(e) => setForm({ ...form, birthdate: e.target.value })} /></Field>
                    <Field label="Motivo de consulta (opcional)" className="span-2">
                      <textarea className="textarea" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Cuéntanos brevemente qué te trae. Puedes dejarlo en blanco si prefieres hablarlo en la sesión." />
                    </Field>
                    <Field label="Crea una contraseña para tu portal (opcional)" className="span-2" hint="Si la creas, podrás entrar después a ver tus citas y comprobantes con este correo.">
                      <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
                    </Field>
                  </div>
                  <label className="check" style={{ marginTop: 16 }}>
                    <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
                    <span>{data.settings.policies.consent}</span>
                  </label>
                </>
              )}

              {step === 4 && created && (
                <div className="animate-up">
                  <div className="icon-chip lg forest" style={{ marginBottom: 14 }}><CheckCircle2 /></div>
                  <h2 className="serif">Reserva creada</h2>
                  <p className="sub">Guarda este código. Con él puedes consultar el estado y subir tu comprobante cuando quieras.</p>
                  <div className="pay-box" style={{ textAlign: 'center', background: 'var(--sage-soft)', borderStyle: 'solid' }}>
                    <div className="tiny muted" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>Código de cita</div>
                    <div className="confirm-code">{created.code}</div>
                    <div className="hstack" style={{ justifyContent: 'center', marginTop: 6 }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => { navigator.clipboard?.writeText(created.code); toast.success('Código copiado'); }}><Copy /> Copiar</button>
                      <Link className="btn btn-sm btn-ghost" to={`/seguimiento?code=${created.code}`}>Ver seguimiento</Link>
                    </div>
                  </div>

                  <div className="form-section">
                    <h4>Datos para la transferencia</h4>
                    <div className="card card-cream" style={{ padding: 16 }}>
                      <div className="pay-row"><span>Banco</span><strong>{created.bank.bankName}</strong></div>
                      <div className="pay-row"><span>Tipo de cuenta</span><strong>{created.bank.accountType}</strong></div>
                      <div className="pay-row"><span>Número de cuenta</span><strong>{created.bank.accountNumber}</strong></div>
                      <div className="pay-row"><span>Titular</span><strong>{created.bank.holder}</strong></div>
                      <div className="pay-row"><span>RUC / Cédula</span><strong>{created.bank.idNumber}</strong></div>
                      <div className="pay-row"><span>Monto</span><strong>{money(created.price)}</strong></div>
                      <div className="pay-row"><span>Concepto</span><strong>{created.code}</strong></div>
                    </div>
                    <p className="tiny muted" style={{ marginTop: 8 }}>{created.bank.note}</p>
                  </div>

                  <div className="form-section">
                    <h4>Sube tu comprobante (opcional ahora)</h4>
                    {uploaded ? (
                      <div className="upload-preview">
                        <img src={uploaded} alt="Comprobante" />
                        <div><strong style={{ fontSize: 13 }}>Comprobante enviado</strong><div className="tiny muted">Quedó en revisión por administración.</div></div>
                        <Badge tone="info" dot={false}>En revisión</Badge>
                      </div>
                    ) : (
                      <label className="upload-zone" style={{ display: 'block' }}>
                        <FileUp />
                        <strong>Toca para subir una foto o PDF</strong>
                        <span>JPG, PNG o PDF · máximo 7 MB</span>
                        <input type="file" accept="image/*,application/pdf" hidden onChange={(e) => e.target.files?.[0] && uploadReceipt(e.target.files[0])} />
                      </label>
                    )}
                  </div>

                  <div className="notice notice-warning" style={{ marginTop: 14 }}>
                    <Clock />
                    <span>Tu cita queda <strong>pendiente de confirmación</strong> hasta que validemos el pago. Te avisaremos por correo o WhatsApp.</span>
                  </div>

                  <div className="hstack" style={{ marginTop: 18 }}>
                    <Link className="btn" to="/portal">Ir a mi portal</Link>
                    <Link className="btn btn-ghost" to="/">Volver al inicio</Link>
                  </div>
                </div>
              )}

              {step < 4 && (
                <div className="booking-nav">
                  <button className="btn btn-ghost" onClick={() => (step === 0 ? navigate('/') : setStep(step - 1))}><ArrowLeft /> {step === 0 ? 'Salir' : 'Atrás'}</button>
                  {step < 3 ? (
                    <button className="btn" disabled={!canNext} onClick={() => setStep(step + 1)}>Continuar <ArrowRight /></button>
                  ) : (
                    <button className="btn" disabled={busy} onClick={submit}>{busy ? 'Reservando…' : `Confirmar reserva · ${money(price)}`} <CheckCircle2 /></button>
                  )}
                </div>
              )}
            </div>
          </div>

          <aside>
            <div className="summary-card">
              <h4>Resumen de tu sesión</h4>
              {therapist ? (
                <>
                  <div className="hstack" style={{ marginBottom: 14 }}>
                    <Avatar src={therapist.photo} name={therapist.name} size="md" />
                    <div><strong style={{ fontSize: 13 }}>{therapist.name}</strong><div className="tiny muted">{therapist.approaches[0]}</div></div>
                  </div>
                  <div className="summary-row"><span>Fecha</span><strong>{date ? dateLong(date).replace(/^\w/, (m) => m.toUpperCase()) : 'Por elegir'}</strong></div>
                  <div className="summary-row"><span>Hora</span><strong>{slot ? `${time12(slot.start)} – ${time12(slot.end)}` : 'Por elegir'}</strong></div>
                  <div className="summary-row"><span>Modalidad</span><strong>{modality === 'virtual' ? 'Virtual' : 'Presencial'}</strong></div>
                  <div className="summary-row"><span>Duración</span><strong>50 minutos</strong></div>
                  <div className="summary-row"><span>Lugar</span><strong>{modality === 'virtual' ? 'Videollamada' : therapist.room || 'Campus'}</strong></div>
                  <div className="summary-total">
                    <span className="small muted">Aporte{survey ? ' sugerido' : ' desde'}</span>
                    <span className="amount">{money(price)}</span>
                  </div>
                  <p className="tiny muted" style={{ marginTop: 10 }}>
                    <ShieldCheck style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />
                    Sin cobros ocultos. Pagas por transferencia y subes el comprobante.
                  </p>
                </>
              ) : (
                <p className="small muted" style={{ margin: 0 }}>Elige un terapeuta para ver el resumen de tu reserva.</p>
              )}
              <div className="divider" />
              <div className="stack-xs">
                <div className="hstack small"><CheckCircle2 style={{ width: 15, height: 15, color: 'var(--success)' }} /> Confirmación en menos de 24 h</div>
                <div className="hstack small"><CheckCircle2 style={{ width: 15, height: 15, color: 'var(--success)' }} /> Cancelación gratis con 24 h</div>
                <div className="hstack small"><CheckCircle2 style={{ width: 15, height: 15, color: 'var(--success)' }} /> Confidencialidad garantizada</div>
              </div>
            </div>
            <div className="card" style={{ marginTop: 12, padding: 18 }}>
              <div className="hstack"><Wallet style={{ width: 16, height: 16, color: 'var(--forest-2)' }} /><strong style={{ fontSize: 12 }}>¿Cómo pago?</strong></div>
              <p className="tiny muted" style={{ margin: '8px 0 0' }}>Transferencia bancaria o depósito. Al confirmar tu cita verás los datos de la cuenta y podrás subir el comprobante desde tu celular.</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
