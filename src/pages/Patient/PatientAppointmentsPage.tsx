import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPacientAppointments, toErrorMessage, type Appointment } from "../../api/appointments";
import { parseAppointmentDateTime } from "../Dentist/dateUtils";
import styles from "./patient.module.css";

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("es-MX", {
  hour: "numeric",
  minute: "2-digit",
});

function parseStartDate(value?: string) {
  const parsed = parseAppointmentDateTime(value);
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

function isCanceled(status?: string) {
  const normalized = (status ?? "").toLowerCase();
  return normalized === "canceled" || normalized === "cancelled";
}

function getStatusKey(status?: string): "scheduled" | "completed" | "cancelled" | "no_show" | "pending" {
  const normalized = (status ?? "scheduled").toLowerCase();
  if (normalized === "completed") return "completed";
  if (normalized === "canceled" || normalized === "cancelled") return "cancelled";
  if (normalized === "no_show") return "no_show";
  if (normalized === "pending") return "pending";
  return "scheduled";
}

function getStatusLabel(status?: string) {
  const statusKey = getStatusKey(status);
  if (statusKey === "pending") return "Pendiente";
  if (statusKey === "completed") return "Completada";
  if (statusKey === "cancelled") return "Cancelada";
  if (statusKey === "no_show") return "Inasistencia";
  return "Programada";
}

function formatAppointmentDate(value?: string) {
  const date = parseStartDate(value);
  return date ? dateFormatter.format(date) : "Fecha pendiente";
}

function formatAppointmentTimeRange(startAt?: string, endAt?: string) {
  const start = parseStartDate(startAt);
  if (!start) return "Horario por confirmar";

  const startLabel = timeFormatter.format(start);
  const end = parseStartDate(endAt);

  if (!end) return startLabel;
  return `${startLabel} - ${timeFormatter.format(end)}`;
}

function getAppointmentService(appointment: Appointment) {
  return appointment.service?.name || appointment.service_name || "Servicio odontológico";
}

function getAppointmentDentist(appointment: Appointment) {
  return appointment.dentist?.name || appointment.dentist_name || "Odontólogo por asignar";
}

function getAppointmentClinic(appointment: Appointment) {
  const candidate = (appointment as Appointment & { clinic?: { name?: string }; clinic_name?: string }).clinic;
  const clinicFromNested = typeof candidate?.name === "string" ? candidate.name.trim() : "";
  const clinicFromName = typeof (appointment as { clinic_name?: string }).clinic_name === "string"
    ? (appointment as { clinic_name?: string }).clinic_name?.trim()
    : "";

  return clinicFromNested || clinicFromName || "";
}

function AppointmentCard({ appointment, emphasize }: { appointment: Appointment; emphasize?: boolean }) {
  const statusKey = getStatusKey(appointment.status);
  const statusLabel = getStatusLabel(appointment.status);
  const reason = appointment.reason?.trim();
  const notes = appointment.internal_notes?.trim();
  const clinic = getAppointmentClinic(appointment);

  return (
    <article className={`${styles.patientAppointmentCard} ${emphasize ? styles.patientAppointmentCardFeatured : ""}`}>
      <header className={styles.patientAppointmentCardHeader}>
        <div>
          <p className={styles.patientAppointmentDate}>{formatAppointmentDate(appointment.start_at)}</p>
          <p className={styles.patientAppointmentTime}>{formatAppointmentTimeRange(appointment.start_at, appointment.end_at)}</p>
        </div>
        <span className={`${styles.patientStatusBadge} ${styles[`patientStatus_${statusKey}`]}`}>{statusLabel}</span>
      </header>

      <div className={styles.patientAppointmentBody}>
        <div className={styles.patientInfoRow}>
          <p className={styles.patientInfoLabel}>Servicio</p>
          <p className={styles.patientInfoValue}>{getAppointmentService(appointment)}</p>
        </div>
        <div className={styles.patientInfoRow}>
          <p className={styles.patientInfoLabel}>Odontólogo</p>
          <p className={styles.patientInfoValue}>{getAppointmentDentist(appointment)}</p>
        </div>
        {clinic && (
          <div className={styles.patientInfoRow}>
            <p className={styles.patientInfoLabel}>Clínica</p>
            <p className={styles.patientInfoValue}>{clinic}</p>
          </div>
        )}
        {reason && (
          <div className={styles.patientInfoRow}>
            <p className={styles.patientInfoLabel}>Motivo</p>
            <p className={styles.patientInfoValueMuted}>{reason}</p>
          </div>
        )}
        {notes && (
          <div className={styles.patientInfoRow}>
            <p className={styles.patientInfoLabel}>Notas</p>
            <p className={styles.patientInfoValueMuted}>{notes}</p>
          </div>
        )}
      </div>
    </article>
  );
}

export default function PatientAppointmentsPage() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAppointments() {
      try {
        setLoading(true);
        const response = await getPacientAppointments();
        if (!active) return;

        const sorted = [...response].sort((a, b) => {
          const first = parseStartDate(a.start_at)?.getTime() ?? 0;
          const second = parseStartDate(b.start_at)?.getTime() ?? 0;
          return first - second;
        });

        setAppointments(sorted);
        setError("");
      } catch (requestError: unknown) {
        if (!active) return;
        setAppointments([]);
        setError(toErrorMessage(requestError, "No pudimos cargar tus citas por ahora."));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadAppointments();

    return () => {
      active = false;
    };
  }, []);

  const { upcoming, history, nextAppointment, completedCount, cancelledCount } = useMemo(() => {
    const now = new Date().getTime();

    const upcomingList = appointments.filter((appointment) => {
      const start = parseStartDate(appointment.start_at)?.getTime();
      if (!start) return false;
      if (start < now) return false;
      const statusKey = getStatusKey(appointment.status);
      return statusKey !== "completed" && statusKey !== "cancelled";
    });

    const historyList = appointments
      .filter((appointment) => {
        const start = parseStartDate(appointment.start_at)?.getTime() ?? 0;
        const statusKey = getStatusKey(appointment.status);
        return start < now || statusKey === "completed" || statusKey === "cancelled";
      })
      .sort((a, b) => (parseStartDate(b.start_at)?.getTime() ?? 0) - (parseStartDate(a.start_at)?.getTime() ?? 0));

    return {
      upcoming: upcomingList,
      history: historyList,
      nextAppointment: upcomingList[0] ?? null,
      completedCount: appointments.filter((appointment) => getStatusKey(appointment.status) === "completed").length,
      cancelledCount: appointments.filter((appointment) => isCanceled(appointment.status)).length,
    };
  }, [appointments]);

  const hasAppointments = appointments.length > 0;

  return (
    <section className={styles.patientAppointmentsRoot}>
      <header className={styles.patientAppointmentsHero}>
        <p className={styles.sectionEyebrow}>Portal de paciente</p>
        <h2 className={styles.patientAppointmentsTitle}>Mis citas</h2>
        <p className={styles.patientAppointmentsDescription}>
          Visualiza tus próximas visitas y tu historial en un solo espacio claro, ordenado y fácil de revisar.
        </p>
      </header>

      {loading ? (
        <article className={styles.patientAppointmentsStateCard}>
          <p className={styles.compactState}>Cargando tus citas...</p>
        </article>
      ) : error ? (
        <article className={styles.errorCard}>
          <p className={styles.errorTitle}>No pudimos cargar tu agenda.</p>
          <p className={styles.errorBody}>{error}</p>
          <button className={styles.primaryAction} type="button" onClick={() => window.location.reload()}>
            Reintentar
          </button>
        </article>
      ) : !hasAppointments ? (
        <article className={styles.patientAppointmentsEmpty}>
          <p className={styles.patientAppointmentsEmptyEyebrow}>Sin citas registradas</p>
          <h3 className={styles.patientAppointmentsEmptyTitle}>Aún no tienes citas en tu agenda</h3>
          <p className={styles.patientAppointmentsEmptyText}>
            Cuando agendes tu primera visita dental, aquí podrás consultar fecha, hora y estado de cada atención.
          </p>
          <button className={styles.primaryAction} type="button" onClick={() => navigate("/patient/book")}>
            Agendar cita
          </button>
        </article>
      ) : (
        <>
          <section className={styles.patientSummaryGrid}>
            <article className={`${styles.patientSummaryCard} ${styles.patientSummaryCardPrimary}`}>
              <p className={styles.patientSummaryLabel}>Próxima cita</p>
              <p className={styles.patientSummaryMain}>
                {nextAppointment ? formatAppointmentDate(nextAppointment.start_at) : "Sin cita próxima"}
              </p>
              <p className={styles.patientSummaryHint}>
                {nextAppointment ? formatAppointmentTimeRange(nextAppointment.start_at, nextAppointment.end_at) : "Agenda tu siguiente control"}
              </p>
            </article>

            <article className={styles.patientSummaryCard}>
              <p className={styles.patientSummaryLabel}>Citas próximas</p>
              <p className={styles.patientSummaryCount}>{upcoming.length}</p>
              <p className={styles.patientSummaryHint}>Incluye programadas y pendientes</p>
            </article>

            <article className={styles.patientSummaryCard}>
              <p className={styles.patientSummaryLabel}>Citas completadas</p>
              <p className={styles.patientSummaryCount}>{completedCount}</p>
              <p className={styles.patientSummaryHint}>Atenciones finalizadas</p>
            </article>

            {cancelledCount > 0 && (
              <article className={styles.patientSummaryCard}>
                <p className={styles.patientSummaryLabel}>Citas canceladas</p>
                <p className={styles.patientSummaryCount}>{cancelledCount}</p>
                <p className={styles.patientSummaryHint}>Puedes reagendar cuando gustes</p>
              </article>
            )}
          </section>

          <section className={styles.patientSectionBlock}>
            <header className={styles.sectionHeader}>
              <p className={styles.sectionEyebrow}>Agenda activa</p>
              <h3 className={styles.sectionTitle}>Próximas citas</h3>
              <p className={styles.sectionDescription}>Tus próximas visitas aparecen destacadas para que no pierdas ningún control.</p>
            </header>

            {upcoming.length === 0 ? (
              <div className={styles.patientInlineEmpty}>
                <p className={styles.emptyStateText}>No tienes citas próximas en este momento.</p>
                <button className={styles.secondaryAction} type="button" onClick={() => navigate("/patient/book")}>Agendar nueva cita</button>
              </div>
            ) : (
              <div className={styles.patientAppointmentsGrid}>
                {upcoming.map((appointment, index) => (
                  <AppointmentCard key={appointment.id ?? `${appointment.start_at}-${index}`} appointment={appointment} emphasize={index === 0} />
                ))}
              </div>
            )}
          </section>

          <section className={styles.patientSectionBlock}>
            <header className={styles.sectionHeader}>
              <p className={styles.sectionEyebrow}>Seguimiento</p>
              <h3 className={styles.sectionTitle}>Historial de citas</h3>
              <p className={styles.sectionDescription}>Revisa tus consultas anteriores, estados finales y motivos de atención.</p>
            </header>

            {history.length === 0 ? (
              <p className={styles.compactState}>Tu historial todavía no tiene registros para mostrar.</p>
            ) : (
              <div className={styles.patientHistoryStack}>
                {history.map((appointment, index) => (
                  <AppointmentCard key={appointment.id ?? `history-${appointment.start_at}-${index}`} appointment={appointment} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
