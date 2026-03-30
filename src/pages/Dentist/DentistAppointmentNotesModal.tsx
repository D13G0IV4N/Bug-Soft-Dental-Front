import { useEffect, useMemo, useState } from "react";
import { getAppointmentNotes, toErrorMessage, type Appointment, type AppointmentNote } from "../../api/appointments";
import formStyles from "../../styles/formSystem.module.css";
import { formatDate, formatTime } from "./dateUtils";
import styles from "./dentist.module.css";
import AppModal from "../../components/ui/AppModal";

interface Props {
  appointment: Appointment;
  onClose: () => void;
}

function getStatusLabel(status?: string) {
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

function formatNoteDate(value?: string) {
  if (!value) return "Fecha no disponible";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DentistAppointmentNotesModal({ appointment, onClose }: Props) {
  const [notes, setNotes] = useState<AppointmentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const patientName = useMemo(
    () => appointment.patient?.name || appointment.patient_name || `Paciente #${appointment.patient_user_id}`,
    [appointment]
  );

  const serviceName = useMemo(
    () => appointment.service?.name || appointment.service_name || `Servicio #${appointment.service_id}`,
    [appointment]
  );

  useEffect(() => {
    let active = true;

    async function loadNotes() {
      if (!appointment.id) {
        setLoading(false);
        setError("No se encontró el identificador de la cita para cargar notas.");
        return;
      }

      try {
        setLoading(true);
        setError("");
        const response = await getAppointmentNotes(appointment.id);
        if (!active) return;

        const filtered = response.filter((entry) => entry.note.trim() !== "");
        setNotes(filtered);
      } catch (requestError: unknown) {
        if (!active) return;
        setNotes([]);
        setError(toErrorMessage(requestError, "No se pudieron cargar las notas de esta cita"));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadNotes();

    return () => {
      active = false;
    };
  }, [appointment.id]);

  return (
    <AppModal
      open
      size="wide"
      eyebrow={`Historia clínica · Cita #${appointment.id ?? "-"}`}
      title="Notas y observaciones"
      subtitle="Consulta la evolución clínica registrada durante la atención y revisa cada anotación con contexto de cita."
      onClose={onClose}
      actions={(
        <div className={formStyles.formActions}>
          <button type="button" className={styles.btnGhost} onClick={onClose}>Cerrar</button>
        </div>
      )}
    >
      <div className={styles.notesModalLayout}>
        <section className={`${formStyles.formSectionCard} ${styles.notesSummaryCard}`.trim()}>
          <div className={styles.notesSummaryHeader}>
            <p className={formStyles.sectionHeading}>Resumen de cita</p>
            <span className={formStyles.statusChip}>{getStatusLabel(appointment.status)}</span>
          </div>
          <div className={styles.notesSummaryGrid}>
            <article className={styles.notesSummaryItem}>
              <p className={styles.infoLabel}>Paciente</p>
              <p className={styles.infoValue}>{patientName}</p>
            </article>
            <article className={styles.notesSummaryItem}>
              <p className={styles.infoLabel}>Servicio</p>
              <p className={styles.infoValue}>{serviceName}</p>
            </article>
            <article className={`${styles.notesSummaryItem} ${styles.notesSummaryItemWide}`.trim()}>
              <p className={styles.infoLabel}>Fecha y hora</p>
              <p className={styles.infoValue}>{formatDate(appointment.start_at)} · {formatTime(appointment.start_at)} - {formatTime(appointment.end_at)}</p>
            </article>
          </div>
        </section>

        <section className={`${formStyles.formSectionCard} ${styles.notesBody}`.trim()}>
          <div className={styles.notesBodyHeader}>
            <div>
              <p className={formStyles.sectionHeading}>Notas clínicas</p>
              <p className={styles.notesSectionText}>Bitácora cronológica de hallazgos, procedimientos y observaciones de seguimiento.</p>
            </div>
            {!loading && !error && (
              <span className={styles.notesCount}>{notes.length} {notes.length === 1 ? "registro" : "registros"}</span>
            )}
          </div>

          {loading && <div className={styles.notesEmptyState}>Cargando notas de la cita...</div>}

          {!loading && error && (
            <div className={styles.errorPanel}>
              <p className={styles.errorTitle}>No fue posible cargar las notas.</p>
              <p className={styles.errorBody}>{error}</p>
            </div>
          )}

          {!loading && !error && notes.length === 0 && (
            <div className={styles.notesEmptyState}>
              <p className={styles.notesEmptyTitle}>Esta cita aún no tiene notas registradas.</p>
              <p className={styles.rowMeta}>Cuando se complete una atención con observaciones clínicas, aparecerán aquí.</p>
            </div>
          )}

          {!loading && !error && notes.length > 0 && (
            <div className={styles.notesList} role="list" aria-label="Listado de notas clínicas">
              {notes.map((entry, index) => (
                <article className={styles.noteCard} key={entry.id ?? `${appointment.id}-note-${index}`} role="listitem">
                  <div className={styles.noteCardHeader}>
                    <div>
                      <p className={styles.noteCardTitle}>Nota clínica #{index + 1}</p>
                      {entry.author_name ? <p className={styles.noteAuthor}>Registrada por: {entry.author_name}</p> : null}
                    </div>
                    <p className={styles.noteCardMeta}>{formatNoteDate(entry.created_at)}</p>
                  </div>
                  <p className={styles.noteText}>{entry.note}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppModal>
  );
}
