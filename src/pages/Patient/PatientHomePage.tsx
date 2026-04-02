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

function DashboardSectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <header className={styles.sectionHeader}>
      <p className={styles.sectionEyebrow}>{eyebrow}</p>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <p className={styles.sectionDescription}>{description}</p>
    </header>
  );
}

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
      .slice(0, 2);
  }, [appointments]);

  return (
    <section className={styles.dashboardRoot}>
      <header className={styles.welcomeHero}>
        <div>
          <p className={styles.welcomeEyebrow}>Panel de paciente</p>
          <h2 className={styles.welcomeTitle}>Bienvenido de nuevo, {firstName}.</h2>
          <p className={styles.welcomeDescription}>
            Este es tu resumen de cuidado. Revisa tu próxima cita y elige qué deseas hacer a continuación.
          </p>
        </div>
      </header>

      <article className={styles.featuredCard}>
        <DashboardSectionHeader
          eyebrow="Destacado"
          title="Tu próxima cita"
          description="Todo lo importante para tu próxima visita dental en un solo lugar."
        />

        {loading ? (
          <p className={styles.featuredState}>Cargando tu agenda de citas...</p>
        ) : error ? (
          <div className={styles.errorCard}>
            <p className={styles.errorTitle}>No pudimos cargar la información de tus citas.</p>
            <p className={styles.errorBody}>{error}</p>
            <button className={styles.primaryAction} type="button" onClick={() => window.location.reload()}>
              Actualizar panel
            </button>
          </div>
        ) : nextAppointment ? (
          <div className={styles.appointmentSpotlight}>
            <p className={styles.appointmentDate}>{formatAppointmentDate(nextAppointment.start_at)}</p>
            <p className={styles.appointmentTime}>{formatAppointmentTime(nextAppointment.start_at)}</p>
            <p className={styles.appointmentService}>
              {nextAppointment.service?.name || nextAppointment.service_name || "Servicio por confirmar"}
            </p>
            <div className={styles.appointmentMeta}>
              <span>{nextAppointment.dentist?.name || nextAppointment.dentist_name || "Odontólogo por asignar"}</span>
              <span className={styles.statusPill}>{getStatusLabel(nextAppointment.status)}</span>
            </div>
          </div>
        ) : (
          <div className={styles.emptyStateCard}>
            <h4 className={styles.emptyStateTitle}>Aún no tienes una cita próxima.</h4>
            <p className={styles.emptyStateText}>Agenda tu siguiente revisión para cuidar tu salud bucal a tiempo.</p>
            <button className={styles.primaryAction} type="button" onClick={() => navigate("/patient/book")}>
              Agendar cita
            </button>
          </div>
        )}
      </article>

      <section className={styles.secondaryGrid}>
        <article className={styles.surfaceCard}>
          <DashboardSectionHeader
            eyebrow="Acciones rápidas"
            title="Elige tu siguiente paso"
            description="Solo lo esencial para que tu atención dental sea simple y clara."
          />
          <div className={styles.quickActionGrid}>
            <button className={styles.quickActionButton} type="button" onClick={() => navigate("/patient/book")}>Agendar cita</button>
            <button className={styles.quickActionButton} type="button" onClick={() => navigate("/patient/appointments")}>Ver citas</button>
            <button className={styles.quickActionButton} type="button" onClick={() => navigate("/patient/services")}>Ver detalles clínica</button>
            <button className={styles.quickActionButton} type="button" onClick={() => navigate("/patient/profile")}>Actualizar perfil</button>
          </div>
        </article>

        <article className={styles.surfaceCard}>
          <DashboardSectionHeader
            eyebrow="Consejo de cuidado"
            title="Recordatorio diario de salud bucal"
            description="Los hábitos pequeños generan una gran diferencia en tu sonrisa."
          />
          <p className={styles.careTipText}>
            Cepilla tus dientes durante dos minutos, usa hilo dental una vez al día y bebe agua después de cada comida.
          </p>
        </article>

        <article className={styles.surfaceCard}>
          <DashboardSectionHeader
            eyebrow="Historial reciente"
            title="Tus últimas visitas completadas"
            description="Una vista rápida de la actividad reciente de tus tratamientos."
          />

          {loading ? (
            <p className={styles.compactState}>Cargando actividad reciente...</p>
          ) : recentVisits.length === 0 ? (
            <p className={styles.compactState}>Aún no tienes visitas completadas. Tu historial aparecerá aquí.</p>
          ) : (
            <ul className={styles.historyList}>
              {recentVisits.map((visit) => (
                <li className={styles.historyItem} key={visit.id}>
                  <p className={styles.historyDate}>{formatAppointmentDate(visit.start_at)}</p>
                  <p className={styles.historyService}>{visit.service?.name || visit.service_name || "Cita dental"}</p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </section>
  );
}
