import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { Appointment } from "../../api/appointments";
import type { Patient } from "../../api/patients";
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

function getStatusLabel(status?: string | null) {
  if (!status) return "Sin estado";
  const normalized = status.toLowerCase();
  if (normalized === "scheduled") return "Programada";
  if (normalized === "pending") return "Pendiente";
  if (normalized === "confirmed") return "Confirmada";
  if (normalized === "completed") return "Completada";
  if (normalized === "canceled" || normalized === "cancelled") return "Cancelada";
  if (normalized === "no_show") return "Ausencia";
  return status;
}

function getStatusClass(status?: string | null) {
  if (!status) return "";
  const normalized = status.toLowerCase();
  if (normalized === "scheduled") return styles.statusScheduled;
  if (normalized === "pending") return styles.statusPending;
  if (normalized === "confirmed") return styles.statusConfirmed;
  if (normalized === "completed") return styles.statusCompleted;
  if (normalized === "canceled" || normalized === "cancelled") return styles.statusCanceled;
  if (normalized === "no_show") return styles.statusNoShow;
  return "";
}

export default function DentistPatientDetailsModal({ patient, recentAppointments, onClose }: Props) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEsc(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleEsc);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  return createPortal(
    <div className={styles.detailsOverlay} onClick={onClose}>
      <aside
        className={styles.detailsDrawer}
        onClick={(event) => event.stopPropagation()}
        aria-modal="true"
        role="dialog"
      >
        <header className={styles.detailsHeader}>
          <div>
            <p className={styles.detailsEyebrow}>Ficha clínica del paciente</p>
            <h2 className={styles.detailsTitle}>{patient.name || "Paciente"}</h2>
            <p className={styles.detailsSubtitle}>Resumen clínico y administrativo en el contexto del odontólogo autenticado.</p>
            <div className={styles.detailsChips}>
              <span className={`${styles.statusPill} ${patient.status === false ? styles.statusCanceled : styles.statusConfirmed}`}>
                {patient.status === false ? "Inactivo" : "Activo"}
              </span>
              <span className={styles.metaChip}>{getAge(patient.profile.birth_date)}</span>
              <span className={styles.metaChip}>{patient.profile.gender || "Sin género"}</span>
              <span className={styles.metaChip}>{patient.phone || "Sin teléfono"}</span>
            </div>
          </div>
          <button type="button" className={styles.drawerCloseBtn} onClick={onClose} aria-label="Cerrar detalle de paciente">
            ×
          </button>
        </header>

        <div className={styles.detailsBody}>
          <section className={styles.detailsSection}>
            <h3 className={styles.detailsSectionTitle}>Información personal</h3>
            <div className={styles.detailsInfoGrid}>
              <article className={styles.detailsInfoItem}><p className={styles.infoLabel}>Nombre completo</p><p className={styles.infoValue}>{patient.name || "-"}</p></article>
              <article className={styles.detailsInfoItem}><p className={styles.infoLabel}>Fecha de nacimiento</p><p className={styles.infoValue}>{formatDate(patient.profile.birth_date)}</p></article>
              <article className={styles.detailsInfoItem}><p className={styles.infoLabel}>Edad</p><p className={styles.infoValue}>{getAge(patient.profile.birth_date)}</p></article>
              <article className={styles.detailsInfoItem}><p className={styles.infoLabel}>Género</p><p className={styles.infoValue}>{patient.profile.gender || "-"}</p></article>
              <article className={styles.detailsInfoItem}><p className={styles.infoLabel}>Registro en sistema</p><p className={styles.infoValue}>{formatDate(patient.created_at)}</p></article>
            </div>
          </section>

          <section className={styles.detailsSection}>
            <h3 className={styles.detailsSectionTitle}>Contacto</h3>
            <div className={styles.detailsInfoGrid}>
              <article className={styles.detailsInfoItem}><p className={styles.infoLabel}>Correo</p><p className={styles.infoValue}>{patient.email || "-"}</p></article>
              <article className={styles.detailsInfoItem}><p className={styles.infoLabel}>Teléfono</p><p className={styles.infoValue}>{patient.phone || "-"}</p></article>
              <article className={`${styles.detailsInfoItem} ${styles.detailsInfoItemFull}`}><p className={styles.infoLabel}>Dirección</p><p className={styles.infoValue}>{patient.profile.address || "-"}</p></article>
            </div>
          </section>

          <section className={styles.detailsSection}>
            <h3 className={styles.detailsSectionTitle}>Contexto médico</h3>
            <div className={styles.detailsInfoGrid}>
              <article className={`${styles.detailsInfoItem} ${styles.detailsInfoItemFull}`}><p className={styles.infoLabel}>Alergias</p><p className={styles.infoValue}>{patient.profile.allergies || "-"}</p></article>
              <article className={`${styles.detailsInfoItem} ${styles.detailsInfoItemFull}`}><p className={styles.infoLabel}>Notas médicas</p><p className={styles.infoValue}>{patient.profile.notes || "-"}</p></article>
            </div>
          </section>

          <section className={styles.detailsSection}>
            <h3 className={styles.detailsSectionTitle}>Citas recientes</h3>
            {recentAppointments.length === 0 ? (
              <div className={styles.readOnlyBlock}>No hay citas recientes disponibles para este paciente en tu agenda.</div>
            ) : (
              <div className={styles.appointmentTimeline}>
                {recentAppointments.map((appointment) => (
                  <article className={styles.appointmentTimelineItem} key={appointment.id}>
                    <div>
                      <p className={styles.appointmentDate}>{formatDateTime(appointment.start_at)}</p>
                      <p className={styles.appointmentService}>{appointment.service?.name || appointment.service_name || "Servicio no especificado"}</p>
                    </div>
                    <div className={styles.appointmentMetaRow}>
                      <span className={`${styles.statusPill} ${getStatusClass(appointment.status)}`}>
                        {getStatusLabel(appointment.status)}
                      </span>
                      <p className={styles.appointmentReason}>{appointment.reason || "Sin motivo registrado"}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
