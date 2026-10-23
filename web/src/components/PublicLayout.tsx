import { useEffect, useState, type ReactNode } from 'react';
import { ArrowUpRight, Menu, X, AtSign, Mail, MapPin, Phone, Clock, ShieldCheck, Moon, Sun } from 'lucide-react';
import { Link, useRouter } from '../lib/router';
import { useSite } from '../lib/site';
import { Brand } from '../lib/ui';

const SECTIONS = [
  { label: 'Inicio', key: 'inicio' },
  { label: 'Equipo', key: 'equipo', to: '/terapeutas' },
  { label: 'Programa', key: 'programa', to: '/encuesta' },
  { label: 'Tarifas', key: 'tarifas' },
  { label: 'Preguntas', key: 'faq' },
];

export function PublicLayout({ children }: { children: ReactNode }) {
  const { path, navigate } = useRouter();
  const { data } = useSite();
  const contact = data?.settings?.contact || {};
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(() => typeof window !== 'undefined' ? document.body.classList.contains('dark-mode') : false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleDark = () => {
    const d = !dark;
    setDark(d);
    document.body.classList.toggle('dark-mode', d);
    if (typeof window !== 'undefined') localStorage.setItem('dark', d ? '1' : '0');
  };

  const goSection = (key: string) => {
    setOpen(false);
    if (path !== '/') {
      navigate('/');
      setTimeout(() => document.getElementById(key)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 160);
    } else {
      document.getElementById(key)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      <header className={`site-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="container site-nav">
          <Link to="/" onClick={() => setOpen(false)} aria-label="Psyconova inicio">
            <Brand />
          </Link>
          <nav className={`nav-links ${open ? 'open' : ''}`} aria-label="Principal">
            {SECTIONS.map((s) =>
              s.to ? (
                <Link key={s.key} to={s.to} onClick={() => setOpen(false)} className={path.startsWith(s.to) ? 'active' : ''}>{s.label}</Link>
              ) : (
                <a key={s.key} href={`#${s.key}`} onClick={(e) => { e.preventDefault(); goSection(s.key); }}>{s.label}</a>
              )
            )}
            <Link to="/seguimiento" onClick={() => setOpen(false)} className={path.startsWith('/seguimiento') ? 'active' : ''}>Mi reserva</Link>
          </nav>
          <div className="nav-actions">
            <Link className="btn btn-sm" to="/trabaja-con-nosotros">Ingresar</Link>
            <Link className="btn btn-sm" to="/agendar">Agendar</Link>
            <button className="icon-btn" onClick={toggleDark} aria-label="Modo oscuro" title="Modo oscuro">
              {dark ? <Sun style={{ width: 18, height: 18 }} /> : <Moon style={{ width: 18, height: 18 }} />}
            </button>
            <button className="icon-btn menu-toggle" onClick={() => setOpen((v) => !v)} aria-label="Menú">
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="site-footer" id="contacto">
        <div className="container">
          <div className="footer-grid">
            <div>
              <Brand dark />
              <p className="footer-note">
                Consulta psicológica con tarifa social. Atención presencial en Quito y virtual en todo el país.
              </p>
              <div className="hstack" style={{ marginTop: 16 }}>
                <span className="badge badge-sage no-dot" style={{ background: 'rgba(255,255,255,.08)', color: '#dce8d6' }}>
                  <ShieldCheck style={{ width: 13, height: 13 }} /> Confidencialidad garantizada
                </span>
              </div>
            </div>
            <div>
              <h4>Plataforma</h4>
              <Link to="/terapeutas">Nuestro equipo</Link>
              <Link to="/agendar">Agendar una cita</Link>
              <Link to="/encuesta">Encuesta de tarifa</Link>
              <Link to="/seguimiento">Estado de mi reserva</Link>
              <Link to="/login">Portal de pacientes</Link>
            </div>
            <div>
              <h4>Programa</h4>
              <a href="#tarifas" onClick={(e) => { e.preventDefault(); goSection('tarifas'); }}>Tarifa social</a>
              <a href="#faq" onClick={(e) => { e.preventDefault(); goSection('faq'); }}>Preguntas frecuentes</a>
              <a href="#programa" onClick={(e) => { e.preventDefault(); goSection('programa'); }}>Cómo funciona</a>
              <Link to="/trabaja-con-nosotros">Trabaja con nosotros</Link>
              <Link to="/login">Acceso terapeutas</Link>
              <a href={`https://wa.me/${contact.whatsapp || ''}`} target="_blank" rel="noreferrer">WhatsApp</a>
            </div>
            <div>
              <h4>Contacto</h4>
              <a href={`tel:${contact.phone || ''}`}><Phone style={{ width: 13, height: 13, display: 'inline', marginRight: 6 }} />Contacto {contact.phone}</a>
              <a href={`mailto:${contact.email || ''}`}><Mail style={{ width: 13, height: 13, display: 'inline', marginRight: 6 }} />{contact.email}</a>
              <span style={{ display: 'flex', gap: 6, fontSize: 13, padding: '5px 0' }}><MapPin style={{ width: 14, height: 14, flex: 'none' }} />{contact.address}</span>
              <span style={{ display: 'flex', gap: 6, fontSize: 13, padding: '5px 0' }}><Clock style={{ width: 14, height: 14, flex: 'none' }} />{contact.hours}</span>
              <a href="https://www.instagram.com/psyconova.ec" target="_blank" rel="noreferrer"><AtSign style={{ width: 13, height: 13, display: 'inline', marginRight: 6 }} />@psyconova.ec</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Psyconova · Bienestar psicológico. Todos los derechos reservados.</span>
            <span>Hecho para toda la comunidad · Quito, Ecuador</span>
          </div>
        </div>
      </footer>
    </>
  );
}


