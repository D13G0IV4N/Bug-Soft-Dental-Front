import { useEffect, useState } from "react";
import {
  createPacientAppointment,
  toErrorMessage,
} from "../../api/appointments";
import {
  getPatientClinicDetails,
  type PatientClinicDentist,
  type PatientClinicService,
} from "../../api/patientClinic";
import styles from "./patient.module.css";

interface BookingFormState {
  service_id: string;
  dentist_user_id: string;
  start_at: string;
  reason: string;
  internal_notes: string;
}

interface BookingErrors {
  service_id?: string;
  dentist_user_id?: string;
  start_at?: string;
}

function formatDateTimeForApi(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?$/);
  if (!match) return trimmed;

  const [, date, time, seconds] = match;
  return `${date} ${time}:${seconds ?? "00"}`;
}

function collectSpecialties(dentist: PatientClinicDentist): string {
  const profileSpecialties = Array.isArray(dentist.dentist_profile?.specialties)
    ? dentist.dentist_profile.specialties.map((specialty) => specialty.name?.trim() ?? "").filter(Boolean)
    : [];

  const names = [
    ...profileSpecialties,
    dentist.specialty?.trim() ?? "",
    dentist.dentist_profile?.specialty?.trim() ?? "",
  ].filter(Boolean);

  return [...new Set(names)].join(" • ");
}

function getDatePart(value: string): string {
  if (!value) return "";
  const [date = ""] = value.split("T");
  return date;
}

function getTimePart(value: string): string {
  if (!value) return "";
  const [, time = ""] = value.split("T");
  return time.slice(0, 5);
}

