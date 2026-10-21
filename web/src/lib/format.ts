export const money = (n: number | string | null | undefined, opts: { decimals?: boolean; sign?: boolean } = {}) => {
  const v = Number(n || 0);
  const formatted = opts.decimals || !Number.isInteger(v) ? v.toFixed(2) : String(v);
  return `${opts.sign && v > 0 ? '+' : ''}$${formatted}`;
};

export const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

export const dateLong = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? iso + 'T12:00:00' : iso);
  return d.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

export const dateShort = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? iso + 'T12:00:00' : iso);
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const dateMed = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? iso + 'T12:00:00' : iso);
  return d.toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' });
};

export const dayNumber = (iso: string) => new Date(iso + 'T12:00:00').getDate();
export const monthShort = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('es-EC', { month: 'short' }).replace('.', '');

export const time12 = (t?: string | null) => {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
};

export const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const startOfWeek = (iso: string) => {
  const d = new Date(iso + 'T12:00:00');
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const monthTitle = (date: Date) => date.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' });

export const monthMatrix = (date: Date) => {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - startOffset);
  const days: { date: string; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ date: iso, inMonth: d.getMonth() === date.getMonth() });
  }
  return days;
};

export const STATUS: Record<string, { label: string; tone: string }> = {
  pendiente: { label: 'Pendiente', tone: 'warning' },
  confirmada: { label: 'Confirmada', tone: 'info' },
  completada: { label: 'Completada', tone: 'success' },
  cancelada: { label: 'Cancelada', tone: 'danger' },
  no_asistio: { label: 'No asistió', tone: 'danger' },
};

export const PAY_STATUS: Record<string, { label: string; tone: string }> = {
  pendiente: { label: 'Sin pago', tone: 'warning' },
  en_revision: { label: 'En revisión', tone: 'info' },
  pagado: { label: 'Pagado', tone: 'success' },
  rechazado: { label: 'Rechazado', tone: 'danger' },
  verificado: { label: 'Verificado', tone: 'success' },
};

export const FREQ: Record<string, { label: string; tone: string; help: string }> = {
  frecuente: { label: 'Frecuente', tone: 'success', help: '4 o más sesiones en el periodo' },
  ocasional: { label: 'Ocasional', tone: 'info', help: 'Entre 1 y 3 sesiones' },
  inactivo: { label: 'No frecuente', tone: 'warning', help: 'Sin sesiones recientes' },
  nuevo: { label: 'Nuevo', tone: 'clay', help: 'Aún sin sesiones completadas' },
};

export const MODALITY: Record<string, string> = { presencial: 'Presencial', virtual: 'Virtual' };

export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export const pct = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);

export const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
