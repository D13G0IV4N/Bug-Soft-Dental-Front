import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  updateAppointment,
  updateAppointmentStatus,
  type Appointment,
  type AppointmentStatus,
} from "../../api/appointments";
import type { Service } from "../../api/services";
import formStyles from "../../styles/formSystem.module.css";
import { formatDateTime, toDateTimeLocal } from "./dateUtils";
import { toDentistRequestError } from "./errorUtils";
import styles from "./dentist.module.css";
import AppModal from "../../components/ui/AppModal";

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

  useEffect(() => {
    setStartAt(toDateTimeLocal(appointment.start_at));
    setReason(appointment.reason ?? "");
    setInternalNotes(appointment.internal_notes ?? appointment.notes ?? "");
    setStatus(normalizeStatus(appointment.status));
    setError("");
    setSuccess("");
  }, [appointment]);

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
      setError(toDentistRequestError(requestError, "No se pudo actualizar el estado de la cita"));
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
      setError(toDentistRequestError(requestError, "No se pudo editar la cita"));
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <AppModal
      open
      size="wide"
      eyebrow="Ficha clínica"
      title={`Cita #${appointment.id}`}
      subtitle="Edición de datos clínicos y actualización de estado con rutas separadas."
      onClose={onClose}
      closeDisabled={isBusy}
      disableClose={isBusy}
      actions={(
        <div className={formStyles.formActions}>
          <button type="button" className={styles.btnGhost} disabled={isBusy} onClick={onClose}>Cerrar</button>
          <button type="submit" form="dentist-appointment-detail-edit" className={styles.btn} disabled={isBusy || loadingServices}>
            {savingEdit ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      )}
    >
      <div className={formStyles.formGrid}>
        <section className={formStyles.formSectionCard}>
          <p className={formStyles.sectionHeading}>Paciente</p>
          <p className={styles.infoValue}>{displayPatientName}</p>
          <p className={styles.rowMeta}>{appointment.patient?.email || "Sin correo"}</p>
          <p className={styles.rowMeta}>{appointment.patient?.phone || "Sin teléfono"}</p>
        </section>

        <section className={formStyles.formSectionCard}>
          <p className={formStyles.sectionHeading}>Servicio / especialidad</p>
          <p className={styles.infoValue}>{appointment.service?.name || appointment.service_name || "Sin servicio"}</p>
          <p className={styles.rowMeta}>{appointment.service?.specialty?.name || appointment.specialty_name || "Sin especialidad"}</p>
          <p className={styles.rowMeta}>Duración estimada: {selectedService?.duration_minutes || appointment.service?.duration_minutes || "-"} min.</p>
        </section>

        <section className={formStyles.formSectionCard}>
          <p className={formStyles.sectionHeading}>Fecha y estado actual</p>
          <p className={styles.rowMeta}>Inicio: {formatDateTime(appointment.start_at)}</p>
          <p className={styles.rowMeta}>Fin: {formatDateTime(appointment.end_at)}</p>
          <span className={formStyles.statusChip}>{normalizeStatus(appointment.status)}</span>
        </section>

        <section className={`${formStyles.formSectionCard} ${formStyles.fieldFull}`.trim()}>
          <p className={formStyles.sectionHeading}>Guardar cambios (PATCH /appointments/{'{id}'})</p>
          <p className={formStyles.helper}>Campos habilitados para dentista: fecha/hora de inicio, motivo y notas internas.</p>

          <form id="dentist-appointment-detail-edit" className={formStyles.formSectionGrid} onSubmit={handleEdit}>
            <label className={formStyles.field}>
              Fecha y hora de inicio
              <input className={formStyles.control} type="datetime-local" step={60} value={startAt} onChange={(event) => setStartAt(event.target.value)} required />
            </label>

            <label className={`${formStyles.field} ${formStyles.fieldFull}`}>
              Motivo
              <textarea className={formStyles.control} value={reason} onChange={(event) => setReason(event.target.value)} rows={2} />
            </label>

            <label className={`${formStyles.field} ${formStyles.fieldFull}`}>
              Notas internas
              <textarea className={formStyles.control} value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} rows={3} />
            </label>
          </form>
        </section>

        <section className={`${formStyles.formSectionCard} ${formStyles.fieldFull}`.trim()}>
          <p className={formStyles.sectionHeading}>Actualizar estado (PATCH /appointments/{'{id}'}/status)</p>
          <div className={formStyles.formSectionGrid}>
            <label className={formStyles.field}>
              Estado
              <select className={formStyles.control} value={status} onChange={(event) => setStatus(event.target.value as AppointmentStatus)}>
                {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          </div>

          <div className={styles.statusActionsRow}>
            <button type="button" className={styles.btnTiny} disabled={isBusy} onClick={() => void handleStatusUpdate("confirmed")}>Confirmar</button>
            <button type="button" className={styles.btnTiny} disabled={isBusy} onClick={() => void handleStatusUpdate("completed")}>Completar</button>
            <button type="button" className={styles.btnTiny} disabled={isBusy} onClick={() => void handleStatusUpdate("no_show")}>No_show</button>
            <button type="button" className={styles.btnDanger} disabled={isBusy} onClick={() => void handleStatusUpdate("canceled")}>Cancelar cita</button>
          </div>

          <div className={formStyles.formActions}>
            <button type="button" className={styles.btnGhost} disabled={isBusy} onClick={() => void handleStatusUpdate()}>
              {updatingStatus ? "Actualizando estado..." : "Actualizar estado"}
            </button>
          </div>
        </section>

        {loadingServices && <p className={formStyles.helper}>Cargando servicios...</p>}
        {servicesError && <p className={formStyles.error}>{servicesError}</p>}
        {error && <div className={formStyles.error}>{error}</div>}
        {success && <p className={styles.feedbackOk}>{success}</p>}
      </div>
    </AppModal>
  );
}
