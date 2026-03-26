import { useEffect, useMemo, useState, type FormEvent } from "react";
import { type Appointment, type AppointmentPayload, type AppointmentUpdatePayload, type AvailableDentist } from "../../api/appointments";
import formStyles from "../../styles/formSystem.module.css";
import { toDateTimeLocal } from "../Dentist/dateUtils";
import { toDentistRequestError } from "../Dentist/errorUtils";
import dentistStyles from "../Dentist/dentist.module.css";

export interface ReceptionistPatientOption {
  id: number;
  name: string;
  phone?: string;
  email?: string;
}

export interface ReceptionistServiceOption {
  id: number;
  name: string;
  specialtyName?: string;
}

interface Props {
  mode: "create" | "edit";
  appointment?: Appointment;
  patients: ReceptionistPatientOption[];
  knownServices: ReceptionistServiceOption[];
  loadingPatients: boolean;
  patientsError: string;
  loadingDentists: boolean;
  dentistsError: string;
  availableDentists: AvailableDentist[];
  onLookupChange: (serviceId: string, startAt: string) => void;
  onClose: () => void;
  onSubmit: (payload: AppointmentPayload | AppointmentUpdatePayload) => Promise<void>;
}

function trimOrUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export default function ReceptionistAppointmentFormModal({
  mode,
  appointment,
  patients,
  knownServices,
  loadingPatients,
  patientsError,
  loadingDentists,
  dentistsError,
  availableDentists,
  onLookupChange,
  onClose,
  onSubmit,
}: Props) {
  const [patientUserId, setPatientUserId] = useState(appointment?.patient_user_id ? String(appointment.patient_user_id) : "");
  const [serviceId, setServiceId] = useState(appointment?.service_id ? String(appointment.service_id) : "");
  const [startAt, setStartAt] = useState(appointment?.start_at ? toDateTimeLocal(appointment.start_at) : "");
  const [dentistUserId, setDentistUserId] = useState(appointment?.dentist_user_id ? String(appointment.dentist_user_id) : "");
  const [reason, setReason] = useState(appointment?.reason ?? "");
  const [internalNotes, setInternalNotes] = useState(appointment?.internal_notes ?? appointment?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedService = useMemo(
    () => knownServices.find((service) => String(service.id) === serviceId),
    [knownServices, serviceId]
  );

  const selectedPatient = useMemo(
    () => patients.find((patient) => String(patient.id) === patientUserId),
    [patients, patientUserId]
  );

  useEffect(() => {
    setPatientUserId(appointment?.patient_user_id ? String(appointment.patient_user_id) : "");
    setServiceId(appointment?.service_id ? String(appointment.service_id) : "");
    setStartAt(appointment?.start_at ? toDateTimeLocal(appointment.start_at) : "");
    setDentistUserId(appointment?.dentist_user_id ? String(appointment.dentist_user_id) : "");
    setReason(appointment?.reason ?? "");
    setInternalNotes(appointment?.internal_notes ?? appointment?.notes ?? "");
    setError("");
    setSaving(false);
  }, [appointment, mode]);

  useEffect(() => {
    onLookupChange(serviceId, startAt);
  }, [onLookupChange, serviceId, startAt]);

  useEffect(() => {
    if (!dentistUserId) return;
    if (loadingDentists) return;
    const stillAvailable = availableDentists.some((dentist) => String(dentist.id) === dentistUserId);
    if (!stillAvailable) {
      setDentistUserId("");
    }
  }, [availableDentists, dentistUserId, loadingDentists]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!patientUserId || !serviceId || !startAt || !dentistUserId) {
      setError("Selecciona paciente, servicio, horario y dentista disponible para continuar.");
      return;
    }

    try {
      setSaving(true);

      if (mode === "create") {
        const payload: AppointmentPayload = {
          patient_user_id: Number(patientUserId),
          service_id: Number(serviceId),
          start_at: startAt,
          dentist_user_id: Number(dentistUserId),
          reason: trimOrUndefined(reason),
          internal_notes: trimOrUndefined(internalNotes),
        };

        await onSubmit(payload);
        return;
      }

      const payload: AppointmentUpdatePayload = {
        patient_user_id: Number(patientUserId),
        service_id: Number(serviceId),
        start_at: startAt,
        dentist_user_id: Number(dentistUserId),
        reason: trimOrUndefined(reason),
        internal_notes: trimOrUndefined(internalNotes),
      };

      await onSubmit(payload);
    } catch (requestError: unknown) {
      setError(toDentistRequestError(requestError, mode === "create" ? "No se pudo crear la cita" : "No se pudo actualizar la cita"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={formStyles.modalOverlay} onClick={() => !saving && onClose()}>
      <div className={`${formStyles.modalCard} ${dentistStyles.clinicalModal}`.trim()} onClick={(event) => event.stopPropagation()}>
        <header className={dentistStyles.modalHeader}>
          <div>
            <p className={dentistStyles.workspaceTag}>Recepción · Citas</p>
            <h3 className={dentistStyles.heroTitle}>{mode === "create" ? "Nueva cita" : `Editar cita #${appointment?.id ?? ""}`}</h3>
            <p className={dentistStyles.heroSub}>Backend real: /api/appointments y /api/appointments/available-dentists.</p>
          </div>
          <button type="button" className={dentistStyles.btnGhost} disabled={saving} onClick={onClose}>Cerrar</button>
        </header>

        <form className={dentistStyles.formGrid} onSubmit={handleSubmit}>
          <section className={`${dentistStyles.fieldFull} ${dentistStyles.formSectionCard}`.trim()}>
            <p className={dentistStyles.sectionHeading}>Paciente</p>
            <label>
              Paciente
              <select className={dentistStyles.select} value={patientUserId} onChange={(event) => setPatientUserId(event.target.value)} required>
                <option value="">Selecciona paciente</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>{patient.name}</option>
                ))}
              </select>
            </label>
            {selectedPatient && (
              <p className={dentistStyles.rowMeta}>{selectedPatient.email || "Sin correo"} · {selectedPatient.phone || "Sin teléfono"}</p>
            )}
          </section>

          <section className={`${dentistStyles.fieldFull} ${dentistStyles.formSectionCard}`.trim()}>
            <p className={dentistStyles.sectionHeading}>Servicio</p>
            <label>
              ID del servicio
              <input
                list="receptionist-service-options"
                type="number"
                min={1}
                className={dentistStyles.input}
                value={serviceId}
                onChange={(event) => setServiceId(event.target.value)}
                placeholder="Ingresa el ID de servicio"
                required
              />
              <datalist id="receptionist-service-options">
                {knownServices.map((service) => (
                  <option key={service.id} value={service.id} label={`${service.name}${service.specialtyName ? ` · ${service.specialtyName}` : ""}`} />
                ))}
              </datalist>
            </label>
            <p className={dentistStyles.rowMeta}>
              Recepción no tiene acceso confirmado a /api/services. Se sugieren IDs detectados desde citas ya cargadas o puedes escribir uno manualmente.
            </p>
            {selectedService && (
              <p className={dentistStyles.rowMeta}>Servicio detectado: {selectedService.name}{selectedService.specialtyName ? ` · ${selectedService.specialtyName}` : ""}</p>
            )}
          </section>

          <section className={`${dentistStyles.fieldFull} ${dentistStyles.formSectionCard}`.trim()}>
            <p className={dentistStyles.sectionHeading}>Horario y dentista disponible</p>
            <label>
              Inicio
              <input className={dentistStyles.input} type="datetime-local" step={60} value={startAt} onChange={(event) => setStartAt(event.target.value)} required />
            </label>

            <label>
              Dentista
              <select
                className={dentistStyles.select}
                value={dentistUserId}
                onChange={(event) => setDentistUserId(event.target.value)}
                required
                disabled={!serviceId || !startAt || loadingDentists}
              >
                <option value="">{!serviceId || !startAt ? "Selecciona servicio y fecha" : "Selecciona dentista"}</option>
                {availableDentists.map((dentist) => (
                  <option key={dentist.id} value={dentist.id}>
                    {dentist.name || `Dentista #${dentist.id}`}
                  </option>
                ))}
              </select>
            </label>
            {loadingDentists && <p className={dentistStyles.rowMeta}>Buscando dentistas disponibles...</p>}
            {dentistsError && <p className={dentistStyles.feedbackError}>{dentistsError}</p>}
          </section>

          <section className={`${dentistStyles.fieldFull} ${dentistStyles.formSectionCard}`.trim()}>
            <p className={dentistStyles.sectionHeading}>Motivo y notas</p>
            <label>
              Motivo
              <input className={dentistStyles.input} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Opcional" />
            </label>

            <label>
              Notas internas
              <textarea
                className={dentistStyles.textarea}
                value={internalNotes}
                onChange={(event) => setInternalNotes(event.target.value)}
                rows={3}
                placeholder="Opcional"
              />
            </label>
          </section>

          {loadingPatients && <p className={dentistStyles.rowMeta}>Cargando pacientes...</p>}
          {patientsError && <p className={dentistStyles.feedbackError}>{patientsError}</p>}
          {error && (
            <div className={`${dentistStyles.fieldFull} ${dentistStyles.errorPanel}`.trim()}>
              <p className={dentistStyles.errorTitle}>No se pudo guardar la cita.</p>
              <p className={dentistStyles.errorBody}>{error}</p>
            </div>
          )}

          <div className={dentistStyles.modalActions}>
            <button type="button" className={dentistStyles.btnGhost} onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className={dentistStyles.btn} disabled={saving || loadingPatients || loadingDentists}>
              {saving ? "Guardando..." : mode === "create" ? "Crear cita" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
