import { useEffect, useMemo, useState } from "react";
import {
  getAppointments,
  toErrorMessage,
  type Appointment,
} from "../../api/appointments";
import { getStoredUser } from "../../utils/auth";
import { parseAppointmentDateTime } from "../Dentist/dateUtils";
import styles from "./patient.module.css";

type PlaceholderAction = "services" | "booking" | null;

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  weekday: "long",
  day: "numeric",
  month: "long",
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
  if (normalized === "no_show") return "No asistió";
  return "Programada";
}

function getActionMessage(action: PlaceholderAction) {
  if (action === "services") {
    return "Tu módulo de servicios se conectará aquí para que revises tratamientos sin salir del portal.";
  }

  if (action === "booking") {
    return "La reserva online se habilitará en este acceso, manteniendo este inicio limpio y directo.";
  }

  return "Usa una acción rápida para abrir funciones nuevas conforme se habiliten.";
}

export default function PatientHomePage() {
  const storedUser = useMemo(() => getStoredUser(), []);
  const firstName = storedUser?.name?.trim()?.split(/\s+/)[0] || "Paciente";

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [placeholderAction, setPlaceholderAction] = useState<PlaceholderAction>(null);

  useEffect(() => {
    let active = true;

    async function loadAppointments() {
      try {
        setLoading(true);
        const response = await getAppointments();
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
        setError(toErrorMessage(requestError, "No pudimos cargar tus citas. Intenta nuevamente."));
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

  const pendingConfirmations = useMemo(
    () => appointments.filter((appointment) => (appointment.status ?? "").toLowerCase() === "pending").length,
    [appointments]
  );

  const helperReminder = useMemo(() => {
    if (loading) return "Estamos actualizando tu agenda personal.";
    if (error) return "No pudimos verificar tu agenda por ahora.";
    if (pendingConfirmations > 0) return `Tienes ${pendingConfirmations} cita(s) pendiente(s) de confirmación.`;
    if (!nextAppointment) return "Aún no tienes una próxima cita programada.";
    return "Todo en orden: tu próxima cita ya está registrada.";
  }, [error, loading, nextAppointment, pendingConfirmations]);

  return (
    <section className={styles.home}>
      <article className={styles.welcomeBlock}>
        <p className={styles.welcomeEyebrow}>Inicio</p>
        <h1 className={styles.welcomeTitle}>Bienvenido, {firstName}</h1>
        <p className={styles.welcomeLead}>
          Tu panel ahora está enfocado en lo esencial: próxima cita, acciones clave y un recordatorio útil.
        </p>
      </article>

      <article className={styles.spotlightCard}>
        <div className={styles.spotlightHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Próxima cita</p>
            <h2 className={styles.spotlightTitle}>Tu siguiente visita</h2>
          </div>
          {!loading && nextAppointment ? (
            <span className={styles.statusBadge}>{getStatusLabel(nextAppointment.status)}</span>
          ) : null}
        </div>

        {loading ? (
          <p className={styles.spotlightLoading}>Cargando agenda...</p>
        ) : error ? (
          <div className={styles.feedbackPanel}>
            <p className={styles.feedbackTitle}>No se pudo cargar la cita.</p>
            <p className={styles.feedbackBody}>{error}</p>
            <button className={styles.primaryButton} type="button" onClick={() => window.location.reload()}>
              Reintentar
            </button>
          </div>
        ) : nextAppointment ? (
          <div className={styles.spotlightBody}>
            <p className={styles.spotlightDate}>{formatAppointmentDate(nextAppointment.start_at)}</p>
            <p className={styles.spotlightTime}>{formatAppointmentTime(nextAppointment.start_at)}</p>
            <p className={styles.spotlightService}>
              {nextAppointment.service?.name || nextAppointment.service_name || "Servicio pendiente"}
            </p>
            <p className={styles.spotlightMeta}>
              {nextAppointment.dentist?.name || nextAppointment.dentist_name || "Dentista por confirmar"}
            </p>
          </div>
        ) : (
          <p className={styles.emptyText}>No hay una cita próxima registrada en este momento.</p>
        )}
      </article>

      <section className={styles.bottomGrid}>
        <article className={styles.actionsCard}>
          <div className={styles.actionsHeader}>
            <p className={styles.sectionEyebrow}>Acciones rápidas</p>
            <h3 className={styles.actionsTitle}>Lo que más usarás</h3>
          </div>

          <div className={styles.actionsRow}>
            <button className={styles.secondaryButton} type="button" onClick={() => setPlaceholderAction(null)}>
              Ver mi agenda
            </button>
            <button className={styles.secondaryButton} type="button" onClick={() => setPlaceholderAction("services")}>
              Explorar servicios
            </button>
            <button className={styles.secondaryButton} type="button" onClick={() => setPlaceholderAction("booking")}>
              Reservar cita
            </button>
          </div>

          <p className={styles.inlineHelper}>{getActionMessage(placeholderAction)}</p>
        </article>

        <article className={styles.reminderCard}>
          <p className={styles.sectionEyebrow}>Qué sigue</p>
          <h3 className={styles.reminderTitle}>Recordatorio útil</h3>
          <p className={styles.reminderBody}>{helperReminder}</p>
        </article>
      </section>
    </section>
  );
}
