import { useMemo, useState, type FormEvent } from "react";
import {
  toErrorMessage,
  updateAppointment,
  updateAppointmentStatus,
  type Appointment,
  type AppointmentStatus,
} from "../../api/appointments";
import formStyles from "../../styles/formSystem.module.css";
import { formatDateTime, toDateTimeLocal } from "./dateUtils";
import styles from "./dentist.module.css";

interface Props {
  appointment: Appointment;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}

const STATUS_OPTIONS: AppointmentStatus[] = ["confirmed", "completed", "no_show", "canceled"];

export default function DentistAppointmentDetailModal({ appointment, onClose, onUpdated }: Props) {
  const [startAt, setStartAt] = useState(toDateTimeLocal(appointment.start_at));
  const [reason, setReason] = useState(appointment.reason ?? "");
  const [internalNotes, setInternalNotes] = useState(appointment.internal_notes ?? appointment.notes ?? "");
  const [status, setStatus] = useState<AppointmentStatus>((appointment.status ?? "scheduled").toLowerCase());
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const displayPatientName = useMemo(
    () => appointment.patient?.name || appointment.patient_name || `Paciente #${appointment.patient_user_id}`,
    [appointment]
  );

  const isBusy = updatingStatus || savingEdit;

  async function handleStatusUpdate(nextStatus?: AppointmentStatus) {
    if (!appointment.id) return;

    const targetStatus = nextStatus ?? status;
    try {
      setUpdatingStatus(true);
      setError("");
      setSuccess("");
      await updateAppointmentStatus(appointment.id, targetStatus);
      setStatus(targetStatus);
      await onUpdated();
      setSuccess("Estado actualizado correctamente.");
    } catch (requestError: unknown) {
      setError(toErrorMessage(requestError, "No se pudo actualizar el estado de la cita"));
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleLimitedEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!appointment.id) return;

    try {
      setSavingEdit(true);
      setError("");
      setSuccess("");

      const payload: { start_at?: string; reason?: string; internal_notes?: string } = {};
      if (startAt.trim()) payload.start_at = startAt;
      payload.reason = reason.trim() || undefined;
      payload.internal_notes = internalNotes.trim() || undefined;

      await updateAppointment(appointment.id, payload);
      await onUpdated();
      setSuccess("Datos clínicos actualizados.");
    } catch (requestError: unknown) {
      setError(toErrorMessage(requestError, "No se pudo editar la cita"));
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className={formStyles.modalOverlay} onClick={() => !isBusy && onClose()}>
      <div className={formStyles.modalCard} onClick={(event) => event.stopPropagation()}>
        <header className={styles.modalHeader}>
          <div>
            <h3 className={styles.heroTitle}>Cita #{appointment.id}</h3>
            <p className={styles.heroSub}>Panel clínico para seguimiento, edición y acciones de estado.</p>
          </div>
          <button type="button" className={styles.btnGhost} disabled={isBusy} onClick={onClose}>Cerrar</button>
        </header>

        <section className={styles.sectionGrid}>
          <article className={styles.infoCard}>
            <p className={styles.infoLabel}>Paciente</p>
            <p className={styles.infoValue}>{displayPatientName}</p>
            <p className={styles.rowMeta}>{appointment.patient?.email || "Sin correo"}</p>
            <p className={styles.rowMeta}>{appointment.patient?.phone || "Sin teléfono"}</p>
          </article>

          <article className={styles.infoCard}>
            <p className={styles.infoLabel}>Información de cita</p>
            <p className={styles.rowMeta}>Inicio: {formatDateTime(appointment.start_at)}</p>
            <p className={styles.rowMeta}>Fin: {formatDateTime(appointment.end_at)}</p>
            <p className={styles.rowMeta}>Estado actual: {appointment.status || "scheduled"}</p>
          </article>

          <article className={styles.infoCard}>
            <p className={styles.infoLabel}>Servicio clínico</p>
            <p className={styles.infoValue}>{appointment.service?.name || appointment.service_name || "Sin servicio"}</p>
            <p className={styles.rowMeta}>{appointment.service?.specialty?.name || appointment.specialty_name || "Sin especialidad"}</p>
          </article>
        </section>

        <form className={styles.formGrid} onSubmit={handleLimitedEdit}>
          <label>
            Fecha y hora
            <input className={styles.input} type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} />
          </label>

          <label>
            Estado
            <select className={styles.select} value={status} onChange={(event) => setStatus(event.target.value as AppointmentStatus)}>
              {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>

          <label className={styles.fieldFull}>
            Motivo
            <textarea className={styles.textarea} value={reason} onChange={(event) => setReason(event.target.value)} rows={2} />
          </label>

          <label className={styles.fieldFull}>
            Notas internas
            <textarea className={styles.textarea} value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} rows={3} />
          </label>

          <div className={styles.fieldFull} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className={styles.btnGhost} disabled={isBusy} onClick={() => void handleStatusUpdate("confirmed")}>Marcar confirmada</button>
            <button type="button" className={styles.btnGhost} disabled={isBusy} onClick={() => void handleStatusUpdate("completed")}>Marcar completada</button>
            <button type="button" className={styles.btnGhost} disabled={isBusy} onClick={() => void handleStatusUpdate("no_show")}>Marcar no_show</button>
            <button type="button" className={styles.btnDanger} disabled={isBusy} onClick={() => void handleStatusUpdate("canceled")}>Cancelar cita</button>
          </div>

          {error && <p className={`${styles.fieldFull} ${styles.feedbackError}`}>{error}</p>}
          {success && <p className={`${styles.fieldFull} ${styles.feedbackOk}`}>{success}</p>}

          <div className={styles.fieldFull} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <button type="button" className={styles.btnGhost} disabled={isBusy} onClick={() => void handleStatusUpdate()}>
              {updatingStatus ? "Actualizando estado..." : "Guardar estado seleccionado"}
            </button>
            <button type="submit" className={styles.btn} disabled={isBusy}>
              {savingEdit ? "Guardando..." : "Guardar edición"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
