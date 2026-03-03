import { useState } from "react";
import styles from "./clinics.module.css";

import { createClinic } from "../../api/clinics";
import type { Clinic, ClinicAdmin } from "../../api/clinics";

interface Props {
  onClose: () => void;
  onCreated: () => void; // refrescar lista
}

export default function CreateClinicModal({ onClose, onCreated }: Props) {
  const [clinic, setClinic] = useState<Clinic>({
    name: "",
    address: "",
    phone: "",
    email: "",
    status: true,
  });

  const [admin, setAdmin] = useState<ClinicAdmin>({
    name: "",
    email: "",
    password: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await createClinic({ clinic, admin });
      onCreated();
      onClose();
    } catch (err: any) {
      console.error("Create clinic error:", err?.response?.data || err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "No se pudo crear la clínica"
      );
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
            <h2 style={{ margin: 0, fontSize: 20, color: "white" }}>Crear clínica</h2>
            <p style={{ margin: "6px 0 0", opacity: 0.8, color: "white" }}>
              Crea la clínica y su usuario administrador.
            </p>
          </div>

          <button
            className={styles.btnGhost}
            type="button"
            onClick={onClose}
            disabled={loading}
          >
            X
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          {/* ===== CLINICA ===== */}
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ margin: "0 0 10px", color: "white" }}>Datos de la clínica</h3>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ color: "white", opacity: 0.9 }}>Nombre *</label>
                <input
                  value={clinic.name}
                  onChange={(e) => setClinic({ ...clinic, name: e.target.value })}
                  required
                  placeholder="Clínica Dental Bug&Soft"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ color: "white", opacity: 0.9 }}>Teléfono</label>
                <input
                  value={clinic.phone ?? ""}
                  onChange={(e) => setClinic({ ...clinic, phone: e.target.value })}
                  placeholder="33 0000 0000"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ color: "white", opacity: 0.9 }}>Correo</label>
                <input
                  type="email"
                  value={clinic.email ?? ""}
                  onChange={(e) => setClinic({ ...clinic, email: e.target.value })}
                  placeholder="clinica@correo.com"
                  style={inputStyle}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ color: "white", opacity: 0.9 }}>Dirección</label>
                <input
                  value={clinic.address ?? ""}
                  onChange={(e) => setClinic({ ...clinic, address: e.target.value })}
                  placeholder="Av. Algo 123, Guadalajara"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={clinic.status ?? true}
                  onChange={(e) => setClinic({ ...clinic, status: e.target.checked })}
                />
                <span style={{ color: "white", opacity: 0.9 }}>Activa</span>
              </div>
            </div>
          </div>

          {/* ===== ADMIN ===== */}
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ margin: "0 0 10px", color: "white" }}>Administrador</h3>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ color: "white", opacity: 0.9 }}>Nombre *</label>
                <input
                  value={admin.name}
                  onChange={(e) => setAdmin({ ...admin, name: e.target.value })}
                  required
                  placeholder="Juan Pérez"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ color: "white", opacity: 0.9 }}>Correo *</label>
                <input
                  type="email"
                  value={admin.email}
                  onChange={(e) => setAdmin({ ...admin, email: e.target.value })}
                  required
                  placeholder="admin@correo.com"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ color: "white", opacity: 0.9 }}>Contraseña *</label>
                <input
                  type="password"
                  value={admin.password}
                  onChange={(e) => setAdmin({ ...admin, password: e.target.value })}
                  required
                  placeholder="********"
                  style={inputStyle}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ color: "white", opacity: 0.9 }}>Teléfono</label>
                <input
                  value={admin.phone ?? ""}
                  onChange={(e) => setAdmin({ ...admin, phone: e.target.value })}
                  placeholder="33 0000 0000"
                  style={inputStyle}
                />
              </div>
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
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={onClose}
              disabled={loading}
            >
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