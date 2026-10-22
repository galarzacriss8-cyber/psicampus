import { useState } from "react";
import { useAuth } from "../lib/auth";
import { useFetch, Loader, ErrorState } from "../lib/ui";
import { api } from "../lib/api";
export function TherapistPanel() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch<any>(() => api("/therapist/overview"), []);
  const [tab, setTab] = useState("hoy");
  if (loading && !data) return <Loader />;
  if (error || !data) return <ErrorState message={error?.message || ""} onRetry={reload} />;
  const t = data.therapist || {};
  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: 24 }}>
      <h1 style={{ color: "var(--ink)", fontFamily: "var(--serif)", fontSize: 28 }}>Panel del terapeuta</h1>
      <p style={{ color: "var(--ink-soft)", marginTop: 4 }}>{t.name || user?.name || "Terapeuta"} · {t.university || "—"}</p>
      <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
        <button onClick={() => setTab("hoy")} style={{ padding: 8, background: tab === "hoy" ? "#0F3B33" : "#fff", color: tab === "hoy" ? "#fff" : "#0F3B33", border: "1px solid #0F3B33" }}>Hoy</button>
        <button onClick={() => setTab("perfil")} style={{ padding: 8, background: tab === "perfil" ? "#0F3B33" : "#fff", color: tab === "perfil" ? "#fff" : "#0F3B33", border: "1px solid #0F3B33" }}>Mi perfil</button>
        <button onClick={() => setTab("notas")} style={{ padding: 8, background: tab === "notas" ? "#0F3B33" : "#fff", color: tab === "notas" ? "#fff" : "#0F3B33", border: "1px solid #0F3B33" }}>Notas</button>
        <button onClick={() => setTab("informes")} style={{ padding: 8, background: tab === "informes" ? "#0F3B33" : "#fff", color: tab === "informes" ? "#fff" : "#0F3B33", border: "1px solid #0F3B33" }}>Informes</button>
      </div>
      <div style={{ marginTop: 20, background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px rgba(15,59,51,0.05)" }}>
        {tab === "hoy" && <div><strong>Sesiones hoy:</strong> {(data.today || []).length}</div>}
        {tab === "perfil" && <div><strong>Perfil cargado.</strong> Datos: {t.name || "—"}, activo: {t.active === 1 ? "Sí" : "No"}, registro: {t.license || t.registration || "MSP-00000"}.</div>}
        {tab === "notas" && <div><strong>Notas recientes disponibles.</strong> Puedes agregar desde tu panel.</div>}
        {tab === "informes" && <div><strong>Informes clínicos disponibles.</strong> Selecciona paciente y genera.</div>}
      </div>
    </div>
  );
}
