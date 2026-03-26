import { useMemo, useState } from "react";
import {
  toErrorMessage,
  updateAppointment,
  updateAppointmentStatus,
  type Appointment,
  type AppointmentStatus,
} from "../../api/appointments";
import styles from "../Admin/admin.module.css";
import formStyles from "../../styles/formSystem.module.css";

interface Props {
  appointment: Appointment;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}

const STATUS_OPTIONS: AppointmentStatus[] = ["confirmed", "completed", "canceled", "no_show"];

function toDateTimeLocal(value?: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export default function DentistAppointmentDetailModal({ appointment, onClose, onUpdated }: Props) {
  const [startAt, setStartAt] = useState(toDateTimeLocal(appointment.start_at));
  const [reason, setReason] = useState(appointment.reason ?? "");
  const [internalNotes, setInternalNotes] = useState(appointment.internal_notes ?? appointment.notes ?? "");
  const [status, setStatus] = useState<AppointmentStatus>(appointment.status ?? "scheduled");

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const displayPatientName = useMemo(
    () => appointment.patient?.name || appointment.patient_name || `Paciente #${appointment.patient_user_id}`,
    [appointment]
  );

  async function handleStatusUpdate() {
    if (!appointment.id) return;

    try {
      setUpdatingStatus(true);
      setError("");
      setSuccess("");
      await updateAppointmentStatus(appointment.id, status);
      await onUpdated();
      setSuccess("Estado actualizado correctamente.");
    } catch (requestError: unknown) {
      setError(toErrorMessage(requestError, "No se pudo actualizar el estado de la cita"));
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleLimitedEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!appointment.id) return;

    try {
      setSavingEdit(true);
      setError("");
      setSuccess("");

      await updateAppointment(appointment.id, {
        start_at: startAt,
        reason: reason.trim() || undefined,
        internal_notes: internalNotes.trim() || undefined,
      });

      await onUpdated();
      setSuccess("Cita actualizada correctamente.");
    } catch (requestError: unknown) {
      setError(toErrorMessage(requestError, "No se pudo editar la cita"));
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className={formStyles.modalOverlay} onClick={() => !(updatingStatus || savingEdit) && onClose()}>
      <div className={formStyles.modalCard} onClick={(event) => event.stopPropagation()}>
        <div className={formStyles.modalHeader}>
          <div>
            <h3 className={formStyles.modalTitle}>Detalle de cita #{appointment.id}</h3>
            <p className={formStyles.modalText}>Visualiza y edita únicamente campos permitidos para el dentista.</p>
          </div>
          <button type="button" className={styles.btnGhost} disabled={updatingStatus || savingEdit} onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className={formStyles.modalBody}>
          <div className={styles.formSurface}>
            <p className={styles.rowTitle}>{displayPatientName}</p>
            <p className={styles.rowSub}>Correo: {appointment.patient?.email || "-"}</p>
            <p className={styles.rowSub}>Teléfono: {appointment.patient?.phone || "-"}</p>
            <p className={styles.rowSub}>Servicio: {appointment.service?.name || appointment.service_name || "-"}</p>
            <p className={styles.rowSub}>Especialidad: {appointment.service?.specialty?.name || appointment.specialty_name || "-"}</p>
            <p className={styles.rowSub}>Inicio: {formatDateTime(appointment.start_at)}</p>
            <p className={styles.rowSub}>Fin: {formatDateTime(appointment.end_at)}</p>
          </div>

          <form className={formStyles.formGrid} onSubmit={handleLimitedEdit}>
            <label className={formStyles.field}>
              Fecha y hora
              <input
                className={formStyles.control}
                type="datetime-local"
                value={startAt}
                onChange={(event) => setStartAt(event.target.value)}
              />
            </label>

            <label className={formStyles.field}>
              Estado
              <select
                className={formStyles.control}
                value={status}
                onChange={(event) => setStatus(event.target.value as AppointmentStatus)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className={`${formStyles.field} ${formStyles.fieldFull}`}>
              Motivo
              <textarea
                className={formStyles.control}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>

            <label className={`${formStyles.field} ${formStyles.fieldFull}`}>
              Notas internas
              <textarea
                className={formStyles.control}
                value={internalNotes}
                onChange={(event) => setInternalNotes(event.target.value)}
              />
            </label>

            {error && <div className={formStyles.error}>{error}</div>}
            {success && <p className={styles.rowSub}>{success}</p>}

            <div className={formStyles.formActionsBetween}>
              <button type="button" className={styles.btnGhost} disabled={updatingStatus || savingEdit} onClick={handleStatusUpdate}>
                {updatingStatus ? "Actualizando estado..." : "Actualizar estado"}
              </button>
              <button type="submit" className={styles.btnPrimary} disabled={updatingStatus || savingEdit}>
                {savingEdit ? "Guardando cambios..." : "Guardar edición"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
