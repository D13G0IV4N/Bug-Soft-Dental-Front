import { useMemo, useState, type FormEvent } from "react";
import {
  toErrorMessage,
  updateAppointment,
  updateAppointmentStatus,
  type Appointment,
  type AppointmentStatus,
} from "../../api/appointments";
import type { Service } from "../../api/services";
import formStyles from "../../styles/formSystem.module.css";
import { formatDateTime, toDateTimeLocal } from "./dateUtils";
import styles from "./dentist.module.css";

interface Props {
  appointment: Appointment;
  services: Service[];
  loadingServices: boolean;
  servicesError: string;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}

const STATUS_OPTIONS: AppointmentStatus[] = ["confirmed", "completed", "no_show", "canceled"];

function normalizeStatus(status?: string): AppointmentStatus {
  const value = (status ?? "scheduled").toLowerCase();
  return value === "cancelled" ? "canceled" : value;
}

export default function DentistAppointmentDetailModal({
  appointment,
  services,
  loadingServices,
  servicesError,
  onClose,
  onUpdated,
}: Props) {
  const [startAt, setStartAt] = useState(toDateTimeLocal(appointment.start_at));
  const [reason, setReason] = useState(appointment.reason ?? "");
  const [internalNotes, setInternalNotes] = useState(appointment.internal_notes ?? appointment.notes ?? "");
  const [status, setStatus] = useState<AppointmentStatus>(normalizeStatus(appointment.status));
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const displayPatientName = useMemo(
    () => appointment.patient?.name || appointment.patient_name || `Paciente #${appointment.patient_user_id}`,
    [appointment]
  );

  const selectedService = useMemo(
    () => services.find((service) => service.id === appointment.service_id),
    [services, appointment.service_id]
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
      setSuccess(`Estado actualizado a ${targetStatus}.`);
    } catch (requestError: unknown) {
      setError(toErrorMessage(requestError, "No se pudo actualizar el estado de la cita"));
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!appointment.id) return;

    if (!startAt.trim()) {
      setError("Debes indicar una fecha/hora de inicio válida.");
      return;
    }

    try {
      setSavingEdit(true);
      setError("");
      setSuccess("");

      await updateAppointment(appointment.id, {
        start_at: startAt.trim(),
        reason: reason.trim() || undefined,
        internal_notes: internalNotes.trim() || undefined,
      });

      await onUpdated();
      setSuccess("Cambios clínicos guardados correctamente.");
    } catch (requestError: unknown) {
      setError(toErrorMessage(requestError, "No se pudo editar la cita"));
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className={formStyles.modalOverlay} onClick={() => !isBusy && onClose()}>
      <div className={`${formStyles.modalCard} ${styles.clinicalModal}`.trim()} onClick={(event) => event.stopPropagation()}>
        <header className={styles.modalHeader}>
          <div>
            <p className={styles.workspaceTag}>Ficha clínica</p>
            <h3 className={styles.heroTitle}>Cita #{appointment.id}</h3>
            <p className={styles.heroSub}>Edición de datos clínicos y actualización de estado con rutas separadas.</p>
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
            <p className={styles.infoLabel}>Servicio / especialidad</p>
            <p className={styles.infoValue}>{appointment.service?.name || appointment.service_name || "Sin servicio"}</p>
            <p className={styles.rowMeta}>{appointment.service?.specialty?.name || appointment.specialty_name || "Sin especialidad"}</p>
            <p className={styles.rowMeta}>Duración estimada: {selectedService?.duration_minutes || appointment.service?.duration_minutes || "-"} min.</p>
          </article>

          <article className={styles.infoCard}>
            <p className={styles.infoLabel}>Fecha</p>
            <p className={styles.rowMeta}>Inicio: {formatDateTime(appointment.start_at)}</p>
            <p className={styles.rowMeta}>Fin: {formatDateTime(appointment.end_at)}</p>
            <p className={styles.rowMeta}>Estado actual: {normalizeStatus(appointment.status)}</p>
          </article>
        </section>

        <form className={styles.formGrid} onSubmit={handleEdit}>
          <section className={`${styles.fieldFull} ${styles.formSectionCard}`.trim()}>
            <p className={styles.sectionHeading}>Guardar cambios (PATCH /appointments/{'{id}'})</p>
            <p className={styles.rowMeta}>Campos habilitados para dentista: fecha/hora de inicio, motivo y notas internas.</p>

            <label>
              Fecha y hora de inicio
              <input className={styles.input} type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} required />
            </label>

            <label>
              Motivo
              <textarea className={styles.textarea} value={reason} onChange={(event) => setReason(event.target.value)} rows={2} />
            </label>

            <label>
              Notas internas
              <textarea className={styles.textarea} value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} rows={3} />
            </label>

            <div className={styles.modalActions}>
              <button type="submit" className={styles.btn} disabled={isBusy || loadingServices}>
                {savingEdit ? "Guardando..." : "Save changes"}
              </button>
            </div>
          </section>

          <section className={`${styles.fieldFull} ${styles.formSectionCard}`.trim()}>
            <p className={styles.sectionHeading}>Actualizar estado (PATCH /appointments/{'{id}'}/status)</p>
            <label>
              Estado
              <select className={styles.select} value={status} onChange={(event) => setStatus(event.target.value as AppointmentStatus)}>
                {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>

            <div className={styles.statusActionsRow}>
              <button type="button" className={styles.btnTiny} disabled={isBusy} onClick={() => void handleStatusUpdate("confirmed")}>Confirmar</button>
              <button type="button" className={styles.btnTiny} disabled={isBusy} onClick={() => void handleStatusUpdate("completed")}>Completar</button>
              <button type="button" className={styles.btnTiny} disabled={isBusy} onClick={() => void handleStatusUpdate("no_show")}>No_show</button>
              <button type="button" className={styles.btnDanger} disabled={isBusy} onClick={() => void handleStatusUpdate("canceled")}>Cancelar cita</button>
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.btnGhost} disabled={isBusy} onClick={() => void handleStatusUpdate()}>
                {updatingStatus ? "Actualizando estado..." : "Update status"}
              </button>
            </div>
          </section>

          {loadingServices && <p className={styles.rowMeta}>Cargando servicios...</p>}
          {servicesError && <p className={styles.feedbackError}>{servicesError}</p>}
          {error && (
            <div className={`${styles.fieldFull} ${styles.errorPanel}`.trim()}>
              <p className={styles.errorTitle}>No se pudo completar la acción.</p>
              <p className={styles.errorBody}>{error}</p>
            </div>
          )}
          {success && <p className={`${styles.fieldFull} ${styles.feedbackOk}`}>{success}</p>}
        </form>
      </div>
    </div>
  );
}
