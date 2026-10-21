import { useState } from 'react';
import { GraduationCap, ImagePlus, Pencil, Plus, Star, Stethoscope, Trash2, Users, Wallet } from 'lucide-react';
import { api, apiUpload, fileToDataUrl } from '../../lib/api';
import { AdminPage } from '../../components/AdminLayout';
import { Avatar, Badge, ErrorState, Field, Loader, Modal, useFetch, useToast } from '../../lib/ui';
import { money } from '../../lib/format';

export function AdminTherapists() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch<any[]>(() => api('/admin/therapists'), []);
  const [edit, setEdit] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  const remove = async (t: any) => {
    if (!window.confirm(`Eliminar a ${t.name} permanentemente?`)) return;
    await api(`/admin/therapists/${t.id}`, { method: 'DELETE' });
    toast.success('Terapeuta eliminado');
    reload();
  };

  if (loading && !data) return <Loader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <AdminPage
      title="Terapeutas"
      subtitle="Perfiles públicos, especialidades, tarifas y cuentas de acceso."
      actions={<button className="btn btn-sm" onClick={() => setCreating(true)}><Plus /> Agregar terapeuta</button>}
    >
      <div className="grid-3">
        {(data || []).map((t) => (
          <div className="panel" key={t.id} style={{ opacity: t.active ? 1 : 0.6 }}>
            <div style={{ display: 'flex', gap: 14, padding: 16, alignItems: 'center' }}>
              <Avatar src={t.photo} name={t.name} size="lg" />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="hstack" style={{ gap: 5 }}>
                  <strong style={{ fontSize: 14.5 }}>{t.name}</strong>
                  {t.featured ? <Star style={{ width: 13, height: 13, color: 'var(--gold)', fill: 'var(--gold)' }} /> : null}
                </div>
                <div className="tiny muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.degree}</div>
                <div className="hstack" style={{ gap: 4, marginTop: 5 }}>
                  <Badge tone={t.active ? 'success' : 'warning'}>{t.active ? 'Activo' : 'Inactivo'}</Badge>
                  <Badge tone="sage" dot={false}>{t.gender === 'femenino' ? 'Mujer' : 'Hombre'}</Badge>
                  <Badge tone="sage" dot={false}>{t.age} años</Badge>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="icon-btn" onClick={() => setEdit(t)} title="Editar"><Pencil /></button>
                <button className="icon-btn" title="Eliminar" onClick={() => remove(t)} style={{ color: '#c0392b' }}><Trash2 /></button>
              </div>
            </div>
            <div style={{ padding: '0 16px 14px' }}>
              <div className="tiny muted" style={{ marginBottom: 8, minHeight: 32 }}>{t.university}</div>
              <div className="chip-list" style={{ marginBottom: 12 }}>
                {t.approaches.slice(0, 2).map((a: string) => <span className="tag" key={a}>{a}</span>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                <div><div className="mini-label">Pacientes</div><strong style={{ fontSize: 13 }}>{t.patients}</strong></div>
                <div><div className="mini-label">Sesiones</div><strong style={{ fontSize: 13 }}>{t.completed}</strong></div>
                <div><div className="mini-label">Ingresos</div><strong style={{ fontSize: 13 }}>{money(t.income)}</strong></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(edit || creating) && (
        <TherapistModal
          therapist={edit}
          onClose={() => { setEdit(null); setCreating(false); }}
          onSaved={() => { setEdit(null); setCreating(false); reload(); }}
        />
      )}
    </AdminPage>
  );
}

function TherapistModal({ therapist, onClose, onSaved }: { therapist: any; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<any>({
    name: therapist?.name || '', gender: therapist?.gender || 'femenino', birthdate: therapist?.birthdate || '',
    university: therapist?.university || '', degree: therapist?.degree || '', approaches: (therapist?.approaches || []).join(', '),
    description: therapist?.description || '', photo: therapist?.photo || '', priceBase: therapist?.price_base ?? 20,
    modality: therapist?.modality || 'ambas', languages: therapist?.languages || 'Español', license: therapist?.license || '',
    room: therapist?.room || '', years: therapist?.years ?? 0, active: therapist?.active ?? 1, featured: therapist?.featured ?? 0,
    email: '', password: '',
  });

  const upload = async (file: File) => {
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await apiUpload(dataUrl);
      setForm((f: any) => ({ ...f, photo: res.url }));
      toast.success('Foto cargada');
    } catch (e: any) { toast.error(e.message); }
  };

  const save = async () => {
    if (!form.name) return toast.error('El nombre es obligatorio');
    setBusy(true);
    try {
      const body = {
        ...form, approaches: form.approaches.split(',').map((s: string) => s.trim()).filter(Boolean),
        priceBase: Number(form.priceBase), years: Number(form.years), featured: !!form.featured, active: !!form.active,
      };
      if (therapist) await api(`/admin/therapists/${therapist.id}`, { method: 'PATCH', body });
      else await api('/admin/therapists', { method: 'POST', body });
      toast.success(therapist ? 'Terapeuta actualizado' : 'Terapeuta creado');
      onSaved();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} size="wide" title={therapist ? `Editar ${therapist.name}` : 'Nuevo terapeuta'}
      subtitle="Este perfil se muestra en el sitio público y en el agendamiento."
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button></>}>
      <div className="photo-upload" style={{ marginBottom: 16 }}>
        <Avatar src={form.photo} name={form.name} size="lg" />
        <div>
          <label className="btn btn-sm btn-ghost" style={{ display: 'inline-flex' }}>
            <ImagePlus /> Cambiar foto
            <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
          <p className="tiny muted" style={{ margin: '6px 0 0' }}>JPG o PNG, rostro centrado. Se recorta en círculo.</p>
        </div>
      </div>
      <div className="form-grid">
        <Field label="Nombre completo" className="span-2"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Género">
          <select className="select" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option value="femenino">Femenino</option><option value="masculino">Masculino</option>
          </select>
        </Field>
        <Field label="Fecha de nacimiento"><input className="input" type="date" value={form.birthdate} onChange={(e) => setForm({ ...form, birthdate: e.target.value })} /></Field>
        <Field label="Universidad de graduación" className="span-2"><input className="input" value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} /></Field>
        <Field label="Título / formación" className="span-2"><input className="input" value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })} placeholder="Mgs. en Psicología Clínica" /></Field>
        <Field label="Enfoques (separados por coma)" className="span-2"><input className="input" value={form.approaches} onChange={(e) => setForm({ ...form, approaches: e.target.value })} placeholder="Terapia cognitivo-conductual, ACT, EMDR" /></Field>
        <Field label="Descripción para el sitio" className="span-2"><textarea className="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="Aporte base (USD)"><input className="input" type="number" value={form.priceBase} onChange={(e) => setForm({ ...form, priceBase: e.target.value })} /></Field>
        <Field label="Modalidad">
          <select className="select" value={form.modality} onChange={(e) => setForm({ ...form, modality: e.target.value })}>
            <option value="ambas">Presencial y virtual</option><option value="presencial">Solo presencial</option><option value="virtual">Solo virtual</option>
          </select>
        </Field>
        <Field label="Años de experiencia"><input className="input" type="number" value={form.years} onChange={(e) => setForm({ ...form, years: e.target.value })} /></Field>
        <Field label="Registro profesional"><input className="input" value={form.license} onChange={(e) => setForm({ ...form, license: e.target.value })} /></Field>
        <Field label="Consultorio / ubicación"><input className="input" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} /></Field>
        <Field label="Idiomas"><input className="input" value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} /></Field>
        {!therapist && (
          <>
            <Field label="Correo de acceso"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nombre@psicampus.ec" /></Field>
            <Field label="Contraseña temporal"><input className="input" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Psicampus2026!" /></Field>
          </>
        )}
        <Field label="Visibilidad">
          <div className="hstack">
            <label className="check"><input type="checkbox" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked ? 1 : 0 })} /> Activo</label>
            <label className="check"><input type="checkbox" checked={!!form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked ? 1 : 0 })} /> Destacado</label>
          </div>
        </Field>
      </div>
    </Modal>
  );
}
