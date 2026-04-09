import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPacientAppointments, toErrorMessage, type Appointment } from "../../api/appointments";
import { getStoredUser } from "../../utils/auth";
import { parseAppointmentDateTime } from "../Dentist/dateUtils";
import styles from "./patient.module.css";

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
});

const timeFormatter = new Intl.DateTimeFormat("es-MX", {
  hour: "numeric",
  minute: "2-digit",
});

function getAppointmentDate(value?: string) {
  const parsed = parseAppointmentDateTime(value);
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

function formatAppointmentDate(value?: string) {
  const parsed = getAppointmentDate(value);
  return parsed ? dateFormatter.format(parsed) : "Fecha pendiente";
}

function formatAppointmentShortDate(value?: string) {
  const parsed = getAppointmentDate(value);
  return parsed ? shortDateFormatter.format(parsed) : "--";
}

function formatAppointmentTime(value?: string) {
  const parsed = getAppointmentDate(value);
  return parsed ? timeFormatter.format(parsed) : "Hora pendiente";
}

function isCanceled(status?: string) {
  const normalized = (status ?? "").toLowerCase();
  return normalized === "canceled" || normalized === "cancelled";
}

function getStatusLabel(status?: string) {
  const normalized = (status ?? "scheduled").toLowerCase();
  if (normalized === "pending") return "Pendiente";
  if (normalized === "confirmed") return "Confirmada";
  if (normalized === "completed") return "Completada";
  if (normalized === "canceled" || normalized === "cancelled") return "Cancelada";
  if (normalized === "no_show") return "Inasistencia";
  return "Programada";
}

const quickActions = [
  { label: "Agendar cita", hint: "Nueva consulta", to: "/patient/book" },
  { label: "Mis citas", hint: "Próximas y pasadas", to: "/patient/appointments" },
  { label: "Ver historial", hint: "Tratamientos previos", to: "/patient/appointments" },
  { label: "Mi perfil", hint: "Datos personales", to: "/patient/profile" },
];

export default function PatientHomePage() {
  const navigate = useNavigate();
  const storedUser = useMemo(() => getStoredUser(), []);
  const firstName = storedUser?.name?.trim()?.split(/\s+/)[0] || "Paciente";

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
          const first = getAppointmentDate(a.start_at)?.getTime() ?? 0;
          const second = getAppointmentDate(b.start_at)?.getTime() ?? 0;
          return first - second;
        });

        setAppointments(sorted);
        setError("");
      } catch (requestError: unknown) {
        if (!active) return;
        setAppointments([]);
        setError(toErrorMessage(requestError, "No pudimos cargar tus próximas citas por el momento."));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadAppointments();

    return () => {
      active = false;
    };
  }, []);

  const nextAppointment = useMemo(() => {
    const now = new Date().getTime();

    return (
      appointments.find((appointment) => {
        const startsAt = getAppointmentDate(appointment.start_at)?.getTime();
        if (!startsAt) return false;
        if (startsAt < now) return false;
        if (isCanceled(appointment.status)) return false;
        return (appointment.status ?? "").toLowerCase() !== "completed";
      }) ?? null
    );
  }, [appointments]);

  const recentVisits = useMemo(() => {
    const now = new Date().getTime();
    return appointments
      .filter((appointment) => {
        const startsAt = getAppointmentDate(appointment.start_at)?.getTime();
        if (!startsAt) return false;
        if (startsAt >= now) return false;
        return (appointment.status ?? "").toLowerCase() === "completed";
      })
      .sort((a, b) => {
        const first = getAppointmentDate(a.start_at)?.getTime() ?? 0;
        const second = getAppointmentDate(b.start_at)?.getTime() ?? 0;
        return second - first;
      })
      .slice(0, 3);
  }, [appointments]);

  const canReschedule = Boolean(nextAppointment && ["scheduled", "pending", "confirmed"].includes((nextAppointment.status ?? "").toLowerCase()));

  return (
    <section className={styles.dashboardRoot}>
      <header className={styles.mobileGreetingHeader}>
        <p className={styles.mobileGreetingEyebrow}>Resumen de hoy</p>
        <h2 className={styles.mobileGreetingTitle}>Hola, {firstName}</h2>
        <p className={styles.mobileGreetingSubtitle}>Aquí tienes tu actividad dental más importante.</p>
      </header>

      <article className={styles.nextAppointmentHero}>
        <div className={styles.nextAppointmentHeroTop}>
          <div>
            <p className={styles.sectionEyebrow}>Próxima cita</p>
            <h3 className={styles.nextAppointmentHeroTitle}>Tu siguiente visita</h3>
          </div>
          {nextAppointment ? <span className={styles.statusPill}>{getStatusLabel(nextAppointment.status)}</span> : null}
        </div>

        {loading ? (
          <p className={styles.compactState}>Cargando tu agenda...</p>
        ) : error ? (
          <div className={styles.errorCard}>
            <p className={styles.errorTitle}>No pudimos cargar tus citas.</p>
            <p className={styles.errorBody}>{error}</p>
            <button className={styles.primaryAction} type="button" onClick={() => window.location.reload()}>
              Reintentar
            </button>
          </div>
        ) : nextAppointment ? (
          <>
            <div className={styles.appointmentHeroGrid}>
              <div className={styles.appointmentDateChip}>
                <strong>{formatAppointmentShortDate(nextAppointment.start_at)}</strong>
                <span>{formatAppointmentTime(nextAppointment.start_at)}</span>
              </div>
              <div className={styles.appointmentHeroInfo}>
                <p className={styles.appointmentService}>
                  {nextAppointment.service?.name || nextAppointment.service_name || "Servicio por confirmar"}
                </p>
                <p className={styles.appointmentDate}>{formatAppointmentDate(nextAppointment.start_at)}</p>
                <p className={styles.appointmentDentist}>
                  {nextAppointment.dentist?.name || nextAppointment.dentist_name || "Odontólogo por asignar"}
                </p>
              </div>
            </div>
            <div className={styles.heroActionsRow}>
              <button className={styles.primaryAction} type="button" onClick={() => navigate("/patient/appointments")}>
                Ver detalles
              </button>
              <button
                className={styles.secondaryAction}
                type="button"
                onClick={() => navigate("/patient/book")}
                disabled={!canReschedule}
              >
                Reprogramar
              </button>
              <button className={styles.ghostAction} type="button" onClick={() => navigate("/patient/appointments")}>
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <div className={styles.emptyStateCard}>
            <h4 className={styles.emptyStateTitle}>No tienes una cita próxima.</h4>
            <p className={styles.emptyStateText}>Agenda tu siguiente revisión en menos de un minuto.</p>
            <button className={styles.primaryAction} type="button" onClick={() => navigate("/patient/book")}>
              Agendar ahora
            </button>
          </div>
        )}
      </article>

      <article className={styles.surfaceCard}>
        <div className={styles.quickActionsHeader}>
          <p className={styles.sectionEyebrow}>Accesos rápidos</p>
          <h3 className={styles.sectionTitle}>¿Qué necesitas hacer?</h3>
        </div>
        <div className={styles.quickActionGrid}>
          {quickActions.map((action) => (
            <button key={action.label} className={styles.quickActionButton} type="button" onClick={() => navigate(action.to)}>
              <span>{action.label}</span>
              <small>{action.hint}</small>
            </button>
          ))}
        </div>
      </article>

      <article className={styles.surfaceCard}>
        <div className={styles.quickActionsHeader}>
          <p className={styles.sectionEyebrow}>Historial reciente</p>
          <h3 className={styles.sectionTitle}>Últimas visitas</h3>
        </div>
        {loading ? (
          <p className={styles.compactState}>Cargando actividad...</p>
        ) : recentVisits.length === 0 ? (
          <p className={styles.compactState}>Aún no tienes visitas completadas.</p>
        ) : (
          <ul className={styles.historyList}>
            {recentVisits.map((visit) => (
              <li className={styles.historyItem} key={visit.id}>
                <div>
                  <p className={styles.historyService}>{visit.service?.name || visit.service_name || "Cita dental"}</p>
                  <p className={styles.historyDate}>{formatAppointmentDate(visit.start_at)}</p>
                </div>
                <span className={styles.historyTag}>Completada</span>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}
