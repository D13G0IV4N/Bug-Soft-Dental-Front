import { useEffect, useMemo, useState, type FormEvent } from "react";
import { type Appointment, type AppointmentPayload, type AppointmentUpdatePayload } from "../../api/appointments";
import type { Service } from "../../api/services";
import formStyles from "../../styles/formSystem.module.css";
import { formatDateTime, toDateTimeLocal } from "./dateUtils";
import { toDentistRequestError } from "./errorUtils";
import styles from "./dentist.module.css";
import AppModal from "../../components/ui/AppModal";

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
  loadingPatients: boolean;
  patientsError: string;
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
  loadingPatients,
  patientsError,
  dentistUserId,
  onClose,
  onSubmit,
}: Props) {
  const [patientUserId, setPatientUserId] = useState(appointment?.patient_user_id ? String(appointment.patient_user_id) : "");
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
    <AppModal
      open
      size="wide"
      eyebrow={mode === "create" ? "Agenda clínica" : "Edición clínica"}
      title={title}
      subtitle="Registra paciente, servicio y horario con datos compatibles con el backend actual."
      onClose={onClose}
      closeDisabled={saving}
      disableClose={saving}
      actions={(
        <div className={formStyles.formActions}>
          <button type="button" className={styles.btnGhost} onClick={onClose} disabled={saving}>Cancelar</button>
          <button
            type="submit"
            form="dentist-appointment-form"
            className={styles.btn}
            disabled={saving || loadingServices || loadingPatients || (mode === "create" && (patients.length === 0 || services.length === 0))}
          >
            {saving ? "Guardando..." : mode === "create" ? "Crear cita" : "Guardar cambios"}
          </button>
        </div>
      )}
    >
      <form id="dentist-appointment-form" className={formStyles.formGrid} onSubmit={handleSubmit}>
        <section className={`${formStyles.formSectionCard} ${mode === "edit" ? formStyles.fieldFull : ""}`.trim()}>
          <p className={formStyles.sectionHeading}>Paciente</p>
          {mode === "create" ? (
            <label className={formStyles.field}>
              Paciente
              <select className={formStyles.control} value={patientUserId} onChange={(event) => setPatientUserId(event.target.value)} required>
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

        <section className={`${formStyles.formSectionCard} ${mode === "edit" ? formStyles.fieldFull : ""}`.trim()}>
          <p className={formStyles.sectionHeading}>Servicio / especialidad</p>
          {mode === "create" ? (
            <label className={formStyles.field}>
              Servicio
              <select className={formStyles.control} value={serviceId} onChange={(event) => setServiceId(event.target.value)} required>
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
              <p className={styles.rowMeta}>Para dentista, servicio y paciente quedan bloqueados para mantener la actualización enfocada en datos clínicos.</p>
            </div>
          )}
        </section>

        <section className={formStyles.formSectionCard}>
          <p className={formStyles.sectionHeading}>Fecha y hora</p>
          <label className={formStyles.field}>
            Inicio
            <input className={formStyles.control} type="datetime-local" step={60} value={startAt} onChange={(event) => setStartAt(event.target.value)} required />
          </label>
          <p className={formStyles.helper}>Se enviará como hora local exacta en formato backend: YYYY-MM-DD HH:mm:ss (segundos = 00).</p>
          {mode === "edit" && appointment?.end_at && (
            <p className={formStyles.helper}>Fin actual (informativo): {formatDateTime(appointment.end_at)}</p>
          )}
        </section>

        <section className={formStyles.formSectionCard}>
          <p className={formStyles.sectionHeading}>Motivo e información interna</p>
          <label className={formStyles.field}>
            Motivo
            <input className={formStyles.control} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Opcional" />
          </label>
          <label className={formStyles.field}>
            Notas internas
            <textarea
              className={formStyles.control}
              value={internalNotes}
              onChange={(event) => setInternalNotes(event.target.value)}
              rows={3}
              placeholder="Opcional"
            />
          </label>
        </section>

        <section className={formStyles.formSectionCard}>
          <p className={formStyles.sectionHeading}>Validaciones y disponibilidad</p>
          {selectedService && (
            <p className={formStyles.helper}>
              Duración estimada: {selectedService.duration_minutes} min. Especialidad: {selectedService.specialty?.name || "No especificada"}.
            </p>
          )}
          {loadingServices && <p className={formStyles.helper}>Cargando servicios...</p>}
          {servicesError && <p className={formStyles.error}>{servicesError}</p>}
          {loadingPatients && <p className={formStyles.helper}>Cargando pacientes...</p>}
          {patientsError && <p className={formStyles.error}>{patientsError}</p>}
          {mode === "create" && !loadingPatients && !patientsError && patients.length === 0 && (
            <p className={formStyles.error}>No hay pacientes disponibles en tu clínica para crear una cita.</p>
          )}
          {mode === "create" && !loadingServices && !servicesError && services.length === 0 && (
            <p className={formStyles.error}>No hay servicios activos disponibles en tu clínica para crear una cita.</p>
          )}
        </section>

        {error && <div className={formStyles.error}>{error}</div>}
      </form>
    </AppModal>
  );
}
