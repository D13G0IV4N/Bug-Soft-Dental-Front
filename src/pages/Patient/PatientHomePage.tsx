import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPacientAppointments, toErrorMessage, type Appointment } from "../../api/appointments";
import { getStoredUser } from "../../utils/auth";
import { parseAppointmentDateTime } from "../Dentist/dateUtils";
import styles from "./patient.module.css";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

function getAppointmentDate(value?: string) {
  const parsed = parseAppointmentDateTime(value);
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

function formatAppointmentDate(value?: string) {
  const parsed = getAppointmentDate(value);
  return parsed ? dateFormatter.format(parsed) : "Date pending";
}

function formatAppointmentTime(value?: string) {
  const parsed = getAppointmentDate(value);
  return parsed ? timeFormatter.format(parsed) : "Time pending";
}

function isCanceled(status?: string) {
  const normalized = (status ?? "").toLowerCase();
  return normalized === "canceled" || normalized === "cancelled";
}

function getStatusLabel(status?: string) {
  const normalized = (status ?? "scheduled").toLowerCase();
  if (normalized === "pending") return "Pending";
  if (normalized === "confirmed") return "Confirmed";
  if (normalized === "completed") return "Completed";
  if (normalized === "canceled" || normalized === "cancelled") return "Canceled";
  if (normalized === "no_show") return "No Show";
  return "Scheduled";
}

export default function PatientHomePage() {
  const navigate = useNavigate();
  const storedUser = useMemo(() => getStoredUser(), []);
  const firstName = storedUser?.name?.trim()?.split(/\s+/)[0] || "Patient";

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
        setError(toErrorMessage(requestError, "We couldn't load your upcoming visits right now."));
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

  const pendingCount = useMemo(
    () => appointments.filter((appointment) => (appointment.status ?? "").toLowerCase() === "pending").length,
    [appointments]
  );

  const completedCount = useMemo(
    () => appointments.filter((appointment) => (appointment.status ?? "").toLowerCase() === "completed").length,
    [appointments]
  );

  const nextStep = useMemo(() => {
    if (loading) return "Syncing your care timeline.";
    if (error) return "Review your schedule once data is available.";
    if (!nextAppointment) return "You don't have a future visit yet. Reserve your next check-up.";
    if ((nextAppointment.status ?? "").toLowerCase() === "pending") {
      return "Your next visit is pending. Keep an eye on status updates.";
    }
    return "You're set. Save this slot and arrive 10 minutes early.";
  }, [loading, error, nextAppointment]);

  return (
    <section className={styles.dashboardHome}>
      <header className={styles.heroHeader}>
        <div>
          <p className={styles.heroEyebrow}>Patient dashboard</p>
          <h2 className={styles.heroTitle}>Good to see you, {firstName}</h2>
        </div>
        <p className={styles.heroHint}>A calm view of what matters right now.</p>
      </header>

      <section className={styles.dashboardGrid}>
        <article className={styles.nextAppointmentPanel}>
          <p className={styles.panelLabel}>Next appointment</p>

          {loading ? (
            <p className={styles.largeInfo}>Loading your schedule...</p>
          ) : error ? (
            <div className={styles.errorWrap}>
              <p className={styles.errorTitle}>Unable to show your next visit.</p>
              <p className={styles.errorBody}>{error}</p>
              <button className={styles.primaryAction} type="button" onClick={() => window.location.reload()}>
                Try again
              </button>
            </div>
          ) : nextAppointment ? (
            <>
              <p className={styles.appointmentDate}>{formatAppointmentDate(nextAppointment.start_at)}</p>
              <p className={styles.appointmentTime}>{formatAppointmentTime(nextAppointment.start_at)}</p>
              <p className={styles.appointmentService}>
                {nextAppointment.service?.name || nextAppointment.service_name || "Service to be confirmed"}
              </p>
              <div className={styles.metaRow}>
                <span>{nextAppointment.dentist?.name || nextAppointment.dentist_name || "Dentist assigned soon"}</span>
                <span className={styles.statusChip}>{getStatusLabel(nextAppointment.status)}</span>
              </div>
            </>
          ) : (
            <>
              <p className={styles.largeInfo}>No future appointment booked.</p>
              <p className={styles.smallInfo}>Book your next visit to keep your care plan on track.</p>
            </>
          )}
        </article>

        <aside className={styles.actionRail}>
          <article className={styles.nextStepPanel}>
            <p className={styles.panelLabel}>What to do next</p>
            <p className={styles.nextStepText}>{nextStep}</p>
          </article>

          <article className={styles.quickActionsPanel}>
            <p className={styles.panelLabel}>Quick actions</p>
            <div className={styles.quickActionList}>
              <button className={styles.ghostAction} type="button" onClick={() => navigate("/patient/book")}>Book appointment</button>
              <button className={styles.ghostAction} type="button" onClick={() => navigate("/patient/appointments")}>View all appointments</button>
              <button className={styles.ghostAction} type="button" onClick={() => navigate("/patient/services")}>Browse services</button>
            </div>
          </article>

          <article className={styles.summaryPanel}>
            <p className={styles.panelLabel}>Small summary</p>
            <div className={styles.summaryRow}><span>Pending confirmations</span><strong>{pendingCount}</strong></div>
            <div className={styles.summaryRow}><span>Completed visits</span><strong>{completedCount}</strong></div>
          </article>
        </aside>
      </section>
    </section>
  );
}
