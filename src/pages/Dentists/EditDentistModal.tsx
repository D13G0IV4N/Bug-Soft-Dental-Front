import { useState } from "react";
import styles from "./dentists.module.css";

import { updateDentist, deleteDentist, type Dentist } from "../../api/dentists";

interface Props {
  clinicId: string;
  dentist: Dentist;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditDentistModal({ clinicId, dentist, onClose, onUpdated }: Props) {
  const [form, setForm] = useState<Dentist>({
    id: dentist.id,
    name: dentist.name ?? "",
    email: dentist.email ?? "",
    phone: dentist.phone ?? "",
    status: dentist.status ?? true,
    password: "", // opcional
    specialty: dentist.specialty ?? "",
    licenseNumber: dentist.licenseNumber ?? "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dentist.id) return;

    setLoading(true);
    setError("");

    try {
      await updateDentist(clinicId, dentist.id, form); // ✅ PATCH desde API
      onUpdated();
      onClose();
    } catch (err: any) {
      console.error("Update dentist error:", err?.response?.data || err);
      setError(err?.response?.data?.message || err?.message || "No se pudo actualizar el dentista");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!dentist.id) return;
    if (!window.confirm("¿Seguro que deseas eliminar este dentista?")) return;

    setLoading(true);
    setError("");

    try {
      await deleteDentist(clinicId, dentist.id);
      onUpdated();
      onClose();
    } catch (err: any) {
      console.error("Delete dentist error:", err?.response?.data || err);
      setError(err?.response?.data?.message || err?.message || "No se pudo eliminar el dentista");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className={styles.card}
        style={{
          width: "100%",
          maxWidth: 720,
          padding: 18,
          borderRadius: 14,
          background: "#0f172a",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: "white" }}>Editar dentista</h2>
            <p style={{ margin: "6px 0 0", opacity: 0.8, color: "white" }}>Clínica #{clinicId}</p>
          </div>

          <button className={styles.btnGhost} type="button" onClick={onClose} disabled={loading}>
            X
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ color: "white", opacity: 0.9 }}>Nombre *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ color: "white", opacity: 0.9 }}>Teléfono</label>
              <input
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ color: "white", opacity: 0.9 }}>Correo *</label>
              <input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                style={inputStyle}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ color: "white", opacity: 0.9 }}>Nueva contraseña (opcional)</label>
              <input
                type="password"
                value={form.password ?? ""}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="(deja vacío para no cambiar)"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ color: "white", opacity: 0.9 }}>Especialidad</label>
              <input
                value={form.specialty ?? ""}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ color: "white", opacity: 0.9 }}>Número de licencia</label>
              <input
                value={form.licenseNumber ?? ""}
                onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={form.status ?? true}
                onChange={(e) => setForm({ ...form, status: e.target.checked })}
              />
              <span style={{ color: "white", opacity: 0.9 }}>Activo</span>
            </div>
          </div>

          {error && (
            <div
              style={{
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.35)",
                padding: 10,
                borderRadius: 10,
                color: "white",
                marginTop: 12,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
            <button type="button" className={styles.btnGhost} onClick={handleDelete} disabled={loading}>
              Eliminar
            </button>

            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className={styles.btnGhost} onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                {loading ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  outline: "none",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  marginTop: 6,
};