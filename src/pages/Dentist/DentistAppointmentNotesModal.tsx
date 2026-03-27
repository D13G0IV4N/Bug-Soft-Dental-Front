import { useEffect, useMemo, useState } from "react";
import { getAppointmentNotes, toErrorMessage, type Appointment, type AppointmentNote } from "../../api/appointments";
import formStyles from "../../styles/formSystem.module.css";
import { formatDate, formatTime } from "./dateUtils";
import styles from "./dentist.module.css";

interface Props {
  appointment: Appointment;
  onClose: () => void;
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
    <div className={formStyles.modalOverlay} onClick={onClose}>
      <aside className={styles.notesDrawer} onClick={(event) => event.stopPropagation()}>
        <header className={styles.notesHeader}>
          <div>
            <p className={styles.workspaceTag}>Historia clínica · Cita #{appointment.id ?? "-"}</p>
            <h3 className={styles.notesTitle}>Notas y observaciones</h3>
            <p className={styles.heroSub}>Consulta el registro clínico guardado durante la atención.</p>
          </div>
          <button type="button" className={styles.btnGhost} onClick={onClose}>Cerrar</button>
        </header>

        <section className={styles.notesAppointmentCard}>
          <p className={styles.sectionHeading}>Resumen de cita</p>
          <div className={styles.notesSummaryGrid}>
            <div>
              <p className={styles.infoLabel}>Paciente</p>
              <p className={styles.infoValue}>{patientName}</p>
            </div>
            <div>
              <p className={styles.infoLabel}>Servicio</p>
              <p className={styles.infoValue}>{serviceName}</p>
            </div>
            <div>
              <p className={styles.infoLabel}>Fecha y hora</p>
              <p className={styles.infoValue}>{formatDate(appointment.start_at)} · {formatTime(appointment.start_at)} - {formatTime(appointment.end_at)}</p>
            </div>
          </div>
        </section>

        <section className={styles.notesBody}>
          <div className={styles.notesBodyHeader}>
            <p className={styles.sectionHeading}>Notas clínicas</p>
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
            <div className={styles.notesList}>
              {notes.map((entry, index) => (
                <article className={styles.noteCard} key={entry.id ?? `${appointment.id}-note-${index}`}>
                  <div className={styles.noteCardHeader}>
                    <p className={styles.noteCardTitle}>Nota clínica #{index + 1}</p>
                    <p className={styles.noteCardMeta}>{formatNoteDate(entry.created_at)}</p>
                  </div>
                  {entry.author_name && <p className={styles.noteAuthor}>Registrada por: {entry.author_name}</p>}
                  <p className={styles.noteText}>{entry.note}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
