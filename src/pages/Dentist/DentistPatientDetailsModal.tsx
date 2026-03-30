import type { Appointment } from "../../api/appointments";
import type { Patient } from "../../api/patients";
import formStyles from "../../styles/formSystem.module.css";
import styles from "./dentist.module.css";

interface Props {
  patient: Patient;
  recentAppointments: Appointment[];
  onClose: () => void;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("es-MX", { dateStyle: "medium" });
}

function getAge(value?: string | null) {
  if (!value) return "-";
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return "-";

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasHadBirthday =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

  if (!hasHadBirthday) age -= 1;
  return age >= 0 ? `${age} años` : "-";
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

export default function DentistPatientDetailsModal({ patient, recentAppointments, onClose }: Props) {
  return (
    <div className={formStyles.modalOverlay} onClick={onClose}>
      <div className={`${formStyles.modalCard} ${styles.clinicalModal}`} onClick={(event) => event.stopPropagation()}>
        <div className={formStyles.modalHeader}>
          <div>
            <h2 className={formStyles.modalTitle}>{patient.name || "Paciente"}</h2>
            <p className={formStyles.modalText}>Ficha clínica y administrativa dentro del contexto del odontólogo autenticado.</p>
          </div>
          <button type="button" className={styles.btnGhost} onClick={onClose}>Cerrar</button>
        </div>

        <div className={formStyles.modalBody}>
          <div className={styles.sectionGrid}>
            <article className={styles.infoCard}><p className={styles.infoLabel}>Nombre completo</p><p className={styles.infoValue}>{patient.name || "-"}</p></article>
            <article className={styles.infoCard}><p className={styles.infoLabel}>Teléfono</p><p className={styles.infoValue}>{patient.phone || "-"}</p></article>
            <article className={styles.infoCard}><p className={styles.infoLabel}>Correo</p><p className={styles.infoValue}>{patient.email || "-"}</p></article>
            <article className={styles.infoCard}><p className={styles.infoLabel}>Género</p><p className={styles.infoValue}>{patient.profile.gender || "-"}</p></article>
            <article className={styles.infoCard}><p className={styles.infoLabel}>Fecha de nacimiento</p><p className={styles.infoValue}>{formatDate(patient.profile.birth_date)}</p></article>
            <article className={styles.infoCard}><p className={styles.infoLabel}>Edad</p><p className={styles.infoValue}>{getAge(patient.profile.birth_date)}</p></article>
            <article className={styles.infoCard}><p className={styles.infoLabel}>Estado</p><p className={styles.infoValue}>{patient.status === false ? "Inactivo" : "Activo"}</p></article>
            <article className={styles.infoCard}><p className={styles.infoLabel}>Registro</p><p className={styles.infoValue}>{formatDate(patient.created_at)}</p></article>
            <article className={`${styles.infoCard} ${styles.fieldFull}`}><p className={styles.infoLabel}>Dirección</p><p className={styles.infoValue}>{patient.profile.address || "-"}</p></article>
            <article className={`${styles.infoCard} ${styles.fieldFull}`}><p className={styles.infoLabel}>Alergias</p><p className={styles.infoValue}>{patient.profile.allergies || "-"}</p></article>
            <article className={`${styles.infoCard} ${styles.fieldFull}`}><p className={styles.infoLabel}>Notas médicas</p><p className={styles.infoValue}>{patient.profile.notes || "-"}</p></article>
          </div>

          <div className={styles.formSectionCard} style={{ marginTop: 14 }}>
            <h3 className={styles.sectionHeading}>Contexto clínico reciente</h3>
            {recentAppointments.length === 0 ? (
              <div className={styles.readOnlyBlock}>No hay citas recientes disponibles para este paciente en tu agenda.</div>
            ) : (
              <div className={styles.tableCard}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Servicio</th>
                      <th>Estado</th>
                      <th>Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAppointments.map((appointment) => (
                      <tr key={appointment.id}>
                        <td>{formatDateTime(appointment.start_at)}</td>
                        <td>{appointment.service?.name || appointment.service_name || "-"}</td>
                        <td>{appointment.status || "-"}</td>
                        <td>{appointment.reason || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
