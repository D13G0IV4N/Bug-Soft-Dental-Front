import { useState, type CSSProperties, type FormEvent } from "react";
import styles from "./clinics.module.css";

import { deleteClinic, updateClinic } from "../../api/clinics";

type ClinicData = {
  id: number;
  name?: string;
  nombre?: string;
  address?: string;
  direccion?: string;
  phone?: string;
  email?: string;
  status?: boolean;
};

interface Props {
  clinic: ClinicData;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditClinicModal({ clinic, onClose, onUpdated }: Props) {
  const [form, setForm] = useState({
    name: clinic.name ?? clinic.nombre ?? "",
    address: clinic.address ?? clinic.direccion ?? "",
    phone: clinic.phone ?? "",
    email: clinic.email ?? "",
    status: clinic.status ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await updateClinic(clinic.id, form);
      onUpdated();
      onClose();
    } catch (err: any) {
      console.error("Update clinic error:", err?.response?.data || err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "No se pudo actualizar la clínica"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "¿Seguro que quieres eliminar esta clínica? Esta acción no se puede deshacer."
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      await deleteClinic(clinic.id);
      onUpdated();
      onClose();
    } catch (err: any) {
      console.error("Delete clinic error:", err?.response?.data || err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "No se pudo eliminar la clínica"
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
          maxWidth: 620,
          padding: 18,
          borderRadius: 14,
          background: "#0f172a",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: "white" }}>Editar clínica</h2>
            <p style={{ margin: "6px 0 0", opacity: 0.8, color: "white" }}>
              Actualiza la información o elimina la clínica.
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
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ color: "white", opacity: 0.9 }}>Nombre *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Clínica Dental Bug&Soft"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ color: "white", opacity: 0.9 }}>Teléfono</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="33 0000 0000"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ color: "white", opacity: 0.9 }}>Correo</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="clinica@correo.com"
                style={inputStyle}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ color: "white", opacity: 0.9 }}>Dirección</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Av. Algo 123, Guadalajara"
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.checked })}
              />
              <span style={{ color: "white", opacity: 0.9 }}>
                {form.status ? "Activa" : "Inactiva"}
              </span>
            </div>
          </div>

          {error && (
            <div
              style={{
                marginTop: 10,
                color: "#fecaca",
                fontSize: 14,
                background: "rgba(220,38,38,0.15)",
                border: "1px solid rgba(248,113,113,0.4)",
                borderRadius: 10,
                padding: "8px 10px",
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className={styles.btnGhost}
              onClick={handleDelete}
              disabled={loading}
              style={{ borderColor: "rgba(248,113,113,.7)", color: "#fecaca" }}
            >
              {loading ? "Procesando..." : "Eliminar"}
            </button>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={onClose}
                disabled={loading}
              >
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

const inputStyle: CSSProperties = {
  width: "100%",
  height: 42,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  padding: "0 12px",
  marginTop: 6,
  outline: "none",
};
