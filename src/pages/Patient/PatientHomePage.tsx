import { useEffect, useMemo, useRef, useState } from "react";
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

function getStatusLabel(status?: string) {
  const normalized = (status ?? "scheduled").toLowerCase();

  if (normalized === "pending") return "Pendiente";
  if (normalized === "confirmed") return "Confirmada";
  if (normalized === "completed") return "Completada";
  if (normalized === "canceled" || normalized === "cancelled") return "Cancelada";
  if (normalized === "no_show") return "No Asistió";
  return "Programada";
}

function getStatusClass(status?: string) {
  const normalized = (status ?? "scheduled").toLowerCase();

  if (normalized === "pending") return styles.statusPending;
  if (normalized === "confirmed") return styles.statusConfirmed;
  if (normalized === "completed") return styles.statusCompleted;
  if (normalized === "canceled" || normalized === "cancelled") return styles.statusCancelled;
  if (normalized === "no_show") return styles.statusNoShow;
  return styles.statusScheduled;
}

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

function getActionMessage(action: PlaceholderAction) {
  if (action === "services") {
    return {
      title: "Explorar Servicios",
      body:
        "La tarjeta de servicios se conectará en la siguiente fase. La base del portal ya quedó preparada para enlazar esa vista sin rehacer la navegación.",
    };
  }

  if (action === "booking") {
    return {
      title: "Reservar Cita",
      body:
        "La reserva todavía no se implementa en este paso. Este espacio ya anticipa el flujo para que el acceso salga desde aquí cuando conectemos la creación de cita real.",
    };
  }

  return {
    title: "Portal en expansión",
    body:
      "Esta primera pantalla ya usa la arquitectura real del proyecto y deja listos los puntos de entrada para citas, servicios y reserva.",
  };
}

