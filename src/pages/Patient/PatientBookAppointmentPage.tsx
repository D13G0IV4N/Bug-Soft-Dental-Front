import { useEffect, useMemo, useState } from "react";
import {
  createPacientAppointment,
  getPacientAppointments,
  toErrorMessage,
} from "../../api/appointments";
import {
  getPatientClinicDetails,
  getPatientServiceDentists,
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

interface DayAvailability {
  available: string[];
  unavailable: string[];
}

const CALENDAR_DAYS_AHEAD = 21;
const SLOT_INTERVAL_MINUTES = 30;
const SLOT_START_HOUR = 9;
const SLOT_END_HOUR = 18;

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

function normalizeDateTime(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getSlotCatalog() {
  const slots: string[] = [];
  for (let hour = SLOT_START_HOUR; hour < SLOT_END_HOUR; hour += 1) {
    for (let minute = 0; minute < 60; minute += SLOT_INTERVAL_MINUTES) {
      slots.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    }
  }
  return slots;
}

const SLOT_CATALOG = getSlotCatalog();

function getMonthMatrix(currentMonth: Date) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const matrix: Array<Date | null> = [];

  for (let index = 0; index < startOffset; index += 1) {
    matrix.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    matrix.push(new Date(year, month, day));
  }

  while (matrix.length % 7 !== 0) {
    matrix.push(null);
  }

  return matrix;
}

export default function PatientBookAppointmentPage() {
  const todayDateOnly = useMemo(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }, []);
  const maxDate = useMemo(() => addDays(todayDateOnly, CALENDAR_DAYS_AHEAD - 1), [todayDateOnly]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [availabilityError, setAvailabilityError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [services, setServices] = useState<PatientClinicService[]>([]);
  const [allDentists, setAllDentists] = useState<PatientClinicDentist[]>([]);
  const [dentists, setDentists] = useState<PatientClinicDentist[]>([]);
  const [availabilityByDate, setAvailabilityByDate] = useState<Record<string, DayAvailability>>({});
  const [form, setForm] = useState<BookingFormState>({
    service_id: "",
    dentist_user_id: "",
    start_at: "",
    reason: "",
    internal_notes: "",
  });
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [errors, setErrors] = useState<BookingErrors>({});
  const [showNotes, setShowNotes] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date(todayDateOnly.getFullYear(), todayDateOnly.getMonth(), 1));

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        setLoadingData(true);
        const data = await getPatientClinicDetails();
        if (!active) return;

        setServices(data.services);
        setAllDentists(data.dentists);
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

  function handleDateSelect(date: string) {
    setSelectedDate(date);
    setSelectedTime((prev) => (date === selectedDate ? prev : ""));
    setSubmitError("");
    setSuccessMessage("");
    setErrors((prev) => ({ ...prev, start_at: undefined }));
  }

  function handleTimeSelect(time: string) {
    setSelectedTime(time);
    setSubmitError("");
    setSuccessMessage("");
    setErrors((prev) => ({ ...prev, start_at: undefined }));
  }

  function resetDateTimeSelection() {
    setSelectedDate("");
    setSelectedTime("");
    setForm((prev) => ({ ...prev, start_at: "" }));
  }

  function validate(): boolean {
    const nextErrors: BookingErrors = {};

    if (!form.service_id) nextErrors.service_id = "Selecciona un servicio para continuar.";
    if (!form.dentist_user_id) nextErrors.dentist_user_id = "Selecciona un odontólogo para continuar.";
    const selectedDate = getDatePart(form.start_at);
    const selectedTime = getTimePart(form.start_at);
    const dayAvailability = selectedDate ? availabilityByDate[selectedDate] : undefined;
    const isAvailableSlot = Boolean(dayAvailability?.available.includes(selectedTime));

    if (!form.start_at || !selectedDate || !selectedTime) {
      nextErrors.start_at = "Selecciona la fecha y hora de tu cita.";
    } else if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(form.start_at)) {
      nextErrors.start_at = "La fecha y hora no tiene un formato válido.";
    } else if (!isAvailableSlot) {
      nextErrors.start_at = "La hora elegida ya no está disponible. Selecciona otro horario.";
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
      setSelectedDate("");
      setSelectedTime("");
      setErrors({});
    } catch (error) {
      setSubmitError(toErrorMessage(error, "No pudimos agendar tu cita por ahora. Intenta nuevamente en unos minutos."));
    } finally {
      setSubmitting(false);
    }
  }

  const selectedService = services.find((service) => String(service.id) === form.service_id);
  const selectedDentist = dentists.find((dentist) => String(dentist.id) === form.dentist_user_id);
  const selectedDatePart = selectedDate;
  const selectedTimePart = selectedTime;
  const selectedDayAvailability = selectedDatePart ? availabilityByDate[selectedDatePart] : undefined;
  const availableTimesForSelectedDate = selectedDayAvailability?.available ?? [];
  const unavailableTimesForSelectedDate = selectedDayAvailability?.unavailable ?? [];
  const selectionProgress = [form.service_id, form.dentist_user_id, form.start_at].filter(Boolean).length;
  const currentStep = Math.min(5, selectionProgress + 1);
  const summaryReady = Boolean(form.service_id && form.dentist_user_id && form.start_at);
  const monthMatrix = getMonthMatrix(visibleMonth);
  const selectedDateAsDate = selectedDatePart ? new Date(`${selectedDatePart}T00:00:00`) : null;
  const canSeePreviousMonth = visibleMonth.getFullYear() > todayDateOnly.getFullYear()
    || (visibleMonth.getFullYear() === todayDateOnly.getFullYear() && visibleMonth.getMonth() > todayDateOnly.getMonth());
  const canSeeNextMonth = visibleMonth.getFullYear() < maxDate.getFullYear()
    || (visibleMonth.getFullYear() === maxDate.getFullYear() && visibleMonth.getMonth() < maxDate.getMonth());

  useEffect(() => {
    const nextStartAt = selectedDate && selectedTime ? `${selectedDate}T${selectedTime}` : "";
    setForm((prev) => (prev.start_at === nextStartAt ? prev : { ...prev, start_at: nextStartAt }));
  }, [selectedDate, selectedTime]);

  useEffect(() => {
    const serviceId = Number(form.service_id);

    if (!serviceId) {
      setDentists(allDentists);
      return;
    }

    let active = true;

    void (async () => {
      try {
        const serviceDentists = await getPatientServiceDentists(serviceId);
        if (!active) return;
        setDentists(serviceDentists);
        setAvailabilityError("");
      } catch (error) {
        if (!active) return;
        setDentists([]);
        setAvailabilityError(
          toErrorMessage(error, "No pudimos cargar los odontólogos disponibles para este servicio.")
        );
      }
    })();

    return () => {
      active = false;
    };
  }, [allDentists, form.service_id]);

  useEffect(() => {
    if (!form.dentist_user_id) return;
    const stillAvailable = dentists.some((dentist) => String(dentist.id) === form.dentist_user_id);
    if (!stillAvailable) {
      setForm((prev) => ({ ...prev, dentist_user_id: "", start_at: "" }));
      setSelectedDate("");
      setSelectedTime("");
      setErrors((prev) => ({ ...prev, dentist_user_id: undefined, start_at: undefined }));
      setSubmitError("");
      setSuccessMessage("");
    }
  }, [dentists, form.dentist_user_id]);

  useEffect(() => {
    const dentistId = Number(form.dentist_user_id);

    if (!form.service_id || !dentistId) {
      setAvailabilityByDate({});
      setAvailabilityError("");
      setLoadingAvailability(false);
      return;
    }

    let active = true;

    void (async () => {
      setLoadingAvailability(true);
      setAvailabilityError("");

      try {
        const patientAppointments = await getPacientAppointments();
        const dateRange = Array.from({ length: CALENDAR_DAYS_AHEAD }, (_, index) => toDateInputValue(addDays(todayDateOnly, index)));
        const dateRangeSet = new Set(dateRange);
        const blockedByPatient = new Set(
          patientAppointments
            .map((appointment) => normalizeDateTime(appointment.start_at))
            .filter(Boolean)
            .map((startAt) => {
              const date = getDatePart(startAt);
              const time = getTimePart(startAt);
              return dateRangeSet.has(date) ? `${date}T${time}` : "";
            })
            .filter(Boolean)
        );

        const availabilityEntries = dateRange.map((dateKey) => {
          const available = SLOT_CATALOG.filter((time) => !blockedByPatient.has(`${dateKey}T${time}`));
          const unavailable = SLOT_CATALOG.filter((time) => blockedByPatient.has(`${dateKey}T${time}`));
          return [dateKey, { available, unavailable }] as const;
        });

        if (!active) return;

        setAvailabilityByDate(Object.fromEntries(availabilityEntries));
      } catch (error) {
        if (!active) return;
        setAvailabilityByDate({});
        setAvailabilityError(
          toErrorMessage(
            error,
            "No pudimos cargar la disponibilidad con los endpoints de paciente. Revisa permisos/configuración del backend."
          )
        );
      } finally {
        if (active) setLoadingAvailability(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [form.service_id, form.dentist_user_id, todayDateOnly]);

  useEffect(() => {
    if (!selectedDatePart || !selectedTimePart) return;
    const dayAvailability = availabilityByDate[selectedDatePart];
    if (!dayAvailability || dayAvailability.available.includes(selectedTimePart)) return;
    setSelectedTime("");
  }, [availabilityByDate, selectedDatePart, selectedTimePart]);

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
                  onChange={(event) => {
                    updateField("service_id", event.target.value);
                    resetDateTimeSelection();
                  }}
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
                  onChange={(event) => {
                    updateField("dentist_user_id", event.target.value);
                    resetDateTimeSelection();
                  }}
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
                  <label className={styles.bookingFieldLabel}>Fecha</label>
                  <div className={styles.bookingCalendarHeader}>
                    <button
                      type="button"
                      className={styles.bookingCalendarNav}
                      onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                      disabled={!canSeePreviousMonth}
                      aria-label="Mes anterior"
                    >
                      ←
                    </button>
                    <p className={styles.bookingCalendarMonthLabel}>
                      {visibleMonth.toLocaleDateString("es-MX", { month: "long", year: "numeric" })}
                    </p>
                    <button
                      type="button"
                      className={styles.bookingCalendarNav}
                      onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                      disabled={!canSeeNextMonth}
                      aria-label="Mes siguiente"
                    >
                      →
                    </button>
                  </div>
                  <div className={styles.bookingCalendarWeekdays} aria-hidden="true">
                    {["L", "M", "X", "J", "V", "S", "D"].map((weekday) => (
                      <span key={weekday}>{weekday}</span>
                    ))}
                  </div>
                  <div className={styles.bookingCalendarGrid}>
                    {monthMatrix.map((dateCell, index) => {
                      if (!dateCell) {
                        return <span key={`empty-${index}`} className={styles.bookingCalendarEmpty} />;
                      }

                      const dateKey = toDateInputValue(dateCell);
                      const isInRange = dateCell >= todayDateOnly && dateCell <= maxDate;
                      const hasAvailability = (availabilityByDate[dateKey]?.available.length ?? 0) > 0;
                      const isSelected = selectedDateAsDate
                        ? dateCell.getFullYear() === selectedDateAsDate.getFullYear()
                          && dateCell.getMonth() === selectedDateAsDate.getMonth()
                          && dateCell.getDate() === selectedDateAsDate.getDate()
                        : false;
                      const isDisabled = !isInRange || loadingAvailability || !hasAvailability;

                      return (
                        <button
                          key={dateKey}
                          type="button"
                          className={`${styles.bookingCalendarDay} ${isSelected ? styles.bookingCalendarDaySelected : ""} ${isDisabled ? styles.bookingCalendarDayDisabled : ""}`.trim()}
                          disabled={isDisabled}
                          onClick={() => handleDateSelect(dateKey)}
                          title={hasAvailability ? "Día con horarios disponibles" : "Sin horarios disponibles"}
                        >
                          {dateCell.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className={styles.bookingFieldLabel}>Hora</label>
                  {!selectedDatePart ? (
                    <p className={styles.bookingSelectionHint}>Selecciona una fecha con horarios disponibles.</p>
                  ) : (
                    <div className={styles.bookingSlotGrid}>
                      {[...availableTimesForSelectedDate, ...unavailableTimesForSelectedDate].map((time) => {
                        const isAvailable = availableTimesForSelectedDate.includes(time);
                        const isSelected = selectedTimePart === time;

                        return (
                          <button
                            key={time}
                            type="button"
                            className={`${styles.bookingSlotButton} ${isSelected ? styles.bookingSlotButtonSelected : ""}`.trim()}
                            disabled={!isAvailable}
                            onClick={() => handleTimeSelect(time)}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {selectedDatePart && !loadingAvailability && availableTimesForSelectedDate.length === 0 ? (
                    <p className={styles.bookingFieldError}>Este día ya no tiene horarios disponibles.</p>
                  ) : null}
                </div>
              </div>
              {loadingAvailability ? <p className={styles.bookingSelectionHint}>Consultando disponibilidad real...</p> : null}
              {availabilityError ? <p className={styles.bookingFieldError}>{availabilityError}</p> : null}
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

            <button className={styles.bookingSubmitButton} type="submit" disabled={submitting || loadingAvailability || !summaryReady}>
              {submitting ? "Confirmando cita..." : "Confirmar cita"}
            </button>
          </form>
        </article>
      </div>
    </section>
  );
}
