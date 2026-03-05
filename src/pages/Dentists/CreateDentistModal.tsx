import { useState } from "react";
import styles from "./dentists.module.css";

import { createDentist, type Dentist } from "../../api/dentists";

interface Props {
  clinicId: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateDentistModal({ clinicId, onClose, onCreated }: Props) {
  const [dentist, setDentist] = useState<Dentist>({
    name: "",
    email: "",
    password: "",
    phone: "",
    status: true,
    specialty: "",
    licenseNumber: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await createDentist(clinicId, dentist);
      onCreated();
      onClose();
    } catch (err: any) {
      console.error("Create dentist error:", err?.response?.data || err);
      setError(err?.response?.data?.message || err?.message || "No se pudo crear el dentista");
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
            <h2 style={{ margin: 0, fontSize: 20, color: "white" }}>Crear dentista</h2>
            <p style={{ margin: "6px 0 0", opacity: 0.8, color: "white" }}>
              Completa los datos para registrar el dentista.
            </p>
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
                value={dentist.name}
                onChange={(e) => setDentist({ ...dentist, name: e.target.value })}
                required
                placeholder="Dr. Carrillo Gama"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ color: "white", opacity: 0.9 }}>Teléfono</label>
              <input
                value={dentist.phone ?? ""}
                onChange={(e) => setDentist({ ...dentist, phone: e.target.value })}
                placeholder="3312345678"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ color: "white", opacity: 0.9 }}>Correo *</label>
              <input
                type="email"
                value={dentist.email ?? ""}
                onChange={(e) => setDentist({ ...dentist, email: e.target.value })}
                placeholder="correo@gmail.com"
                required
                style={inputStyle}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ color: "white", opacity: 0.9 }}>Contraseña *</label>
              <input
                type="password"
                value={dentist.password ?? ""}
                onChange={(e) => setDentist({ ...dentist, password: e.target.value })}
                placeholder="********"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ color: "white", opacity: 0.9 }}>Especialidad</label>
              <input
                value={dentist.specialty ?? ""}
                onChange={(e) => setDentist({ ...dentist, specialty: e.target.value })}
                placeholder="Ortodoncia / Endodoncia..."
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ color: "white", opacity: 0.9 }}>Número de licencia</label>
              <input
                value={dentist.licenseNumber ?? ""}
                onChange={(e) => setDentist({ ...dentist, licenseNumber: e.target.value })}
                placeholder="LIC-123456"
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={dentist.status ?? true}
                onChange={(e) => setDentist({ ...dentist, status: e.target.checked })}
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

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
            <button type="button" className={styles.btnGhost} onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={loading}>
              {loading ? "Creando..." : "Crear"}
            </button>
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