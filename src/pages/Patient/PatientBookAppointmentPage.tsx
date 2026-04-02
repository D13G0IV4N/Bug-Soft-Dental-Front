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
        <p className={styles.welcomeEyebrow}>Agendamiento en línea</p>
        <h2 className={styles.welcomeTitle}>Agenda tu cita</h2>
        <p className={styles.welcomeDescription}>
          Elige el servicio, el odontólogo y la fecha que mejor se ajusten a ti. También puedes agregar el motivo y notas adicionales para una mejor atención.
        </p>
      </header>

      <div className={styles.bookingGrid}>
        <article className={styles.bookingFormCard}>
          <form className={styles.bookingForm} onSubmit={handleSubmit} noValidate>
            <section className={styles.bookingStepSection}>
              <h3 className={styles.bookingStepTitle}>Paso 1 · Selecciona un servicio</h3>
              <p className={styles.bookingStepDescription}>Escoge el tratamiento dental que deseas agendar.</p>

              <label className={styles.bookingFieldLabel} htmlFor="service_id">Servicio</label>
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
              {errors.service_id ? <p className={styles.bookingFieldError}>{errors.service_id}</p> : null}
            </section>

            <section className={styles.bookingStepSection}>
              <h3 className={styles.bookingStepTitle}>Paso 2 · Selecciona un odontólogo</h3>
              <p className={styles.bookingStepDescription}>Selecciona el profesional que te atenderá.</p>

              <label className={styles.bookingFieldLabel} htmlFor="dentist_user_id">Odontólogo</label>
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
              {errors.dentist_user_id ? <p className={styles.bookingFieldError}>{errors.dentist_user_id}</p> : null}
            </section>

            <section className={styles.bookingStepSection}>
              <h3 className={styles.bookingStepTitle}>Paso 3 · Elige fecha y hora</h3>
              <p className={styles.bookingStepDescription}>Selecciona cuándo deseas tu cita. Se guardará con precisión de segundos.</p>

              <label className={styles.bookingFieldLabel} htmlFor="start_at">Fecha y hora</label>
              <input
                id="start_at"
                className={styles.bookingInput}
                type="datetime-local"
                value={form.start_at}
                onChange={(event) => updateField("start_at", event.target.value)}
                step={60}
              />
              {errors.start_at ? <p className={styles.bookingFieldError}>{errors.start_at}</p> : null}
            </section>

            <section className={styles.bookingStepSection}>
              <h3 className={styles.bookingStepTitle}>Paso 4 · Cuéntanos el motivo de tu cita</h3>
              <p className={styles.bookingStepDescription}>Opcional. Esto nos ayuda a preparar mejor tu atención.</p>

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

            <section className={styles.bookingStepSection}>
              <h3 className={styles.bookingStepTitle}>Paso 5 · Agrega notas adicionales</h3>
              <p className={styles.bookingStepDescription}>Opcional. Incluye información relevante para tu cita.</p>

              <label className={styles.bookingFieldLabel} htmlFor="internal_notes">Notas adicionales</label>
              <textarea
                id="internal_notes"
                className={styles.bookingTextarea}
                value={form.internal_notes}
                onChange={(event) => updateField("internal_notes", event.target.value)}
                rows={4}
                placeholder="Ejemplo: horario preferido, antecedentes importantes o indicaciones previas."
              />
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
