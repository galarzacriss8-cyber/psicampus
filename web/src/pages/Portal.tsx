import { useEffect, useState } from 'react';
import {
  ArrowRight, CalendarDays, CheckCircle2, Clock, CreditCard, FileUp, HeartHandshake, MapPin,
  RefreshCw, ShieldCheck, Upload, Video, Wallet, XCircle, User, Lock, Sparkles, ClipboardList, Download,
} from 'lucide-react';
import { api, fileToDataUrl } from '../lib/api';
import { Link, useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { Avatar, Badge, Empty, ErrorState, Field, Loader, PayBadge, StatusBadge, useFetch, useToast } from '../lib/ui';
import { PortalLayout } from '../components/PortalLayout';
import { SurveyForm } from '../components/SurveyForm';
import { dateLong, dateMed, dateShort, money, time12 } from '../lib/format';

export function Portal() {
  const { path } = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const tab = path.split('?')[0].split('/')[2] || 'inicio';
  const { data, loading, error, reload } = useFetch<any>(() => api('/patient/overview'), []);
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [payTarget, setPayTarget] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<any>({});
  const [pwd, setPwd] = useState({ current: '', next: '' });

  useEffect(() => { if (data?.patient) setProfile(data.patient); }, [data]);

  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const p = data.patient;
  const next = data.next;

  const cancel = async () => {
    setBusy(true);
    try {
      const res = await api(`/patient/appointments/${cancelTarget.id}/cancel`, { method: 'POST', body: { reason: cancelReason } });
      toast.success(res.warning || 'Cita cancelada. Puedes agendar otro horario cuando quieras.');
      setCancelTarget(null);
      setCancelReason('');
      reload();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const reschedule = async (appt: any) => {
    const preference = window.prompt('Â¿QuÃ© dÃ­a u horario prefieres? (ej. martes por la tarde)');
    if (preference === null) return;
    try {
      await api(`/patient/appointments/${appt.id}/reschedule-request`, { method: 'POST', body: { preference } });
      toast.success('Solicitud enviada. Te contactaremos para coordinar.');
    } catch (e: any) { toast.error(e.message); }
  };

  const saveProfile = async () => {
    try {
      await api('/patient/profile', { method: 'PATCH', body: { name: profile.name, phone: profile.phone, university: profile.university, career: profile.career, semester: profile.semester, city: profile.city, birthdate: profile.birthdate } });
      toast.success('Datos actualizados');
      reload();
    } catch (e: any) { toast.error(e.message); }
  };

  const changePassword = async () => {
    try {
      await api('/auth/change-password', { method: 'POST', body: pwd });
      toast.success('ContraseÃ±a actualizada');
      setPwd({ current: '', next: '' });
    } catch (e: any) { toast.error(e.message); }
  };

  const APPT = ({ a, past = false }: { a: any; past?: boolean }) => (
    <div className="appt-item">
      <div className="appt-date">
        <div className="d">{new Date(a.date + 'T12:00:00').getDate()}</div>
        <div className="m">{new Date(a.date + 'T12:00:00').toLocaleDateString('es-EC', { month: 'short' }).replace('.', '')}</div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="hstack" style={{ gap: 6, marginBottom: 3 }}>
          <StatusBadge status={a.status} />
          <PayBadge status={a.payment_status} />
        </div>
        <h4>{a.therapist_name}</h4>
        <p>{time12(a.start)} Â· {a.modality === 'virtual' ? 'Virtual' : a.therapist_room || 'Presencial'} Â· {money(a.price)}</p>
      </div>
      <div className="row-actions" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
        {!past && a.payment_status !== 'pagado' && (
          <button className="btn btn-sm btn-soft" onClick={() => setPayTarget(a)}><Upload /> Comprobante</button>
        )}
        {!past && ['pendiente', 'confirmada'].includes(a.status) && (
          <>
            <button className="btn btn-sm btn-ghost" onClick={() => reschedule(a)}><RefreshCw /> Reprogramar</button>
            <button className="btn btn-sm btn-danger-soft" onClick={() => setCancelTarget(a)}><XCircle /> Cancelar</button>
          </>
        )}
        {past && a.status === 'completada' && <span className="tiny muted">SesiÃ³n realizada</span>}
      </div>
    </div>
  );

  const tier = data.tier;

  return (
    <PortalLayout name={p.name}>
      {tab === 'inicio' && (
        <>
          <div className="portal-greet">
            <div>
              <h1>Hola, {p.name.split(' ')[0]}</h1>
              <p>{new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })} Â· Tu espacio de bienestar</p>
            </div>
            <div className="hstack">
              <Badge tone="sage" dot={false}><ShieldCheck style={{ width: 12, height: 12 }} /> Confidencial</Badge>
              <Link className="btn btn-sm btn-cream" to="/agendar">Nueva cita <ArrowRight /></Link>
            </div>
          </div>

          <div className="portal-grid">
            <div className="stack">
              {next ? (
                <div className="next-card">
                  <div className="row-between" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <span className="eyebrow" style={{ fontSize: 10 }}>Tu prÃ³xima sesiÃ³n</span>
                      <div className="when">{dateLong(next.date).replace(/^\w/, (m) => m.toUpperCase())}</div>
                      <div className="hstack" style={{ marginTop: 5 }}>
                        <StatusBadge status={next.status} />
                        <PayBadge status={next.payment_status} />
                        <span className="tiny muted"><Clock style={{ width: 12, height: 12, display: 'inline', marginRight: 3 }} />{time12(next.start)} â€“ {time12(next.end)}</span>
                      </div>
                    </div>
                    <div className="appt-date" style={{ width: 74 }}>
                      <div className="d" style={{ fontSize: 30 }}>{new Date(next.date + 'T12:00:00').getDate()}</div>
                      <div className="m">{new Date(next.date + 'T12:00:00').toLocaleDateString('es-EC', { month: 'long' })}</div>
                    </div>
                  </div>
                  <div className="hstack" style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
                    <Avatar src={next.therapist_photo} name={next.therapist_name} size="md" />
                    <div className="grow">
                      <strong style={{ fontSize: 13.5 }}>{next.therapist_name}</strong>
                      <div className="tiny muted"><MapPin style={{ width: 11, height: 11, display: 'inline', marginRight: 3 }} />{next.modality === 'virtual' ? 'Videollamada' : next.therapist_room || 'Consultorio del campus'} Â· {money(next.price)}</div>
                    </div>
                    {next.payment_status !== 'pagado' && <button className="btn btn-sm" onClick={() => setPayTarget(next)}><Upload /> Subir comprobante</button>}
                  </div>
                  {next.payment_status !== 'pagado' && (
                    <div className="notice notice-warning" style={{ marginTop: 14 }}>
                      <Clock />
                      <span>Tu cita se confirma al validar el pago. Sube el comprobante o escrÃ­benos si ya transferiste.</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="next-card">
                  <span className="eyebrow">Sin citas prÃ³ximas</span>
                  <div className="when">Tu prÃ³ximo paso puede ser hoy</div>
                  <p className="muted small" style={{ maxWidth: 420 }}>Agenda una sesiÃ³n con tu terapeuta o retoma tu proceso cuando lo necesites. Estamos aquÃ­.</p>
                  <Link className="btn" to="/agendar">Agendar una cita <ArrowRight /></Link>
                </div>
              )}

              <div className="panel">
                <div className="panel-head">
                  <h3>Actividad reciente</h3>
                  <Link className="btn btn-sm btn-ghost" to="/portal/citas">Ver todas</Link>
                </div>
                <div className="panel-body" style={{ paddingTop: 6, paddingBottom: 6 }}>
                  {data.past.slice(0, 4).map((a: any) => <APPT key={a.id} a={a} past />)}
                  {data.past.length === 0 && <Empty title="AÃºn no tienes sesiones" text="Cuando completes tu primera sesiÃ³n verÃ¡s aquÃ­ tu historial." icon={<CalendarDays />} />}
                </div>
              </div>
            </div>

            <div className="stack">
              <div className="mini-stats">
                <div className="mini-stat"><div className="v">{data.stats.completed}</div><div className="l">Sesiones</div></div>
                <div className="mini-stat"><div className="v">{money(data.stats.paid)}</div><div className="l">Aportado</div></div>
                <div className="mini-stat"><div className="v">{data.stats.pendingPayments}</div><div className="l">En revisiÃ³n</div></div>
              </div>

              <div className="card">
                <div className="row-between">
                  <div className="hstack"><span className="icon-chip clay"><Wallet /></span><div><strong style={{ fontSize: 13 }}>Tu tarifa</strong><div className="tiny muted">Nivel {p.tier_code || 'â€”'}</div></div></div>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 30 }}>{money(p.assigned_price)}</span>
                </div>
                <p className="tiny muted" style={{ margin: '12px 0 0' }}>{tier?.description || 'Completa la encuesta para calcular tu aporte.'}</p>
                <Link className="btn btn-sm btn-ghost btn-block" to="/portal/encuesta" style={{ marginTop: 12 }}>Revisar mi encuesta</Link>
              </div>

              <div className="card" style={{ background: 'var(--forest)', color: '#fff', border: 0 }}>
                <HeartHandshake style={{ width: 26, height: 26, opacity: 0.8 }} />
                <h3 className="serif" style={{ fontSize: 22, color: '#fff', margin: '10px 0 6px' }}>Tu proceso, a tu ritmo</h3>
                <p className="small" style={{ opacity: 0.7, margin: 0 }}>Si necesitas reprogramar o hablar con alguien del equipo, estamos a un mensaje de distancia.</p>
                <a className="btn btn-sm btn-cream" style={{ marginTop: 14 }} href="https://wa.me/593991204580" target="_blank" rel="noreferrer">Escribir por WhatsApp</a>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'citas' && (
        <>
          <div className="row-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 className="display" style={{ fontSize: 32, margin: 0 }}>Mis citas</h1>
              <p className="small muted" style={{ margin: '4px 0 0' }}>{data.upcoming.length} prÃ³ximas Â· {data.past.length} anteriores</p>
            </div>
            <Link className="btn btn-sm" to="/agendar">Nueva cita <ArrowRight /></Link>
          </div>
          <div className="card" style={{ padding: '6px 20px' }}>
            {data.upcoming.length === 0 && <Empty title="No tienes citas prÃ³ximas" text="Agenda una sesiÃ³n cuando quieras." action={<Link className="btn btn-sm" to="/agendar">Agendar</Link>} icon={<CalendarDays />} />}
            {data.upcoming.map((a: any) => <APPT key={a.id} a={a} />)}
          </div>
          <h2 className="serif" style={{ fontSize: 24, margin: '26px 0 12px' }}>Historial</h2>
          <div className="card" style={{ padding: '6px 20px' }}>
            {data.past.length === 0 && <Empty title="Sin historial todavÃ­a" icon={<ClipboardList />} />}
            {data.past.map((a: any) => <APPT key={a.id} a={a} past />)}
          </div>
        </>
      )}

      {tab === 'pagos' && (
        <>
          <div className="row-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 className="display" style={{ fontSize: 32, margin: 0 }}>Pagos y comprobantes</h1>
              <p className="small muted" style={{ margin: '4px 0 0' }}>Sube tu comprobante y revisa el estado de cada aporte.</p>
            </div>
          </div>
          <div className="grid-2e">
            <div className="panel">
              <div className="panel-head"><h3>Pagos por completar</h3><Badge tone="warning">{data.upcoming.filter((a: any) => a.payment_status !== 'pagado').length}</Badge></div>
              <div className="panel-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
                {data.upcoming.filter((a: any) => a.payment_status !== 'pagado').length === 0 && <Empty title="Todo al dÃ­a" text="No tienes pagos pendientes por ahora." icon={<CheckCircle2 />} />}
                {data.upcoming.filter((a: any) => a.payment_status !== 'pagado').map((a: any) => (
                  <div className="appt-item" key={a.id}>
                    <div className="appt-date"><div className="d">{new Date(a.date + 'T12:00:00').getDate()}</div><div className="m">{new Date(a.date + 'T12:00:00').toLocaleDateString('es-EC', { month: 'short' }).replace('.', '')}</div></div>
                    <div><h4>{a.therapist_name}</h4><p>{dateMed(a.date)} Â· {money(a.price)}</p><PayBadge status={a.payment_status} /></div>
                    <button className="btn btn-sm btn-soft" onClick={() => setPayTarget(a)}><Upload /> Subir</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel">
              <div className="panel-head"><h3>Historial de pagos</h3></div>
              <div className="panel-body" style={{ paddingTop: 6, paddingBottom: 6 }}>
                {data.payments.length === 0 && <Empty title="Sin pagos registrados" icon={<CreditCard />} />}
                {data.payments.map((pay: any) => (
                  <div className="detail-row" key={pay.id} style={{ alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: 12.5 }}>{money(pay.amount)} Â· {pay.method}</strong>
                      <div className="tiny muted">{dateShort(pay.created_at)} {pay.reference ? `Â· ${pay.reference}` : ''}</div>
                    </div>
                    <div className="hstack">
                      {pay.receipt && <a className="btn btn-sm btn-ghost" href={pay.receipt} target="_blank" rel="noreferrer">Ver</a>}
                      <PayBadge status={pay.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'encuesta' && (
        <>
          <div className="row-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 className="display" style={{ fontSize: 32, margin: 0 }}>Mi tarifa</h1>
              <p className="small muted" style={{ margin: '4px 0 0' }}>Tu aporte actual y la posibilidad de recalcularlo cuando cambie tu situaciÃ³n.</p>
            </div>
          </div>
          <div className="grid-2e" style={{ marginBottom: 16 }}>
            <div className="card card-forest" style={{ padding: 26 }}>
              <span className="eyebrow" style={{ color: 'var(--sage)' }}>Aporte vigente</span>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 54, lineHeight: 1, marginTop: 10 }}>{money(p.assigned_price)}</div>
              <p className="small" style={{ opacity: 0.7, marginTop: 6 }}>Nivel {p.tier_code} Â· {tier?.name || 'Tarifa social'}</p>
              <p className="tiny" style={{ opacity: 0.6 }}>{tier?.description}</p>
            </div>
            <div className="card">
              <div className="hstack"><ScrollIcon /><strong style={{ fontSize: 13 }}>Â¿CÃ³mo se calcula?</strong></div>
              <p className="small muted" style={{ margin: '10px 0 0' }}>Consideramos tus ingresos, dependientes, becas y gastos fijos. El resultado es una sugerencia, no una barrera: si necesitas un ajuste, escrÃ­benos.</p>
              <div className="detail-list" style={{ marginTop: 8 }}>
                <div className="detail-row"><span>Ãšltima actualizaciÃ³n</span><strong>{data.surveys[0] ? dateShort(data.surveys[0].created_at) : 'Sin encuesta'}</strong></div>
                <div className="detail-row"><span>Puntaje</span><strong>{data.surveys[0]?.score ?? 'â€”'} / 100</strong></div>
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><h3>Recalcular mi aporte</h3><span className="tiny muted">Toma 2 minutos</span></div>
            <div className="panel-body">
              <SurveyForm onDone={() => reload()} cta="Actualizar mi aporte" />
            </div>
          </div>
        </>
      )}

      {tab === 'perfil' && (
        <>
          <div className="row-between" style={{ marginBottom: 16 }}>
            <div><h1 className="display" style={{ fontSize: 32, margin: 0 }}>Mi perfil</h1><p className="small muted" style={{ margin: '4px 0 0' }}>MantÃ©n tus datos actualizados para una mejor atenciÃ³n.</p></div>
          </div>
          <div className="grid-2e">
            <div className="panel">
              <div className="panel-head"><h3>Datos personales</h3></div>
              <div className="panel-body">
                <div className="hstack" style={{ marginBottom: 16 }}>
                  <Avatar name={p.name} size="lg" />
                  <div><strong>{p.name}</strong><div className="tiny muted">{p.email}</div><Badge tone="sage" dot={false}>{p.tier_code ? `Nivel ${p.tier_code}` : 'Sin tarifa'}</Badge></div>
                </div>
                <div className="form-grid">
                  <Field label="Nombre completo" className="span-2"><input className="input" value={profile.name || ''} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></Field>
                  <Field label="TelÃ©fono"><input className="input" value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></Field>
                  <Field label="Fecha de nacimiento"><input className="input" type="date" value={profile.birthdate || ''} onChange={(e) => setProfile({ ...profile, birthdate: e.target.value })} /></Field>
                  <Field label="Universidad"><input className="input" value={profile.university || ''} onChange={(e) => setProfile({ ...profile, university: e.target.value })} /></Field>
                  <Field label="Carrera / Ã¡rea"><input className="input" value={profile.career || ''} onChange={(e) => setProfile({ ...profile, career: e.target.value })} /></Field>
                  <Field label="Semestre"><input className="input" value={profile.semester || ''} onChange={(e) => setProfile({ ...profile, semester: e.target.value })} /></Field>
                  <Field label="Ciudad"><input className="input" value={profile.city || ''} onChange={(e) => setProfile({ ...profile, city: e.target.value })} /></Field>
                </div>
                <button className="btn" style={{ marginTop: 16 }} onClick={saveProfile}>Guardar cambios</button>
              </div>
            </div>
            <div className="stack">
              <div className="panel">
                <div className="panel-head"><h3>Seguridad</h3></div>
                <div className="panel-body stack">
                  <Field label="ContraseÃ±a actual"><input className="input" type="password" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} /></Field>
                  <Field label="Nueva contraseÃ±a" hint="MÃ­nimo 8 caracteres"><input className="input" type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} /></Field>
                  <button className="btn btn-ghost" onClick={changePassword}><Lock /> Actualizar contraseÃ±a</button>
                </div>
              </div>
              <div className="card">
                <div className="hstack"><ShieldCheck style={{ width: 17, height: 17, color: 'var(--forest-2)' }} /><strong style={{ fontSize: 13 }}>Privacidad</strong></div>
                <p className="tiny muted" style={{ margin: '8px 0 0' }}>{data.patient ? 'Tu historia clÃ­nica solo es accesible para tu terapeuta tratante. La administraciÃ³n ve Ãºnicamente datos de agenda y pagos.' : ''}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {cancelTarget && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setCancelTarget(null)}>
          <div className="modal">
            <div className="modal-head"><div><h3>Cancelar cita</h3><p>{dateLong(cancelTarget.date)} Â· {time12(cancelTarget.start)}</p></div><button className="close-btn" onClick={() => setCancelTarget(null)}>âœ•</button></div>
            <div className="modal-body">
              <div className="notice notice-warning" style={{ marginBottom: 14 }}><Clock /><span>Con menos de 24 horas de anticipaciÃ³n puede aplicarse la polÃ­tica de cancelaciÃ³n. Si es una emergencia, escrÃ­benos.</span></div>
              <Field label="Motivo (opcional)"><textarea className="textarea" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="CuÃ©ntanos brevemente quÃ© pasÃ³" /></Field>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setCancelTarget(null)}>Volver</button>
              <button className="btn btn-danger" onClick={cancel} disabled={busy}>{busy ? 'Cancelandoâ€¦' : 'Confirmar cancelaciÃ³n'}</button>
            </div>
          </div>
        </div>
      )}

      {payTarget && <PayModal appt={payTarget} onClose={() => setPayTarget(null)} onDone={() => { setPayTarget(null); reload(); }} />}
    </PortalLayout>
  );
}

function ScrollIcon() {
  return <span className="icon-chip" style={{ width: 34, height: 34 }}><ClipboardList style={{ width: 16, height: 16 }} /></span>;
}

function PayModal({ appt, onClose, onDone }: { appt: any; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const pick = async (f: File) => {
    setFile(f);
    try { setPreview(await fileToDataUrl(f)); } catch (e: any) { toast.error(e.message); }
  };

  const send = async () => {
    if (!file) return toast.error('Adjunta el comprobante');
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      await api('/patient/payments', { method: 'POST', body: { appointmentId: appt.id, dataUrl, reference, amount: appt.price } });
      toast.success('Comprobante enviado a revisiÃ³n');
      onDone();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head"><div><h3>Subir comprobante</h3><p>{appt.therapist_name} Â· {dateMed(appt.date)} Â· {money(appt.price)}</p></div><button className="close-btn" onClick={onClose}>âœ•</button></div>
        <div className="modal-body">
          <div className="pay-box" style={{ marginBottom: 14 }}>
            <div className="pay-row"><span>Banco</span><strong>Banco Pichincha</strong></div>
            <div className="pay-row"><span>Cuenta de ahorros</span><strong>2204587610</strong></div>
            <div className="pay-row"><span>Titular</span><strong>Psyconova Bienestar S.A.S.</strong></div>
            <div className="pay-row"><span>Monto</span><strong>{money(appt.price)}</strong></div>
            <div className="pay-row"><span>Concepto</span><strong>{appt.code}</strong></div>
          </div>
          <Field label="Referencia o nÃºmero de transferencia (opcional)"><input className="input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ej. TRF-884512" /></Field>
          <div style={{ marginTop: 12 }}>
            {preview ? (
              <div className="upload-preview">
                <img src={preview} alt="Vista previa" />
                <div className="grow"><strong style={{ fontSize: 12.5 }}>{file?.name}</strong><div className="tiny muted">Listo para enviar</div></div>
                <button className="btn btn-sm btn-ghost" onClick={() => { setFile(null); setPreview(null); }}>Cambiar</button>
              </div>
            ) : (
              <label className="upload-zone" style={{ display: 'block' }}>
                <FileUp />
                <strong>Selecciona una foto o PDF</strong>
                <span>MÃ¡ximo 7 MB</span>
                <input type="file" accept="image/*,application/pdf" hidden onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
              </label>
            )}
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" onClick={send} disabled={busy}>{busy ? 'Enviandoâ€¦' : 'Enviar comprobante'} <ArrowRight /></button>
        </div>
      </div>
    </div>
  );
}


