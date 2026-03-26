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
  const [serviceId, setServiceId] = useState(appointment.service_id ? String(appointment.service_id) : "");
  const [status, setStatus] = useState<AppointmentStatus>((appointment.status ?? "scheduled").toLowerCase());
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const displayPatientName = useMemo(
    () => appointment.patient?.name || appointment.patient_name || `Paciente #${appointment.patient_user_id}`,
    [appointment]
  );

  const selectedService = useMemo(
    () => services.find((service) => String(service.id) === serviceId),
    [serviceId, services]
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

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!appointment.id) return;

    try {
      setSavingEdit(true);
      setError("");
      setSuccess("");

      await updateAppointment(appointment.id, {
        service_id: serviceId ? Number(serviceId) : undefined,
        start_at: startAt.trim() || undefined,
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
    <div className={formStyles.modalOverlay} onClick={() => !isBusy && onClose()}>
      <div className={formStyles.modalCard} onClick={(event) => event.stopPropagation()}>
        <header className={styles.modalHeader}>
          <div>
            <p className={styles.workspaceTag}>Ficha clínica</p>
            <h3 className={styles.heroTitle}>Cita #{appointment.id}</h3>
            <p className={styles.heroSub}>Visualiza paciente, ajusta datos de cita y aplica estados clínicos.</p>
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
            <p className={styles.infoLabel}>Datos de cita</p>
            <p className={styles.rowMeta}>Inicio: {formatDateTime(appointment.start_at)}</p>
            <p className={styles.rowMeta}>Fin: {formatDateTime(appointment.end_at)}</p>
            <p className={styles.rowMeta}>Estado actual: {appointment.status || "scheduled"}</p>
          </article>

          <article className={styles.infoCard}>
            <p className={styles.infoLabel}>Servicio</p>
            <p className={styles.infoValue}>{appointment.service?.name || appointment.service_name || "Sin servicio"}</p>
            <p className={styles.rowMeta}>{appointment.service?.specialty?.name || appointment.specialty_name || "Sin especialidad"}</p>
          </article>
        </section>

        <form className={styles.formGrid} onSubmit={handleEdit}>
          <label>
            Fecha y hora
            <input className={styles.input} type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} />
          </label>

          <label>
            Servicio
            <select className={styles.select} value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
              <option value="">Mantener servicio actual</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>{service.name}{service.specialty?.name ? ` · ${service.specialty.name}` : ""}</option>
              ))}
            </select>
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
            <button type="button" className={styles.btnTiny} disabled={isBusy} onClick={() => void handleStatusUpdate("confirmed")}>Confirmar</button>
            <button type="button" className={styles.btnTiny} disabled={isBusy} onClick={() => void handleStatusUpdate("completed")}>Completar</button>
            <button type="button" className={styles.btnTiny} disabled={isBusy} onClick={() => void handleStatusUpdate("no_show")}>No_show</button>
            <button type="button" className={styles.btnDanger} disabled={isBusy} onClick={() => void handleStatusUpdate("canceled")}>Cancelar cita</button>
          </div>

          {loadingServices && <p className={styles.rowMeta}>Cargando servicios...</p>}
          {servicesError && <p className={styles.feedbackError}>{servicesError}</p>}
          {selectedService && <p className={styles.rowMeta}>Duración estimada del servicio: {selectedService.duration_minutes} min.</p>}
          {error && <p className={`${styles.fieldFull} ${styles.feedbackError}`}>{error}</p>}
          {success && <p className={`${styles.fieldFull} ${styles.feedbackOk}`}>{success}</p>}

          <div className={`${styles.fieldFull} ${styles.modalActions}`}>
            <button type="button" className={styles.btnGhost} disabled={isBusy} onClick={() => void handleStatusUpdate()}>
              {updatingStatus ? "Actualizando estado..." : "Guardar estado"}
            </button>
            <button type="submit" className={styles.btn} disabled={isBusy || loadingServices}>
              {savingEdit ? "Guardando..." : "Guardar edición"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
