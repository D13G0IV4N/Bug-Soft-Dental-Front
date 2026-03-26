import { useMemo, useState, type FormEvent } from "react";
import { updateAppointment, toErrorMessage, type Appointment, type AppointmentPayload } from "../../api/appointments";
import type { Service } from "../../api/services";
import formStyles from "../../styles/formSystem.module.css";
import { toDateTimeLocal } from "./dateUtils";
import styles from "./dentist.module.css";

type DentistPatientOption = {
  id: number;
  name: string;
  phone?: string;
  email?: string;
};

interface Props {
  mode: "create" | "edit";
  appointment?: Appointment;
  patients: DentistPatientOption[];
  services: Service[];
  loadingServices: boolean;
  servicesError: string;
  dentistUserId: number | null;
  onClose: () => void;
  onSubmit: (payload: AppointmentPayload) => Promise<void>;
}

export default function DentistAppointmentFormModal({
  mode,
  appointment,
  patients,
  services,
  loadingServices,
  servicesError,
  dentistUserId,
  onClose,
  onSubmit,
}: Props) {
  const [patientUserId, setPatientUserId] = useState(
    appointment?.patient_user_id ? String(appointment.patient_user_id) : ""
  );
  const [serviceId, setServiceId] = useState(appointment?.service_id ? String(appointment.service_id) : "");
  const [startAt, setStartAt] = useState(appointment?.start_at ? toDateTimeLocal(appointment.start_at) : "");
  const [reason, setReason] = useState(appointment?.reason ?? "");
  const [internalNotes, setInternalNotes] = useState(appointment?.internal_notes ?? appointment?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedService = useMemo(
    () => services.find((service) => String(service.id) === serviceId),
    [serviceId, services]
  );

  const title = mode === "create" ? "Nueva cita clínica" : `Editar cita #${appointment?.id ?? ""}`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!patientUserId || !serviceId || !startAt) {
      setError("Selecciona paciente, servicio y fecha para continuar.");
      return;
    }

    if (!dentistUserId) {
      setError("No se pudo identificar el dentista autenticado. Recarga la sesión.");
      return;
    }

    const payload: AppointmentPayload = {
      patient_user_id: Number(patientUserId),
      service_id: Number(serviceId),
      start_at: startAt,
      dentist_user_id: dentistUserId,
      reason: reason.trim() || undefined,
      internal_notes: internalNotes.trim() || undefined,
    };

    try {
      setSaving(true);
      if (mode === "create") {
        await onSubmit(payload);
      } else {
        if (!appointment?.id) return;
        await updateAppointment(appointment.id, {
          patient_user_id: Number(patientUserId),
          service_id: Number(serviceId),
          start_at: startAt,
          reason: reason.trim() || undefined,
          internal_notes: internalNotes.trim() || undefined,
        });
        await onSubmit(payload);
      }
    } catch (requestError: unknown) {
      setError(toErrorMessage(requestError, mode === "create" ? "No se pudo crear la cita" : "No se pudo actualizar la cita"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={formStyles.modalOverlay} onClick={() => !saving && onClose()}>
      <div className={formStyles.modalCard} onClick={(event) => event.stopPropagation()}>
        <header className={styles.modalHeader}>
          <div>
            <p className={styles.workspaceTag}>Agenda asistencial</p>
            <h3 className={styles.heroTitle}>{title}</h3>
            <p className={styles.heroSub}>Flujo real conectado al backend para pacientes, servicios y actualización de agenda.</p>
          </div>
          <button type="button" className={styles.btnGhost} disabled={saving} onClick={onClose}>Cerrar</button>
        </header>

        <form className={styles.formGrid} onSubmit={handleSubmit}>
          <label>
            Paciente
            <select className={styles.select} value={patientUserId} onChange={(event) => setPatientUserId(event.target.value)} required>
              <option value="">Selecciona paciente</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>{patient.name}</option>
              ))}
            </select>
          </label>

          <label>
            Servicio
            <select className={styles.select} value={serviceId} onChange={(event) => setServiceId(event.target.value)} required>
              <option value="">Selecciona servicio</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}{service.specialty?.name ? ` · ${service.specialty.name}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label>
            Fecha y hora
            <input className={styles.input} type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} required />
          </label>

          <label className={styles.fieldFull}>
            Motivo
            <input className={styles.input} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Opcional" />
          </label>

          <label className={styles.fieldFull}>
            Notas internas
            <textarea
              className={styles.textarea}
              value={internalNotes}
              onChange={(event) => setInternalNotes(event.target.value)}
              rows={3}
              placeholder="Opcional"
            />
          </label>

          {selectedService && (
            <p className={styles.rowMeta}>
              Duración estimada: {selectedService.duration_minutes} min. Especialidad: {selectedService.specialty?.name || "No especificada"}.
            </p>
          )}
          {loadingServices && <p className={styles.rowMeta}>Cargando servicios...</p>}
          {servicesError && <p className={styles.feedbackError}>{servicesError}</p>}
          {patients.length === 0 && <p className={styles.feedbackError}>No hay pacientes disponibles en tus citas actuales para crear una nueva cita.</p>}
          {error && <p className={styles.feedbackError}>{error}</p>}

          <div className={styles.modalActions}>
            <button type="button" className={styles.btnGhost} onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className={styles.btn} disabled={saving || loadingServices || patients.length === 0}>
              {saving ? "Guardando..." : mode === "create" ? "Crear cita" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
