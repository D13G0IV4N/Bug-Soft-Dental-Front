import styles from "../Dentists/dentists.module.css";
import type { Patient } from "../../api/patients";

interface Props {
  patient: Patient;
  onClose: () => void;
}

function formatDate(date?: string | null) {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("es-MX");
}

export default function PatientDetailsModal({ patient, onClose }: Props) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>{patient.name || "Paciente"}</h2>
            <p className={styles.modalText}>Detalle administrativo del paciente.</p>
          </div>
          <button className={styles.btnGhost} type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className={styles.formGrid}>
          <label>
            Correo
            <input className={styles.input} value={patient.email || "-"} readOnly />
          </label>
          <label>
            Teléfono
            <input className={styles.input} value={patient.phone || "-"} readOnly />
          </label>
          <label>
            Estado
            <input
              className={styles.input}
              value={patient.status === false ? "Inactivo" : "Activo"}
              readOnly
            />
          </label>
          <label>
            Fecha de nacimiento
            <input className={styles.input} value={formatDate(patient.profile.birth_date)} readOnly />
          </label>
          <label>
            Género
            <input className={styles.input} value={patient.profile.gender || "-"} readOnly />
          </label>
          <label className={styles.formFieldFull}>
            Dirección
            <textarea className={styles.input} value={patient.profile.address || "-"} readOnly />
          </label>
          <label className={styles.formFieldFull}>
            Alergias
            <textarea className={styles.input} value={patient.profile.allergies || "-"} readOnly />
          </label>
          <label className={styles.formFieldFull}>
            Notas
            <textarea className={styles.input} value={patient.profile.notes || "-"} readOnly />
          </label>
        </div>
      </div>
    </div>
  );
}