export default function PatientHomePage() {
  const storedUser = useMemo(() => getStoredUser(), []);
  const firstName = storedUser?.name?.trim()?.split(/\s+/)[0] || "Paciente";
  const overviewRef = useRef<HTMLElement | null>(null);

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
        setError(
          toErrorMessage(
            requestError,
            "No pudimos cargar tus citas. Reintenta y, si persiste, confirma que la vista de paciente ya esté habilitada en la API."
          )
        );
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

    return appointments.find((appointment) => {
      const startsAt = getAppointmentDate(appointment.start_at)?.getTime();
      if (!startsAt) return false;
      if (startsAt < now) return false;
      if (isCanceled(appointment.status)) return false;
      return (appointment.status ?? "").toLowerCase() !== "completed";
    }) ?? null;
  }, [appointments]);

  const pendingConfirmations = useMemo(() => {
    return appointments.filter((appointment) => (appointment.status ?? "").toLowerCase() === "pending")
      .length;
  }, [appointments]);

  const completedAppointments = useMemo(() => {
    return appointments
      .filter((appointment) => (appointment.status ?? "").toLowerCase() === "completed")
      .sort((a, b) => {
        const first = getAppointmentDate(a.start_at)?.getTime() ?? 0;
        const second = getAppointmentDate(b.start_at)?.getTime() ?? 0;
        return second - first;
      });
  }, [appointments]);

  const recentCompleted = useMemo(() => completedAppointments.slice(0, 3), [completedAppointments]);

  const upcomingCount = useMemo(() => {
    const now = new Date().getTime();

    return appointments.filter((appointment) => {
      const startsAt = getAppointmentDate(appointment.start_at)?.getTime();
      if (!startsAt) return false;
      if (startsAt < now) return false;
      if (isCanceled(appointment.status)) return false;
      return (appointment.status ?? "").toLowerCase() !== "completed";
    }).length;
  }, [appointments]);

  const actionMessage = getActionMessage(placeholderAction);

  function focusOverview() {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    overviewRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
    overviewRef.current?.focus();
  }

  return (
    <section className={styles.home}>
      <div className={styles.heroGrid}>
        <article className={styles.heroCard}>
          <div className={styles.heroCopy}>
            <p className={styles.heroEyebrow}>Tu atención en un solo lugar</p>
            <h1 className={styles.heroTitle}>Hola, {firstName}. Este portal ya te recibe como paciente.</h1>
            <p className={styles.heroLead}>
              Desde aquí podrás seguir tus próximas visitas, detectar confirmaciones pendientes y entrar después a tus servicios y reserva sin pasar por pantallas administrativas.
            </p>

            <div className={styles.heroDetailRow}>
              <div className={styles.heroDetailCard}>
                <span className={styles.heroDetailLabel}>Próxima visita</span>
                <strong className={styles.heroDetailValue}>
                  {loading ? "Cargando…" : nextAppointment ? formatAppointmentDate(nextAppointment.start_at) : "Sin cita próxima"}
                </strong>
              </div>

              <div className={styles.heroDetailCard}>
                <span className={styles.heroDetailLabel}>Confirmaciones</span>
                <strong className={styles.heroDetailValue}>
                  {loading ? "Cargando…" : `${pendingConfirmations} pendiente(s)`}
                </strong>
              </div>
            </div>
          </div>

          <div className={styles.heroAccent} aria-hidden="true">
            <div className={styles.heroGlowLarge} />
            <div className={styles.heroGlowSmall} />
            <div className={styles.heroMedallion}>
              <span>Portal</span>
              <strong>Paciente</strong>
            </div>
          </div>
        </article>

        <article className={styles.nextCard}>
          <div className={styles.nextCardHeader}>
            <div>
              <p className={styles.sectionEyebrow}>Siguiente Cita</p>
              <h2 className={styles.cardTitle}>Resumen rápido</h2>
            </div>

            {!loading && nextAppointment ? (
              <span className={`${styles.statusBadge} ${getStatusClass(nextAppointment.status)}`.trim()}>
                {getStatusLabel(nextAppointment.status)}
              </span>
            ) : null}
          </div>

          {loading ? (
            <div className={styles.loadingBlock}>
              <span className={styles.loadingLineWide} />
              <span className={styles.loadingLine} />
              <span className={styles.loadingLineShort} />
            </div>
          ) : nextAppointment ? (
            <div className={styles.nextCardBody}>
              <p className={styles.nextCardDate}>{formatAppointmentDate(nextAppointment.start_at)}</p>
              <p className={styles.nextCardTime}>{formatAppointmentTime(nextAppointment.start_at)}</p>
              <p className={styles.nextCardService}>
                {nextAppointment.service?.name || nextAppointment.service_name || "Servicio pendiente"}
              </p>
              <p className={styles.nextCardMeta}>
                {nextAppointment.dentist?.name || nextAppointment.dentist_name || "Dentista pendiente"}
              </p>
              <p className={styles.nextCardMeta}>
                {nextAppointment.reason?.trim() || "El motivo de tu cita aparecerá aquí cuando esté disponible."}
              </p>
            </div>
          ) : (
            <div className={styles.emptyStateCard}>
              <p className={styles.emptyStateTitle}>Todavía no hay una cita próxima.</p>
              <p className={styles.emptyStateBody}>
                Cuando se active el flujo de reserva, este bloque mostrará tu siguiente visita con su contexto completo.
              </p>
            </div>
          )}
        </article>
      </div>

      <section className={styles.sectionBlock} aria-labelledby="patient-quick-actions-title">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Accesos rápidos</p>
            <h2 className={styles.sectionTitle} id="patient-quick-actions-title">
              Entra a tus acciones clave sin verte en un panel de staff
            </h2>
          </div>
        </div>

        <div className={styles.actionsGrid}>
          <button className={styles.actionCard} type="button" onClick={focusOverview}>
            <span className={styles.actionIcon} aria-hidden="true">01</span>
            <strong className={styles.actionTitle}>Ver Mi Agenda</strong>
            <span className={styles.actionBody}>
              Baja al resumen y revisa lo que ya está disponible de tus citas.
            </span>
          </button>

          <button
            className={`${styles.actionCard} ${placeholderAction === "services" ? styles.actionCardActive : ""}`.trim()}
            type="button"
            aria-pressed={placeholderAction === "services"}
            onClick={() => setPlaceholderAction("services")}
          >
            <span className={styles.actionIcon} aria-hidden="true">02</span>
            <strong className={styles.actionTitle}>Explorar Servicios</strong>
            <span className={styles.actionBody}>
              El acceso queda preparado para conectar el catálogo del paciente en la siguiente fase.
            </span>
          </button>

          <button
            className={`${styles.actionCard} ${placeholderAction === "booking" ? styles.actionCardActive : ""}`.trim()}
            type="button"
            aria-pressed={placeholderAction === "booking"}
            onClick={() => setPlaceholderAction("booking")}
          >
            <span className={styles.actionIcon} aria-hidden="true">03</span>
            <strong className={styles.actionTitle}>Reservar Cita</strong>
            <span className={styles.actionBody}>
              Este acceso será el disparador natural del flujo de reserva cuando lo conectemos.
            </span>
          </button>
        </div>

        <article className={styles.placeholderPanel} aria-live="polite">
          <p className={styles.placeholderEyebrow}>Estado del módulo</p>
          <h3 className={styles.placeholderTitle}>{actionMessage.title}</h3>
          <p className={styles.placeholderBody}>{actionMessage.body}</p>
        </article>
      </section>

      <section
        className={styles.sectionBlock}
        aria-labelledby="patient-overview-title"
        id="patient-overview"
        ref={overviewRef}
        tabIndex={-1}
      >
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Estado de tus citas</p>
            <h2 className={styles.sectionTitle} id="patient-overview-title">
              Lo importante para ti aparece primero
            </h2>
          </div>

          {!loading && !error ? (
            <span className={styles.sectionMeta}>{appointments.length} cita(s) cargadas</span>
          ) : null}
        </div>

        <div className={styles.metricsGrid}>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Próximas</span>
            <strong className={styles.metricValue}>{loading ? "…" : upcomingCount}</strong>
            <span className={styles.metricHint}>Citas pendientes o por confirmar</span>
          </article>

          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Confirmaciones</span>
            <strong className={styles.metricValue}>{loading ? "…" : pendingConfirmations}</strong>
            <span className={styles.metricHint}>Atenciones que todavía esperan respuesta</span>
          </article>

          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Completadas</span>
            <strong className={styles.metricValue}>{loading ? "…" : completedAppointments.length}</strong>
            <span className={styles.metricHint}>Historial ya cerrado en tu cuenta</span>
          </article>
        </div>

        {error ? (
          <article className={styles.feedbackPanel} aria-live="polite">
            <div>
              <p className={styles.feedbackTitle}>No fue posible cargar tus citas.</p>
              <p className={styles.feedbackBody}>{error}</p>
            </div>
            <button
              className={styles.feedbackButton}
              type="button"
              onClick={() => window.location.reload()}
            >
              Cargar Citas de Nuevo
            </button>
          </article>
        ) : null}

        <div className={styles.activityGrid}>
          <article className={styles.activityCard}>
            <div className={styles.activityHeader}>
              <div>
                <p className={styles.activityEyebrow}>Confirmaciones pendientes</p>
                <h3 className={styles.activityTitle}>Respuestas que podrían pedir atención</h3>
              </div>
            </div>

            {loading ? (
              <div className={styles.loadingBlock}>
                <span className={styles.loadingLineWide} />
                <span className={styles.loadingLine} />
              </div>
            ) : pendingConfirmations > 0 ? (
              <p className={styles.activityBody}>
                Tienes {pendingConfirmations} cita(s) con estado pendiente. En la siguiente fase, esta tarjeta enlazará directo al flujo de confirmación o rechazo.
              </p>
            ) : (
              <p className={styles.activityBody}>
                No hay confirmaciones pendientes por ahora. Cuando aparezcan, este bloque te dará una entrada rápida para responderlas.
              </p>
            )}
          </article>

          <article className={styles.activityCard}>
            <div className={styles.activityHeader}>
              <div>
                <p className={styles.activityEyebrow}>Completadas recientes</p>
                <h3 className={styles.activityTitle}>Tus últimas atenciones cerradas</h3>
              </div>
            </div>

            {loading ? (
              <div className={styles.loadingBlock}>
                <span className={styles.loadingLineWide} />
                <span className={styles.loadingLine} />
                <span className={styles.loadingLineShort} />
              </div>
            ) : recentCompleted.length > 0 ? (
              <div className={styles.completedList}>
                {recentCompleted.map((appointment) => (
                  <article key={appointment.id} className={styles.completedItem}>
                    <div>
                      <p className={styles.completedService}>
                        {appointment.service?.name || appointment.service_name || "Servicio registrado"}
                      </p>
                      <p className={styles.completedMeta}>
                        {formatAppointmentDate(appointment.start_at)} · {formatAppointmentTime(appointment.start_at)}
                      </p>
                    </div>
                    <span className={`${styles.statusBadge} ${styles.statusCompleted}`.trim()}>
                      Completada
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <p className={styles.activityBody}>
                Aún no vemos citas completadas en tu historial. Cuando existan, aquí aparecerán las más recientes.
              </p>
            )}
          </article>
        </div>
      </section>
    </section>
  );
}
