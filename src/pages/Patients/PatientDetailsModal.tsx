import styles from "../Dentists/dentists.module.css";
import formStyles from "../../styles/formSystem.module.css";
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
    <div className={formStyles.modalOverlay} onClick={onClose}>
      <div className={formStyles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={formStyles.modalHeader}>
          <div>
            <h2 className={formStyles.modalTitle}>{patient.name || "Paciente"}</h2>
            <p className={formStyles.modalText}>Detalle administrativo del paciente.</p>
          </div>
          <button className={styles.btnGhost} type="button" onClick={onClose}>Cerrar</button>
        </div>

        <div className={formStyles.modalBody}>
          <div className={formStyles.formGrid}>
            <label className={formStyles.field}>Correo<input className={formStyles.control} value={patient.email || "-"} readOnly /></label>
            <label className={formStyles.field}>Teléfono<input className={formStyles.control} value={patient.phone || "-"} readOnly /></label>
            <label className={formStyles.field}>Estado<input className={formStyles.control} value={patient.status === false ? "Inactivo" : "Activo"} readOnly /></label>
            <label className={formStyles.field}>Fecha de nacimiento<input className={formStyles.control} value={formatDate(patient.profile.birth_date)} readOnly /></label>
            <label className={formStyles.field}>Género<input className={formStyles.control} value={patient.profile.gender || "-"} readOnly /></label>
            <label className={`${formStyles.field} ${formStyles.fieldFull}`}>Dirección<textarea className={formStyles.control} value={patient.profile.address || "-"} readOnly /></label>
            <label className={`${formStyles.field} ${formStyles.fieldFull}`}>Alergias<textarea className={formStyles.control} value={patient.profile.allergies || "-"} readOnly /></label>
            <label className={`${formStyles.field} ${formStyles.fieldFull}`}>Notas<textarea className={formStyles.control} value={patient.profile.notes || "-"} readOnly /></label>
          </div>
        </div>
      </div>
    </div>
  );
}
