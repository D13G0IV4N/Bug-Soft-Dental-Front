import { useEffect, useMemo, useState, type FormEvent } from "react";
import { type Appointment, type AppointmentPayload, type AppointmentUpdatePayload } from "../../api/appointments";
import type { Service } from "../../api/services";
import formStyles from "../../styles/formSystem.module.css";
import { formatDateTime, toDateTimeLocal } from "./dateUtils";
import { toDentistRequestError } from "./errorUtils";
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
  onSubmit: (payload: AppointmentPayload | AppointmentUpdatePayload) => Promise<void>;
}

function trimOrUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
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

  const patientLabel = useMemo(() => {
    if (!appointment) return "";
    return appointment.patient?.name || appointment.patient_name || `Paciente #${appointment.patient_user_id}`;
  }, [appointment]);

  const selectedService = useMemo(
    () => services.find((service) => String(service.id) === serviceId),
    [serviceId, services]
  );

  const title = mode === "create" ? "Nueva cita clínica" : `Editar cita #${appointment?.id ?? ""}`;

  useEffect(() => {
    setPatientUserId(appointment?.patient_user_id ? String(appointment.patient_user_id) : "");
    setServiceId(appointment?.service_id ? String(appointment.service_id) : "");
    setStartAt(appointment?.start_at ? toDateTimeLocal(appointment.start_at) : "");
    setReason(appointment?.reason ?? "");
    setInternalNotes(appointment?.internal_notes ?? appointment?.notes ?? "");
    setError("");
    setSaving(false);
  }, [mode, appointment]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      setSaving(true);

      if (mode === "create") {
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
          reason: trimOrUndefined(reason),
          internal_notes: trimOrUndefined(internalNotes),
        };

        await onSubmit(payload);
        return;
      }

      if (!appointment?.id) {
        setError("No se pudo identificar la cita a editar.");
        return;
      }

      if (!startAt) {
        setError("La fecha y hora de inicio es obligatoria.");
        return;
      }

      const updatePayload: AppointmentUpdatePayload = {
        start_at: startAt,
        reason: trimOrUndefined(reason),
        internal_notes: trimOrUndefined(internalNotes),
      };

      await onSubmit(updatePayload);
    } catch (requestError: unknown) {
      setError(toDentistRequestError(requestError, mode === "create" ? "No se pudo crear la cita" : "No se pudo actualizar la cita"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={formStyles.modalOverlay} onClick={() => !saving && onClose()}>
      <div className={`${formStyles.modalCard} ${styles.clinicalModal}`.trim()} onClick={(event) => event.stopPropagation()}>
        <header className={styles.modalHeader}>
          <div>
            <p className={styles.workspaceTag}>{mode === "create" ? "Nueva cita" : "Edición clínica"}</p>
            <h3 className={styles.heroTitle}>{title}</h3>
            <p className={styles.heroSub}>Contrato real con backend: guarda datos clínicos por PATCH y estado por endpoint independiente.</p>
          </div>
          <button type="button" className={styles.btnGhost} disabled={saving} onClick={onClose}>Cerrar</button>
        </header>

        <form className={styles.formGrid} onSubmit={handleSubmit}>
          <section className={`${styles.fieldFull} ${styles.formSectionCard}`.trim()}>
            <p className={styles.sectionHeading}>Paciente</p>
            {mode === "create" ? (
              <label>
                Paciente
                <select className={styles.select} value={patientUserId} onChange={(event) => setPatientUserId(event.target.value)} required>
                  <option value="">Selecciona paciente</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>{patient.name}</option>
                  ))}
                </select>
              </label>
            ) : (
              <div className={styles.readOnlyBlock}>
                <p className={styles.infoValue}>{patientLabel}</p>
                <p className={styles.rowMeta}>{appointment?.patient?.email || "Sin correo"}</p>
                <p className={styles.rowMeta}>{appointment?.patient?.phone || "Sin teléfono"}</p>
              </div>
            )}
          </section>

          <section className={`${styles.fieldFull} ${styles.formSectionCard}`.trim()}>
            <p className={styles.sectionHeading}>Servicio / especialidad</p>
            {mode === "create" ? (
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
            ) : (
              <div className={styles.readOnlyBlock}>
                <p className={styles.infoValue}>{appointment?.service?.name || appointment?.service_name || "Sin servicio"}</p>
                <p className={styles.rowMeta}>{appointment?.service?.specialty?.name || appointment?.specialty_name || "Sin especialidad"}</p>
                <p className={styles.rowMeta}>Para dentista, servicio y paciente quedan bloqueados en edición para mantener la actualización enfocada en datos clínicos.</p>
              </div>
            )}
          </section>

          <section className={`${styles.fieldFull} ${styles.formSectionCard}`.trim()}>
            <p className={styles.sectionHeading}>Fecha y hora</p>
            <label>
              Inicio
              <input className={styles.input} type="datetime-local" step={60} value={startAt} onChange={(event) => setStartAt(event.target.value)} required />
            </label>
            <p className={styles.rowMeta}>Se enviará como hora local exacta en formato backend: YYYY-MM-DD HH:mm:ss (segundos = 00).</p>
            {mode === "edit" && appointment?.end_at && (
              <p className={styles.rowMeta}>Fin actual (informativo): {formatDateTime(appointment.end_at)}</p>
            )}
          </section>

          <section className={`${styles.fieldFull} ${styles.formSectionCard}`.trim()}>
            <p className={styles.sectionHeading}>Motivo e información interna</p>
            <label>
              Motivo
              <input className={styles.input} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Opcional" />
            </label>

            <label>
              Notas internas
              <textarea
                className={styles.textarea}
                value={internalNotes}
                onChange={(event) => setInternalNotes(event.target.value)}
                rows={3}
                placeholder="Opcional"
              />
            </label>
          </section>

          {selectedService && (
            <p className={styles.rowMeta}>
              Duración estimada: {selectedService.duration_minutes} min. Especialidad: {selectedService.specialty?.name || "No especificada"}.
            </p>
          )}
          {loadingServices && <p className={styles.rowMeta}>Cargando servicios...</p>}
          {servicesError && <p className={styles.feedbackError}>{servicesError}</p>}
          {mode === "create" && patients.length === 0 && (
            <p className={styles.feedbackError}>No hay pacientes disponibles para crear una cita desde la vista de dentista.</p>
          )}
          {error && (
            <div className={`${styles.fieldFull} ${styles.errorPanel}`.trim()}>
              <p className={styles.errorTitle}>No se pudo guardar la cita.</p>
              <p className={styles.errorBody}>{error}</p>
            </div>
          )}

          <div className={styles.modalActions}>
            <button type="button" className={styles.btnGhost} onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className={styles.btn} disabled={saving || loadingServices || (mode === "create" && patients.length === 0)}>
              {saving ? "Guardando..." : mode === "create" ? "Crear cita" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
