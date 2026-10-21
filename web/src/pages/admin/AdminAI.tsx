import { useState } from 'react';
import { Sparkles, Bot, ShieldCheck, Send, Wrench, Terminal, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AdminPage } from '../../components/AdminLayout';
import { Badge, Loader, Field, useToast } from '../../lib/ui';
import { api } from '../../lib/api';

export default function AdminAI() {
  const toast = useToast();
  const [mode, setMode] = useState<'consult' | 'diagnose' | 'execute'>('consult');
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{ role: 'user' | 'ai'; text: string; meta?: any }[]>([]);

  const send = async () => {
    if (!prompt.trim()) return;
    const text = prompt.trim();
    setPrompt('');
    setHistory((h) => [...h, { role: 'user', text }]);
    setBusy(true);
    try {
      const res = await api('/admin-advanced/ai/assistant', { method: 'POST', body: { prompt: text, mode } });
      setHistory((h) => [...h, { role: 'ai', text: res.intentLabel || 'Respuesta del asistente', meta: res }]);
      if (res.action) toast.success('Asistente entregó una acción / lectura');
      if (res.blocked) toast.error(res.blocked);
    } catch (e: any) {
      setHistory((h) => [...h, { role: 'ai', text: 'Error: ' + (e.message || 'No se conectó con el asistente') }]);
      toast.error('Asistente no disponible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminPage title="Asistente administrativo" subtitle="Consultar, diagnosticar y ejecutar acciones con validación de permisos">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {(['consult','diagnose','execute'] as const).map((m) => (
              <button key={m} className={`btn btn-sm ${mode === m ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode(m)}>
                {m === 'consult' ? 'Consultar' : m === 'diagnose' ? 'Diagnosticar' : 'Ejecutar'}
              </button>
            ))}
          </div>
          <div style={{ background: '#f6f1e6', borderRadius: 12, padding: 16, minHeight: 260 }}>
            {history.length === 0 && <div className="small muted">Escribe algo como: "clientes con inasistencias", "revisa política de asistencia", "genera informe".</div>}
            {history.map((h, i) => (
              <div key={i} style={{ marginBottom: 10, padding: 10, borderRadius: 8, background: h.role === 'user' ? '#fff' : '#eae3cc' }}>
                <strong style={{ fontSize: 11, color: h.role === 'user' ? '#c0603c' : '#0F3B33' }}>{h.role === 'user' ? 'Tú' : 'Asistente'}</strong>
                <div style={{ marginTop: 4 }}>{h.text}</div>
                {h.meta && <div className="tiny muted" style={{ marginTop: 6 }}>{JSON.stringify({ mode: h.meta.mode, allowed: h.meta.allowed, confidence: h.meta.confidence, intent: h.meta.intent })}</div>}
                {h.meta?.action && (
                  <div style={{ marginTop: 6, padding: 8, background: '#fff', borderRadius: 6, border: '1px solid #ddd' }}>
                    <strong>Acción propuesta</strong>: {h.meta.action.type || '—'}
                    {h.meta.action.requiredFields && <div className="tiny">Campos requeridos: {h.meta.action.requiredFields.join(', ')}</div>}
                  </div>
                )}
              </div>
            ))}
            {busy && <Loader />}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input className="input" style={{ flex: 1 }} placeholder="Ej. muéstrame pacientes con inasistencias..." value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
            <button className="btn" disabled={busy} onClick={send}><Send /> Enviar</button>
          </div>
        </div>

        <aside style={{ borderLeft: '1px solid #ddd', paddingLeft: 12 }}>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>Herramientas disponibles</h3>
          <ul className="small" style={{ paddingLeft: 14, marginBottom: 12 }}>
            <li>Consultar políticas de asistencia</li>
            <li>Aplicar restricciones a pacientes</li>
            <li>Desactivar / anonimizar ficha</li>
            <li>Consultar historial de paciente</li>
            <li>Generar informes operativos</li>
            <li>Revisar roles y permisos</li>
            <li>Revisar automatizaciones</li>
          </ul>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>Seguridad</h3>
          <p className="small muted">
            Cada acción propuesta valida los permisos del usuario antes de ejecutarse. No se ejecuta SQL ni comandos del sistema. Todo queda registrado en auditoría y se requiere razón para acciones sensibles.
          </p>
        </aside>
      </div>
    </AdminPage>
  );
}
