import styles from "./dentists.module.css";
import type { Dentist } from "../../api/dentists";

interface Props {
  clinicId: string;
  dentist: Dentist;
  onClose: () => void;
}

export default function DentistDetailsModal({ clinicId, dentist, onClose }: Props) {
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
            <h2 style={{ margin: 0, fontSize: 20, color: "white" }}>
              Detalles del dentista
            </h2>
            <p style={{ margin: "6px 0 0", opacity: 0.8, color: "white" }}>
              Clínica #{clinicId}
            </p>
          </div>

          <button className={styles.btnGhost} type="button" onClick={onClose}>
            X
          </button>
        </div>

        <div style={{ marginTop: 16, color: "white", lineHeight: 1.8 }}>
          <div>
            <b>Nombre:</b> {dentist.name || "—"}
          </div>
          <div>
            <b>Correo:</b> {dentist.email || "—"}
          </div>
          <div>
            <b>Teléfono:</b> {dentist.phone || "—"}
          </div>
          <div>
            <b>Especialidad:</b> {dentist.specialty || "—"}
          </div>
          <div>
            <b>Número de licencia:</b> {dentist.licenseNumber || "—"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <b>Color:</b>
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.35)",
                background: dentist.color || "#2f86e6",
                display: "inline-block",
              }}
            />
            <span>{dentist.color || "#2f86e6"}</span>
          </div>
          <div>
            <b>Estado:</b> {dentist.status ? "Activo" : "Inactivo"}
          </div>
        </div>
      </div>
    </div>
  );
}