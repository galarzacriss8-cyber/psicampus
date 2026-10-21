import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Info, Loader2, Search, X, Sparkles, Inbox } from 'lucide-react';
import { initials, money, STATUS, PAY_STATUS, FREQ } from './format';

/* ---------------------------------- toasts --------------------------------- */
type Toast = { id: number; kind: 'success' | 'error' | 'info'; text: string };
const ToastCtx = createContext<{ push: (kind: Toast['kind'], text: string) => void; success: (t: string) => void; error: (t: string) => void; info: (t: string) => void }>(null as any);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, kind, text }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4600);
  }, []);
  const value = {
    push,
    success: (t: string) => push('success', t),
    error: (t: string) => push('error', t),
    info: (t: string) => push('info', t),
  };
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toasts">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.kind === 'success' ? <CheckCircle2 /> : t.kind === 'error' ? <AlertCircle /> : <Info />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ---------------------------------- avatar --------------------------------- */
export function Avatar({ src, name, size = 'md', className = '' }: { src?: string | null; name?: string; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className={`avatar avatar-${size} ${className}`} title={name}>
      {src && !broken ? <img src={src} alt={name || ''} loading="lazy" onError={() => setBroken(true)} /> : <span>{initials(name || '?')}</span>}
    </span>
  );
}

/* ---------------------------------- badges --------------------------------- */
export function Badge({ children, tone = '', dot = true, className = '' }: { children: ReactNode; tone?: string; dot?: boolean; className?: string }) {
  return <span className={`badge ${tone ? `badge-${tone}` : ''} ${dot ? '' : 'no-dot'} ${className}`}>{children}</span>;
}
export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] || { label: status, tone: '' };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
export function PayBadge({ status }: { status: string }) {
  const s = PAY_STATUS[status] || { label: status, tone: '' };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
export function FreqBadge({ type }: { type: string }) {
  const s = FREQ[type] || { label: type, tone: '' };
  return <Badge tone={s.tone} dot={false}>{s.label}</Badge>;
}

/* ---------------------------------- fields --------------------------------- */
export function Field({ label, hint, children, className = '' }: { label?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`field ${className}`}>
      {label && <label>{label}</label>}
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Buscar…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="search">
      <Search />
      <input className="input input-sm" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

/* ---------------------------------- modal ---------------------------------- */
export function Modal({ open, onClose, title, subtitle, children, footer, size = '' }: { open: boolean; onClose: () => void; title?: string; subtitle?: string; children: ReactNode; footer?: ReactNode; size?: '' | 'wide' | 'xwide' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div>{title && <h3>{title}</h3>}{subtitle && <p>{subtitle}</p>}</div>
          <button className="close-btn" onClick={onClose} aria-label="Cerrar"><X /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------------------------------- drawer --------------------------------- */
export function Drawer({ open, onClose, title, subtitle, children, footer, wide = false }: { open: boolean; onClose: () => void; title?: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="overlay" onClick={onClose} />
      <aside className={`drawer ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true">
        <div className="drawer-head">
          <div>{typeof title === 'string' ? <h3>{title}</h3> : title}{subtitle && <p>{subtitle}</p>}</div>
          <button className="close-btn" onClick={onClose} aria-label="Cerrar"><X /></button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </aside>
    </>
  );
}

/* -------------------------------- feedback --------------------------------- */
export function Loader({ label }: { label?: string }) {
  return (
    <div className="loading-screen">
      <div className="center">
        <Loader2 className="spinner dark" style={{ width: 26, height: 26, margin: '0 auto 10px' }} />
        <div className="small muted">{label || 'Cargando…'}</div>
      </div>
    </div>
  );
}

export function Empty({ title, text, icon, action }: { title: string; text?: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      {icon || <Inbox />}
      <h4>{title}</h4>
      {text && <p>{text}</p>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="empty">
      <AlertCircle />
      <h4>Algo salió mal</h4>
      <p>{message}</p>
      {onRetry && <button className="btn btn-sm btn-ghost" style={{ marginTop: 14 }} onClick={onRetry}>Reintentar</button>}
    </div>
  );
}

/* -------------------------------- data hook -------------------------------- */
export function useFetch<T = any>(fn: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    ref.current()
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e?.message || 'Error de conexión'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, loading, error, reload: () => setTick((t) => t + 1), setData };
}

export function useDebounced<T>(value: T, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}

/* ---------------------------------- charts --------------------------------- */
export function BarChart({ data, height = 170 }: { data: { label: string; income: number; expense?: number }[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense || 0)));
  return (
    <div className="chart" style={{ height }}>
      {data.map((d) => (
        <div className="bar-col" key={d.label}>
          <div className="bar-stack">
            <div className="bar" style={{ height: `${Math.max(2, (d.income / max) * 100)}%` }} title={`Ingresos: ${money(d.income)}`} />
            {d.expense !== undefined && <div className="bar expense" style={{ height: `${Math.max(2, (d.expense / max) * 100)}%` }} title={`Egresos: ${money(d.expense)}`} />}
          </div>
          <span className="lbl">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Donut({ segments, size = 132, center }: { segments: { label: string; value: number; color: string }[]; size?: number; center?: ReactNode }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 44;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap">
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg className="donut" width={size} height={size} viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} stroke="rgba(20,35,31,.07)" />
          {segments.map((s) => {
            const len = (s.value / total) * c;
            const el = <circle key={s.label} cx="60" cy="60" r={r} stroke={s.color} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} strokeLinecap="butt" />;
            offset += len;
            return el;
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>{center}</div>
      </div>
      <div className="donut-legend">
        {segments.map((s) => (
          <div key={s.label}><i style={{ background: s.color }} />{s.label} <strong style={{ marginLeft: 'auto', paddingLeft: 8 }}>{s.value}</strong></div>
        ))}
      </div>
    </div>
  );
}

export function Progress({ value, max = 100, tone = '' }: { value: number; max?: number; tone?: string }) {
  const p = Math.min(100, Math.round((value / (max || 1)) * 100));
  return (
    <div className="bar-track" style={{ height: 7, borderRadius: 4, background: 'var(--cream-2)', overflow: 'hidden' }}>
      <i style={{ display: 'block', height: '100%', width: `${p}%`, background: tone || 'linear-gradient(90deg, var(--forest-2), var(--moss))', borderRadius: 4 }} />
    </div>
  );
}

export function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const toast = useToast();
  return (
    <button
      className="btn btn-sm btn-ghost"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); toast.success('Copiado al portapapeles'); }
        catch { toast.error('No se pudo copiar'); }
      }}
    >
      {label}
    </button>
  );
}

export function Steps({ current, steps }: { current: number; steps: string[] }) {
  return (
    <div className="stepper">
      {steps.map((s, i) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
          <div className={`st ${i === current ? 'on' : ''} ${i < current ? 'done' : ''}`}>
            <span className="n">{i < current ? '✓' : i + 1}</span>
            <span className="label">{s}</span>
          </div>
          {i < steps.length - 1 && <div className="bar" />}
        </div>
      ))}
    </div>
  );
}

export function MonthNav({ date, onChange }: { date: Date; onChange: (d: Date) => void }) {
  return (
    <div className="hstack">
      <button className="icon-btn" onClick={() => onChange(new Date(date.getFullYear(), date.getMonth() - 1, 1))}><ChevronLeft /></button>
      <strong style={{ minWidth: 132, textAlign: 'center', textTransform: 'capitalize', fontSize: 13 }}>{date.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })}</strong>
      <button className="icon-btn" onClick={() => onChange(new Date(date.getFullYear(), date.getMonth() + 1, 1))}><ChevronRight /></button>
    </div>
  );
}

export function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <span className="brand" style={dark ? { color: 'var(--paper)' } : undefined}>
      <svg className="brand-mark" viewBox="0 0 48 48" fill="none" aria-hidden>
        <rect width="48" height="48" rx="15" fill={dark ? '#F6F1E6' : '#0F3B33'} />
        <path d="M24 12c4.2 3.2 6.3 6.9 6.3 11.2 0 5.6-2.8 9.4-6.3 12.8-3.5-3.4-6.3-7.2-6.3-12.8C17.7 18.9 19.8 15.2 24 12Z" fill={dark ? '#0F3B33' : '#F6F1E6'} />
        <circle cx="24" cy="24" r="2.6" fill={dark ? '#F6F1E6' : '#0F3B33'} />
        <circle cx="35" cy="14" r="2.2" fill="#C0603C" />
      </svg>
      <span>
        Psicampus
        <small>Bienestar universitario</small>
      </span>
    </span>
  );
}

export function IconSpark() {
  return <Sparkles style={{ width: 15, height: 15 }} />;
}
