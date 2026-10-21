import { GraduationCap, MapPin, ArrowUpRight, BadgeCheck } from 'lucide-react';
import { Badge } from '../lib/ui';
import { money } from '../lib/format';

export function TherapistCard({ t, onOpen }: { t: any; onOpen: () => void }) {
  return (
    <article className="therapist-card">
      <div className="therapist-photo">
        <img src={t.photo} alt={t.name} loading="lazy" />
        <Badge tone="forest" dot={false}>{t.gender === 'femenino' ? 'Terapeuta mujer' : 'Terapeuta hombre'}</Badge>
        <span className="price">Aporte desde {money(t.price_base)}</span>
      </div>
      <div className="therapist-body">
        <div>
          <h3>{t.name}</h3>
          <div className="degree">{t.degree}</div>
        </div>
        <div className="uni"><GraduationCap /> {t.university}</div>
        <div className="therapist-tags">
          {t.approaches.slice(0, 3).map((a: string) => <span className="tag" key={a}>{a}</span>)}
        </div>
        <div className="therapist-foot">
          <div className="meta">
            <span>{t.age} años</span>
            <span>{t.years} años de experiencia</span>
          </div>
          <button className="btn btn-sm btn-soft" onClick={onOpen}>Ver perfil <ArrowUpRight /></button>
        </div>
      </div>
    </article>
  );
}

export function TherapistModal({ t, open, onClose, onBook }: { t: any | null; open: boolean; onClose: () => void; onBook: (id: string) => void }) {
  if (!t) return null;
  return (
    <div className={`modal-overlay ${open ? '' : 'hidden'}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal wide">
        <div className="modal-head">
          <div><h3>{t.name}</h3><p>{t.degree}</p></div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: 22, alignItems: 'start' }} className="profile-modal-grid">
            <div style={{ borderRadius: 100, overflow: 'hidden', aspectRatio: '4/4.6', background: 'var(--sand)' }}>
              <img src={t.photo} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 18%' }} />
            </div>
            <div>
              <div className="hstack" style={{ gap: 6 }}>
                <Badge tone="sage" dot={false}>{t.gender === 'femenino' ? 'Mujer' : 'Hombre'}</Badge>
                <Badge tone="forest" dot={false}>{t.age} años</Badge>
                <Badge tone="sage" dot={false}>{t.modality === 'ambas' ? 'Presencial y virtual' : t.modality === 'virtual' ? 'Virtual' : 'Presencial'}</Badge>
              </div>
              <p style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--ink-soft)', marginTop: 14 }}>{t.description}</p>
              <div className="detail-list" style={{ marginTop: 8 }}>
                <div className="detail-row"><span>Universidad</span><strong>{t.university}</strong></div>
                <div className="detail-row"><span>Formación</span><strong>{t.degree}</strong></div>
                <div className="detail-row"><span>Experiencia</span><strong>{t.years} años</strong></div>
                <div className="detail-row"><span>Registro profesional</span><strong>{t.license || '—'}</strong></div>
                <div className="detail-row"><span>Idiomas</span><strong>{t.languages}</strong></div>
                <div className="detail-row"><span>Enfoques</span><strong style={{ maxWidth: 240 }}>{t.approaches.join(' · ')}</strong></div>
              </div>
              <div className="notice" style={{ marginTop: 14 }}>
                <BadgeCheck />
                <span>Terapeuta acreditado y bajo supervisión clínica del programa. Puedes cambiar de profesional cuando lo necesites.</span>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
          <button className="btn" onClick={() => onBook(t.id)}>Agendar con {t.name.split(' ')[0]} <ArrowUpRight /></button>
        </div>
      </div>
    </div>
  );
}
