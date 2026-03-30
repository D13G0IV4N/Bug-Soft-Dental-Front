import styles from "../Dentists/dentists.module.css";
import formStyles from "../../styles/formSystem.module.css";
import type { Patient } from "../../api/patients";
import AppModal from "../../components/ui/AppModal";

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
    <AppModal
      open
      size="default"
      eyebrow="Ficha de paciente"
      title={patient.name || "Paciente"}
      subtitle="Detalle administrativo y clínico en formato de solo lectura."
      onClose={onClose}
      actions={(
        <div className={formStyles.formActions}>
          <button className={styles.btnGhost} type="button" onClick={onClose}>Cerrar</button>
        </div>
      )}
    >
      <div className={formStyles.formGrid}>
        <section className={formStyles.formSectionCard}>
          <p className={formStyles.sectionHeading}>Estado y contacto</p>
          <div className={formStyles.formSectionGrid}>
            <label className={formStyles.field}>Correo<input className={formStyles.control} value={patient.email || "-"} readOnly /></label>
            <label className={formStyles.field}>Teléfono<input className={formStyles.control} value={patient.phone || "-"} readOnly /></label>
            <label className={formStyles.field}>Estado<input className={formStyles.control} value={patient.status === false ? "Inactivo" : "Activo"} readOnly /></label>
            <label className={formStyles.field}>Fecha de nacimiento<input className={formStyles.control} value={formatDate(patient.profile.birth_date)} readOnly /></label>
            <label className={formStyles.field}>Género<input className={formStyles.control} value={patient.profile.gender || "-"} readOnly /></label>
          </div>
        </section>

        <section className={formStyles.formSectionCard}>
          <p className={formStyles.sectionHeading}>Notas clínicas</p>
          <div className={formStyles.formSectionGrid}>
            <label className={`${formStyles.field} ${formStyles.fieldFull}`}>Dirección<textarea className={formStyles.control} value={patient.profile.address || "-"} readOnly /></label>
            <label className={`${formStyles.field} ${formStyles.fieldFull}`}>Alergias<textarea className={formStyles.control} value={patient.profile.allergies || "-"} readOnly /></label>
            <label className={`${formStyles.field} ${formStyles.fieldFull}`}>Notas<textarea className={formStyles.control} value={patient.profile.notes || "-"} readOnly /></label>
          </div>
        </section>
      </div>
    </AppModal>
  );
}
