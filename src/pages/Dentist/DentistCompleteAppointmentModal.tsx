import { useMemo, useState, type FormEvent } from "react";
import { createAppointmentNote, toErrorMessage, updateAppointmentStatus, type Appointment } from "../../api/appointments";
import formStyles from "../../styles/formSystem.module.css";
import { formatDate, formatTime } from "./dateUtils";
import styles from "./dentist.module.css";

interface Props {
  appointment: Appointment;
  onClose: () => void;
  onCompleted: () => Promise<void>;
}

export default function DentistCompleteAppointmentModal({ appointment, onClose, onCompleted }: Props) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const patientName = useMemo(
    () => appointment.patient?.name || appointment.patient_name || `Paciente #${appointment.patient_user_id}`,
    [appointment]
  );

  const serviceName = useMemo(
    () => appointment.service?.name || appointment.service_name || `Servicio #${appointment.service_id}`,
    [appointment]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!appointment.id || saving) return;

    const trimmedNote = note.trim();
    if (!trimmedNote) {
      setError("La nota clínica es obligatoria para completar la cita.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await createAppointmentNote(appointment.id, { note: trimmedNote });
      await updateAppointmentStatus(appointment.id, "completed");
      await onCompleted();
      onClose();
    } catch (requestError: unknown) {
      setError(toErrorMessage(requestError, "No se pudo registrar la nota clínica y completar la cita"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={formStyles.modalOverlay} onClick={() => !saving && onClose()}>
      <div className={`${formStyles.modalCard} ${styles.clinicalModal} ${styles.completeModalCard}`.trim()} onClick={(event) => event.stopPropagation()}>
        <header className={styles.modalHeader}>
          <div>
            <p className={styles.workspaceTag}>Cierre clínico</p>
            <h3 className={styles.heroTitle}>Completar cita con nota clínica</h3>
            <p className={styles.heroSub}>Primero se guarda la nota clínica y, solo después, se actualiza el estado de la cita a completada.</p>
          </div>
          <button type="button" className={styles.btnGhost} onClick={onClose} disabled={saving}>Cerrar</button>
        </header>

        <form className={styles.completeModalBody} onSubmit={handleSubmit}>
          <section className={styles.completeSummaryCard}>
            <p className={styles.sectionHeading}>Resumen de cita</p>
            <div className={styles.completeSummaryGrid}>
              <div>
                <p className={styles.infoLabel}>Paciente</p>
                <p className={styles.infoValue}>{patientName}</p>
              </div>
              <div>
                <p className={styles.infoLabel}>Servicio</p>
                <p className={styles.infoValue}>{serviceName}</p>
              </div>
              <div>
                <p className={styles.infoLabel}>Horario</p>
                <p className={styles.infoValue}>{formatDate(appointment.start_at)} · {formatTime(appointment.start_at)} - {formatTime(appointment.end_at)}</p>
              </div>
            </div>
          </section>

          <section className={styles.completeNoteCard}>
            <p className={styles.sectionHeading}>Nota clínica obligatoria</p>
            <label className={styles.completeFieldLabel}>
              Nota
              <textarea
                className={`${styles.textarea} ${styles.completeTextarea}`.trim()}
                value={note}
                rows={6}
                maxLength={3000}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Registra el hallazgo clínico, tratamiento realizado y recomendaciones clave para el seguimiento."
                disabled={saving}
              />
            </label>
            <p className={styles.rowMeta}>{note.trim().length}/3000 caracteres</p>
          </section>

          {error && (
            <div className={styles.errorPanel}>
              <p className={styles.errorTitle}>No fue posible completar la cita.</p>
              <p className={styles.errorBody}>{error}</p>
            </div>
          )}

          <div className={styles.modalActions}>
            <button type="button" className={styles.btnGhost} onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className={styles.btn} disabled={saving || !note.trim()}>
              {saving ? "Guardando nota y completando..." : "Guardar nota y completar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
