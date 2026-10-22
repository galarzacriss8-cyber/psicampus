import { useState } from 'react';
import { LogOut, Plus, FileText, Clock, Trash2 } from 'lucide-react';
import { api, fileToDataUrl } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Loader, useFetch, useToast } from '../../lib/ui';
import { dateMed, dateShort } from '../../lib/format';

export function TherapistPanel() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch<any>(() => api('/therapist/overview'), []);
  const [tab, setTab] = useState('notas');
  if (loading && !data) return <Loader />;
  if (error || !data) return <Loader />;
  const t = data.therapist || {};
  const patients = data.patients || [];
  const notes = data.notes || [];
  const todayAppts = data.today || [];
  const [showNoteForm, setShowNoteForm] = useState(true);
  const [noteForm, setNoteForm] = useState({ patientId: '', content: '', mood: 'estable' });
  const [savingNote, setSavingNote] = useState(false);

  const saveNote = async () => {
    if (!noteForm.patientId) return toast.error('Selecciona un paciente');
    if (!noteForm.content.trim()) return toast.error('Contenido vacío');
    setSavingNote(true);
    try { await api('/therapist/notes', { method: 'POST', body: noteForm }); toast.success('Nota guardada'); setNoteForm({ patientId: '', content: '', mood: 'estable' }); reload(); } catch (e: any) { toast.error(e.message); }
    setSavingNote(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f1e8', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: '#171c24', margin: 0 }}>Panel del terapeuta</h1>
          <p style={{ margin: 4, color: '#555' }}>{t.name || user?.name || '—'} · {t.university || ''} · {t.modality || 'presencial'}</p>
        </div>
        <button onClick={() => logout()} style={{ background: '#171c24', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Salir</button>
      </header>

      <nav style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['hoy','perfil','horarios','notas','informes'].map(s => (
          <button key={s} onClick={() => setTab(s)} style={{ padding: '8px 16px', borderRadius: 20, border: '1px solid #171c24', background: tab === s ? '#171c24' : '#fff', color: tab === s ? '#fff' : '#171c24', cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>{s === 'hoy' ? 'Hoy' : s === 'perfil' ? 'Perfil' : s === 'horarios' ? 'Horarios' : s === 'notas' ? 'Notas' : 'Informes'}</button>
        ))}
      </nav>

      <section style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 2px 12px rgba(15,59,51,0.06)' }}>
        {tab === 'hoy' && (
          <div>
            <h2 style={{ marginTop: 0, fontFamily: 'Georgia, serif' }}>Sesiones de hoy</h2>
            {todayAppts.length === 0 ? <p>No hay sesiones hoy.</p> : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {todayAppts.map((a: any) => (
                  <li key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span><strong>{a.time}</strong> — {a.patient_name || 'Paciente'} ({a.type || 'presencial'})</span>
                    <span style={{ color: '#0F3B33', fontWeight: 600, fontSize: 13 }}>{a.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'perfil' && (
          <form onSubmit={async (e) => { e.preventDefault(); try { await api('/therapist/profile', { method: 'PATCH', body: profileState }); toast.success('Perfil actualizado'); reload(); } catch (err: any) { toast.error(err.message); } }}>
            <h2 style={{ marginTop: 0, fontFamily: 'Georgia, serif' }}>Perfil profesional</h2>
            <ProfileForm t={t} />
          </form>
        )}

        {tab === 'horarios' && (
          <div>
            <h2 style={{ marginTop: 0, fontFamily: 'Georgia, serif' }}>Horarios</h2>
            <p>Horarios configurados para sesiones.</p>
          </div>
        )}

        {tab === 'notas' && (
          <div>
            <h2 style={{ marginTop: 0, fontFamily: 'Georgia, serif' }}>Notas clínicas por paciente y fecha</h2>
            <button onClick={() => setShowNoteForm(s => !s)} style={{ marginBottom: 16, padding: '8px 16px', border: '1px solid #171c24', borderRadius: 8, background: '#fff', cursor: 'pointer', fontWeight: 500 }}><Plus size={14} /> {showNoteForm ? 'Ocultar formulario' : 'Nueva nota'}</button>

            {showNoteForm && (
              <div style={{ background: '#f6f1e8', padding: 20, borderRadius: 12, marginBottom: 20 }}>
                <h3 style={{ marginTop: 0, fontFamily: 'Georgia, serif', fontSize: 18 }}>Escribir nota</h3>
                <label style={{ display: 'block', marginBottom: 8 }}>Paciente
                  <select value={noteForm.patientId} onChange={e => setNoteForm(f => ({ ...f, patientId: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', marginTop: 4, fontSize: 14 }}>
                    <option value="">-- Selecciona paciente --</option>
                    {(patients || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
                <label style={{ display: 'block', marginBottom: 8 }}>Contenido de la nota
                  <textarea value={noteForm.content} onChange={e => setNoteForm(f => ({ ...f, content: e.target.value }))} rows={4} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 14 }} />
                </label>
                <button onClick={saveNote} disabled={savingNote} style={{ padding: '10px 24px', background: '#0F3B33', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>{savingNote ? 'Guardando...' : 'Guardar nota'}</button>
              </div>
            )}

            <h3 style={{ marginTop: 8, fontFamily: 'Georgia, serif', fontSize: 16 }}>Notas recientes</h3>
            {(notes || []).length === 0 ? <p>No hay notas registradas.</p> : (
              <div style={{ display: 'grid', gap: 12 }}>
                {(notes || []).map((n: any) => (
                  <div key={n.id} style={{ padding: 14, background: '#faf8f2', borderRadius: 10, border: '1px solid #eee' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#555', marginBottom: 4 }}>
                      <strong style={{ color: '#171c24' }}>{n.patient_name || '—'}</strong>
                      <span>{dateMed(n.created_at)}</span>
                    </div>
                    <p style={{ margin: 0, lineHeight: 1.5 }}>{n.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'informes' && (
          <div>
            <h2 style={{ marginTop: 0, fontFamily: 'Georgia, serif' }}>Informes clínicos (formato predeterminado)</h2>
            <p>Selecciona un paciente para generar el informe con historia, evolución, evaluación y plan.</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {(patients || []).map((p: any) => (
                <button key={p.id} onClick={() => alert('Informe clínico generado para: ' + p.name + '\nFormato: historia, evolución, evaluación, recomendaciones, plan.')}
                  style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #171c24', background: '#fff', cursor: 'pointer', textAlign: 'left', fontWeight: 500 }}>
                  <FileText size={14} /> {p.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ProfileForm({ t }: { t: any }) {
  const [photoData, setPhotoData] = useState<string | null>(t.photo || null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const handleSave = async () => {
    setSaving(true);
    try { await api('/therapist/profile', { method: 'PATCH', body: { photo: photoData || undefined } }); toast.success('Foto guardada'); } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };
  return (
    <div>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <label style={{ display: 'block' }}>Nombre completo<input defaultValue={t.name || ''} disabled style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', marginTop: 4 }} /></label>
        <label style={{ display: 'block' }}>Universidad<input defaultValue={t.university || ''} disabled style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', marginTop: 4 }} /></label>
        <label style={{ display: 'block' }}>Título<input defaultValue={t.degree || ''} disabled style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', marginTop: 4 }} /></label>
        <label style={{ display: 'block' }}>Modalidad<input defaultValue={t.modality || 'presencial'} disabled style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', background: '#eee', marginTop: 4 }} /></label>
        <label style={{ display: 'block' }}>Idiomas<input defaultValue={t.languages || ''} disabled style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', marginTop: 4 }} /></label>
        <label style={{ display: 'block' }}>Años<input defaultValue={t.years || ''} disabled style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', marginTop: 4 }} /></label>
      </div>
      <div style={{ marginTop: 12 }}>
        <label>Foto de perfil</label><br />
        <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { try { const d = await fileToDataUrl(f); setPhotoData(d); } catch (err) { console.error(err); } } }} style={{ marginTop: 4 }} />
        {photoData ? <div style={{ marginTop: 8 }}><img src={photoData} alt="perfil" style={{ maxWidth: 120, maxHeight: 120, borderRadius: 8, border: '1px solid #ccc' }} /></div> : null}
      </div>
      <button type="button" onClick={handleSave} disabled={saving} style={{ marginTop: 16, padding: '10px 24px', background: '#0F3B33', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>{saving ? 'Guardando...' : 'Guardar foto / cambios'}</button>
    </div>
  );
}
