import { useEffect, useState } from 'react';
import {
  ArrowRight, CalendarDays, CheckCircle2, Clock, Copy, FileUp, MapPin, Search, ShieldCheck, Upload, Video, Wallet,
} from 'lucide-react';
import { api, fileToDataUrl } from '../lib/api';
import { Link, useQuery } from '../lib/router';
import { Badge, Field, useToast, PayBadge, StatusBadge, Empty } from '../lib/ui';
import { dateLong, money, time12 } from '../lib/format';

export function Track() {
  const query = useQuery();
  const toast = useToast();
  const [code, setCode] = useState(query.get('code') || '');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (value?: string) => {
    const c = (value ?? code).trim().toUpperCase();
    if (!c) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api(`/public/bookings/${encodeURIComponent(c)}`);
      setResult(res);
    } catch (e: any) {
      setError(e.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (query.get('code')) search(query.get('code')!); }, []);

  const upload = async (file: File) => {
    try {
      const dataUrl = await fileToDataUrl(file);
      await api(`/public/bookings/${result.appointment.code}/receipt`, { method: 'POST', body: { dataUrl } });
      toast.success('Comprobante enviado. Lo validaremos pronto.');
      search(result.appointment.code);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const a = result?.appointment;
  const paid = a?.payment_status === 'pagado';
  const inReview = a?.payment_status === 'en_revision';

  return (
    <section className="track-shell container">
      <div className="center" style={{ marginBottom: 26 }}>
        <span className="eyebrow" style={{ justifyContent: 'center' }}>Seguimiento</span>
        <h1 className="display" style={{ fontSize: 'clamp(34px,4vw,48px)', marginTop: 12 }}>Estado de mi reserva</h1>
        <p className="muted" style={{ maxWidth: 480, margin: '8px auto 0' }}>Ingresa el código de 6 caracteres que recibiste al agendar. También puedes consultar y subir tu comprobante desde tu portal.</p>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 22 }}>
        <div className="row" style={{ gap: 10 }}>
          <div className="search" style={{ flex: 1 }}>
            <Search />
            <input
              className="input"
              placeholder="PC-ABC123"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}
            />
          </div>
          <button className="btn" onClick={() => search()} disabled={loading}>{loading ? 'Buscando…' : 'Consultar'} <ArrowRight /></button>
        </div>
        {error && <p className="small" style={{ color: 'var(--danger)', margin: '10px 0 0' }}>{error}</p>}
      </div>

      {result && a && (
        <div className="track-result animate-up">
          <div className="track-head">
            <div>
              <div className="tiny" style={{ opacity: 0.6, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Código de cita</div>
              <div className="code">{a.code}</div>
              <div className="small" style={{ opacity: 0.75, marginTop: 4 }}>{a.therapist_name} Â· {a.patient_name}</div>
            </div>
            <div className="stack-xs" style={{ alignItems: 'flex-end' }}>
              <Badge tone="sage" dot={false} style={{ background: 'rgba(255,255,255,.15)', color: '#fff' }}>{a.status === 'pendiente' ? 'Por confirmar' : a.status === 'confirmada' ? 'Confirmada' : a.status === 'completada' ? 'Completada' : a.status}</Badge>
              <span className="tiny" style={{ opacity: 0.6 }}>{dateLong(a.date)} Â· {time12(a.start)}</span>
            </div>
          </div>
          <div className="track-body">
            <div className="grid-2e" style={{ gap: 22 }}>
              <div>
                <h4 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>Detalle</h4>
                <div className="detail-list">
                  <div className="detail-row"><span>Fecha</span><strong>{dateLong(a.date)}</strong></div>
                  <div className="detail-row"><span>Hora</span><strong>{time12(a.start)} â€“ {time12(a.end)}</strong></div>
                  <div className="detail-row"><span>Modalidad</span><strong>{a.modality === 'virtual' ? 'Virtual' : 'Presencial'}</strong></div>
                  <div className="detail-row"><span>Terapeuta</span><strong>{a.therapist_name}</strong></div>
                  <div className="detail-row"><span>Aporte</span><strong>{money(a.price)}</strong></div>
                  <div className="detail-row"><span>Pago</span><strong>{paid ? 'Verificado' : inReview ? 'En revisiÃ³n' : 'Pendiente'}</strong></div>
                </div>
              </div>
              <div>
                <h4 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>Progreso</h4>
                <div className="timeline">
                  <div className="tl done"><span className="dot"><CheckCircle2 /></span><div><strong>Reserva creada</strong><span>{dateLong(a.created_at)}</span></div></div>
                  <div className={`tl ${(paid || inReview) ? 'done' : ''}`}><span className="dot">{paid ? <CheckCircle2 /> : <Upload />}</span><div><strong>{paid ? 'Pago verificado' : inReview ? 'Comprobante en revisiÃ³n' : 'Comprobante pendiente'}</strong><span>{paid ? 'Tu cita estÃ¡ pagada' : inReview ? 'AdministraciÃ³n lo validarÃ¡ en breve' : 'Sube tu comprobante para confirmar'}</span></div></div>
                  <div className={`tl ${['confirmada', 'completada'].includes(a.status) ? 'done' : ''}`}><span className="dot"><CalendarDays /></span><div><strong>Cita confirmada</strong><span>{['confirmada', 'completada'].includes(a.status) ? 'Nos vemos pronto' : 'Pendiente de confirmaciÃ³n'}</span></div></div>
                  <div className={`tl ${a.status === 'completada' ? 'done' : ''}`}><span className="dot"><ShieldCheck /></span><div><strong>SesiÃ³n realizada</strong><span>{a.status === 'completada' ? 'Proceso completado' : 'DespuÃ©s de tu sesiÃ³n'}</span></div></div>
                </div>
              </div>
            </div>

            {!paid && (
              <div className="form-section" style={{ marginTop: 22 }}>
                <h4>Datos para transferir</h4>
                <div className="pay-box">
                  <div className="pay-row"><span>Banco</span><strong>{result.bank.bankName}</strong></div>
                  <div className="pay-row"><span>Cuenta</span><strong>{result.bank.accountType} Â· {result.bank.accountNumber}</strong></div>
                  <div className="pay-row"><span>Titular</span><strong>{result.bank.holder}</strong></div>
                  <div className="pay-row"><span>Monto</span><strong>{money(a.price)}</strong></div>
                  <div className="pay-row"><span>Concepto</span><strong>{a.code}</strong></div>
                </div>
                {inReview ? (
                  <div className="notice notice-info" style={{ marginTop: 12 }}><Clock /><span>Tu comprobante estÃ¡ en revisiÃ³n. Te avisaremos cuando estÃ© validado.</span></div>
                ) : (
                  <label className="upload-zone" style={{ display: 'block', marginTop: 12 }}>
                    <FileUp />
                    <strong>Subir comprobante de pago</strong>
                    <span>JPG, PNG o PDF Â· mÃ¡ximo 7 MB</span>
                    <input type="file" accept="image/*,application/pdf" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                  </label>
                )}
              </div>
            )}

            <div className="hstack" style={{ marginTop: 20 }}>
              <Link className="btn" to="/portal">Ir a mi portal <ArrowRight /></Link>
              <Link className="btn btn-ghost" to="/agendar">Agendar otra sesiÃ³n</Link>
            </div>
          </div>
        </div>
      )}

      {!result && !error && (
        <div className="card" style={{ marginTop: 18 }}>
          <Empty icon={<Wallet />} title="Tu cÃ³digo estÃ¡ en el correo de confirmaciÃ³n" text="Tiene el formato PC-XXXXXX. Si lo perdiste, escrÃ­benos por WhatsApp con tu nombre y fecha de la cita." action={<a className="btn btn-sm btn-ghost" href="https://wa.me/593983465028" target="_blank" rel="noreferrer">Escribir por WhatsApp</a>} />
        </div>
      )}
    </section>
  );
}