export default function PatientBookAppointmentPage() {
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [services, setServices] = useState<PatientClinicService[]>([]);
  const [dentists, setDentists] = useState<PatientClinicDentist[]>([]);
  const [form, setForm] = useState<BookingFormState>({
    service_id: "",
    dentist_user_id: "",
    start_at: "",
    reason: "",
    internal_notes: "",
  });
  const [errors, setErrors] = useState<BookingErrors>({});
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        setLoadingData(true);
        const data = await getPatientClinicDetails();
        if (!active) return;

        setServices(data.services);
        setDentists(data.dentists);
        setFetchError("");
      } catch (error) {
        if (!active) return;
        setFetchError(toErrorMessage(error, "No pudimos cargar los datos de la clínica para agendar tu cita."));
      } finally {
        if (active) setLoadingData(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  function updateField<K extends keyof BookingFormState>(field: K, value: BookingFormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSubmitError("");
    setSuccessMessage("");
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function updateDateTimePart(field: "date" | "time", value: string) {
    const currentDate = getDatePart(form.start_at);
    const currentTime = getTimePart(form.start_at);

    const nextDate = field === "date" ? value : currentDate;
    const nextTime = field === "time" ? value : currentTime;

    if (!nextDate && !nextTime) {
      updateField("start_at", "");
      return;
    }

    if (!nextDate) {
      updateField("start_at", `T${nextTime}`);
      return;
    }

    if (!nextTime) {
      updateField("start_at", `${nextDate}T`);
      return;
    }

    updateField("start_at", `${nextDate}T${nextTime}`);
  }

  function validate(): boolean {
    const nextErrors: BookingErrors = {};

    if (!form.service_id) nextErrors.service_id = "Selecciona un servicio para continuar.";
    if (!form.dentist_user_id) nextErrors.dentist_user_id = "Selecciona un odontólogo para continuar.";
    if (!form.start_at) {
      nextErrors.start_at = "Selecciona la fecha y hora de tu cita.";
    } else if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(form.start_at)) {
      nextErrors.start_at = "La fecha y hora no tiene un formato válido.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validate()) {
      setSubmitError("Revisa la información resaltada para poder confirmar tu cita.");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError("");
      setSuccessMessage("");

      await createPacientAppointment({
        service_id: Number(form.service_id),
        dentist_user_id: Number(form.dentist_user_id),
        start_at: formatDateTimeForApi(form.start_at),
        reason: form.reason,
        internal_notes: form.internal_notes,
      });

      setSuccessMessage("¡Tu cita fue agendada correctamente! Te enviaremos los detalles de confirmación.");
      setForm({ service_id: "", dentist_user_id: "", start_at: "", reason: "", internal_notes: "" });
      setErrors({});
    } catch (error) {
      setSubmitError(toErrorMessage(error, "No pudimos agendar tu cita por ahora. Intenta nuevamente en unos minutos."));
    } finally {
      setSubmitting(false);
    }
  }

  const selectedService = services.find((service) => String(service.id) === form.service_id);
  const selectedDentist = dentists.find((dentist) => String(dentist.id) === form.dentist_user_id);
  const selectedDatePart = getDatePart(form.start_at);
  const selectedTimePart = getTimePart(form.start_at);
  const selectionProgress = [form.service_id, form.dentist_user_id, form.start_at].filter(Boolean).length;
  const currentStep = Math.min(5, selectionProgress + 1);
  const summaryReady = Boolean(form.service_id && form.dentist_user_id && form.start_at);

  if (loadingData) {
    return (
      <section className={styles.dashboardRoot}>
        <article className={styles.surfaceCard}>
          <p className={styles.compactState}>Cargando opciones para agendar tu cita...</p>
        </article>
      </section>
    );
  }

  if (fetchError) {
    return (
      <section className={styles.dashboardRoot}>
        <article className={styles.errorCard}>
          <h2 className={styles.errorTitle}>No pudimos preparar el agendamiento.</h2>
          <p className={styles.errorBody}>{fetchError}</p>
          <button className={styles.primaryAction} type="button" onClick={() => window.location.reload()}>
            Reintentar
          </button>
        </article>
      </section>
    );
  }

  return (
    <section className={styles.bookingRoot}>
      <header className={styles.bookingHero}>
        <div>
          <p className={styles.welcomeEyebrow}>Agendamiento en línea</p>
          <h2 className={styles.bookingTitle}>Agenda tu cita</h2>
          <p className={styles.bookingSubtitle}>Completa los pasos y confirma en menos de un minuto.</p>
        </div>
        <div className={styles.bookingProgressPanel} aria-label="Progreso del formulario de agendamiento">
          <p className={styles.bookingProgressText}>Paso {currentStep} de 5</p>
          <div className={styles.bookingProgressTrack} aria-hidden="true">
            <span className={styles.bookingProgressFill} style={{ width: `${Math.max(16, (currentStep / 5) * 100)}%` }} />
          </div>
          <ul className={styles.bookingProgressSteps}>
            <li className={form.service_id ? styles.bookingProgressStepDone : styles.bookingProgressStep}>Servicio</li>
            <li className={form.dentist_user_id ? styles.bookingProgressStepDone : styles.bookingProgressStep}>Odontólogo</li>
            <li className={form.start_at ? styles.bookingProgressStepDone : styles.bookingProgressStep}>Fecha</li>
            <li className={form.reason ? styles.bookingProgressStepDone : styles.bookingProgressStep}>Motivo</li>
            <li className={summaryReady ? styles.bookingProgressStepDone : styles.bookingProgressStep}>Confirmar</li>
          </ul>
        </div>
      </header>

      <div className={styles.bookingGrid}>
        <article className={styles.bookingFormCard}>
          <form className={styles.bookingForm} onSubmit={handleSubmit} noValidate>
            <section className={styles.bookingStepSection}>
              <div className={styles.bookingStepHeading}>
                <p className={styles.bookingStepNumber}>Paso 1</p>
                <h3 className={styles.bookingStepTitle}>Servicio</h3>
              </div>

              <label className={styles.bookingFieldLabel} htmlFor="service_id">Servicio</label>
              <div className={styles.bookingSelectWrap}>
                <select
                  id="service_id"
                  className={styles.bookingSelect}
                  value={form.service_id}
                  onChange={(event) => updateField("service_id", event.target.value)}
                >
                  <option value="">Selecciona un servicio</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                      {service.duration_minutes ? ` · ${service.duration_minutes} min` : ""}
                    </option>
                  ))}
                </select>
                <span className={styles.bookingSelectIcon} aria-hidden="true">▾</span>
              </div>
              {errors.service_id ? <p className={styles.bookingFieldError}>{errors.service_id}</p> : null}
            </section>

            <section className={styles.bookingStepSection}>
              <div className={styles.bookingStepHeading}>
                <p className={styles.bookingStepNumber}>Paso 2</p>
                <h3 className={styles.bookingStepTitle}>Odontólogo</h3>
              </div>

              <label className={styles.bookingFieldLabel} htmlFor="dentist_user_id">Odontólogo</label>
              <div className={styles.bookingSelectWrap}>
                <select
                  id="dentist_user_id"
                  className={styles.bookingSelect}
                  value={form.dentist_user_id}
                  onChange={(event) => updateField("dentist_user_id", event.target.value)}
                >
                  <option value="">Selecciona un odontólogo</option>
                  {dentists.map((dentist) => {
                    const specialties = collectSpecialties(dentist);

                    return (
                      <option key={dentist.id} value={dentist.id}>
                        {dentist.name}
                        {specialties ? ` · ${specialties}` : ""}
                      </option>
                    );
                  })}
                </select>
                <span className={styles.bookingSelectIcon} aria-hidden="true">▾</span>
              </div>
              {errors.dentist_user_id ? <p className={styles.bookingFieldError}>{errors.dentist_user_id}</p> : null}
            </section>

            <section className={styles.bookingStepSection}>
              <div className={styles.bookingStepHeading}>
                <p className={styles.bookingStepNumber}>Paso 3</p>
                <h3 className={styles.bookingStepTitle}>Fecha y hora</h3>
              </div>

              <div className={styles.bookingDateTimeGrid}>
                <div>
                  <label className={styles.bookingFieldLabel} htmlFor="booking_date">Fecha</label>
                  <input
                    id="booking_date"
                    className={styles.bookingInput}
                    type="date"
                    value={selectedDatePart}
                    onChange={(event) => updateDateTimePart("date", event.target.value)}
                  />
                </div>
                <div>
                  <label className={styles.bookingFieldLabel} htmlFor="booking_time">Hora</label>
                  <input
                    id="booking_time"
                    className={styles.bookingInput}
                    type="time"
                    value={selectedTimePart}
                    onChange={(event) => updateDateTimePart("time", event.target.value)}
                    step={60}
                  />
                </div>
              </div>
              {form.start_at ? (
                <p className={styles.bookingSelectionHint}>
                  Seleccionaste: <strong>{selectedDatePart}</strong> a las <strong>{selectedTimePart}</strong>.
                </p>
              ) : null}
              {errors.start_at ? <p className={styles.bookingFieldError}>{errors.start_at}</p> : null}
            </section>

            <section className={`${styles.bookingStepSection} ${styles.bookingStepSectionSoft}`}>
              <div className={styles.bookingStepHeading}>
                <p className={styles.bookingStepNumber}>Paso 4 · Opcional</p>
                <h3 className={styles.bookingStepTitle}>Motivo de la cita</h3>
              </div>

              <label className={styles.bookingFieldLabel} htmlFor="reason">Motivo de la cita</label>
              <textarea
                id="reason"
                className={styles.bookingTextarea}
                value={form.reason}
                onChange={(event) => updateField("reason", event.target.value)}
                rows={3}
                placeholder="Ejemplo: dolor en una muela, control general, limpieza..."
              />
            </section>

            <section className={`${styles.bookingStepSection} ${styles.bookingStepSectionSoft}`}>
              <button
                className={styles.bookingNotesToggle}
                type="button"
                onClick={() => setShowNotes((prev) => !prev)}
                aria-expanded={showNotes}
                aria-controls="booking_internal_notes_group"
              >
                <span>Notas adicionales (opcional)</span>
                <span aria-hidden="true">{showNotes ? "−" : "+"}</span>
              </button>

              {showNotes ? (
                <div id="booking_internal_notes_group" className={styles.bookingNotesPanel}>
                  <label className={styles.bookingFieldLabel} htmlFor="internal_notes">Notas adicionales</label>
                  <textarea
                    id="internal_notes"
                    className={styles.bookingTextarea}
                    value={form.internal_notes}
                    onChange={(event) => updateField("internal_notes", event.target.value)}
                    rows={3}
                    placeholder="Horario preferido, antecedentes importantes o indicaciones previas."
                  />
                </div>
              ) : null}
            </section>

            <section className={styles.bookingSummaryCard}>
              <h3 className={styles.bookingSummaryTitle}>Resumen de tu cita</h3>
              <dl className={styles.bookingSummaryList}>
                <div>
                  <dt>Servicio</dt>
                  <dd>{selectedService?.name ?? "Pendiente de selección"}</dd>
                </div>
                <div>
                  <dt>Odontólogo</dt>
                  <dd>{selectedDentist?.name ?? "Pendiente de selección"}</dd>
                </div>
                <div>
                  <dt>Fecha y hora</dt>
                  <dd>{form.start_at ? `${selectedDatePart} · ${selectedTimePart}` : "Pendiente de selección"}</dd>
                </div>
                {form.reason ? (
                  <div>
                    <dt>Motivo</dt>
                    <dd>{form.reason}</dd>
                  </div>
                ) : null}
              </dl>
            </section>

            {submitError ? <p className={styles.bookingAlertError}>{submitError}</p> : null}
            {successMessage ? <p className={styles.bookingAlertSuccess}>{successMessage}</p> : null}

            <button className={styles.bookingSubmitButton} type="submit" disabled={submitting}>
              {submitting ? "Confirmando cita..." : "Confirmar cita"}
            </button>
          </form>
        </article>
      </div>
    </section>
  );
}
