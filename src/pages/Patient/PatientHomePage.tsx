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
          <p className={styles.welcomeEyebrow}>Patient Home</p>
          <h2 className={styles.welcomeTitle}>Welcome back, {firstName}.</h2>
          <p className={styles.welcomeDescription}>
            This is your care overview. Check your next visit and choose what you want to do next.
          </p>
        </div>
      </header>

      <article className={styles.featuredCard}>
        <DashboardSectionHeader
          eyebrow="Featured"
          title="Your next appointment"
          description="Everything important for your next dental visit in one calm place."
        />

        {loading ? (
          <p className={styles.featuredState}>Loading your appointment timeline...</p>
        ) : error ? (
          <div className={styles.errorCard}>
            <p className={styles.errorTitle}>We couldn't load your appointment data right now.</p>
            <p className={styles.errorBody}>{error}</p>
            <button className={styles.primaryAction} type="button" onClick={() => window.location.reload()}>
              Refresh dashboard
            </button>
          </div>
        ) : nextAppointment ? (
          <div className={styles.appointmentSpotlight}>
            <p className={styles.appointmentDate}>{formatAppointmentDate(nextAppointment.start_at)}</p>
            <p className={styles.appointmentTime}>{formatAppointmentTime(nextAppointment.start_at)}</p>
            <p className={styles.appointmentService}>
              {nextAppointment.service?.name || nextAppointment.service_name || "Service to be confirmed"}
            </p>
            <div className={styles.appointmentMeta}>
              <span>{nextAppointment.dentist?.name || nextAppointment.dentist_name || "Dentist assigned soon"}</span>
              <span className={styles.statusPill}>{getStatusLabel(nextAppointment.status)}</span>
            </div>
          </div>
        ) : (
          <div className={styles.emptyStateCard}>
            <h4 className={styles.emptyStateTitle}>No upcoming appointment yet.</h4>
            <p className={styles.emptyStateText}>
              Schedule your next check-up to stay on top of your dental health.
            </p>
            <button className={styles.primaryAction} type="button" onClick={() => navigate("/patient/book")}>
              Book appointment
            </button>
          </div>
        )}
      </article>

      <section className={styles.secondaryGrid}>
        <article className={styles.surfaceCard}>
          <DashboardSectionHeader
            eyebrow="Quick actions"
            title="Choose your next step"
            description="Only the essentials to keep your care journey simple."
          />
          <div className={styles.quickActionGrid}>
            <button className={styles.quickActionButton} type="button" onClick={() => navigate("/patient/book")}>Book appointment</button>
            <button className={styles.quickActionButton} type="button" onClick={() => navigate("/patient/appointments")}>View appointments</button>
            <button className={styles.quickActionButton} type="button" onClick={() => navigate("/patient/services")}>View services</button>
            <button className={styles.quickActionButton} type="button" onClick={() => navigate("/patient/profile")}>Update profile</button>
          </div>
        </article>

        <article className={styles.surfaceCard}>
          <DashboardSectionHeader
            eyebrow="Care message"
            title="Daily oral care reminder"
            description="Small habits make a big difference for long-term dental health."
          />
          <p className={styles.careTipText}>
            Brush for two full minutes, floss once daily, and drink water after meals to help protect your enamel.
          </p>
        </article>

        <article className={styles.surfaceCard}>
          <DashboardSectionHeader
            eyebrow="Recent history"
            title="Latest completed visits"
            description="A light preview of your recent treatment activity."
          />

          {loading ? (
            <p className={styles.compactState}>Loading recent activity...</p>
          ) : recentVisits.length === 0 ? (
            <p className={styles.compactState}>No completed visits yet. Your visit history will appear here.</p>
          ) : (
            <ul className={styles.historyList}>
              {recentVisits.map((visit) => (
                <li className={styles.historyItem} key={visit.id}>
                  <p className={styles.historyDate}>{formatAppointmentDate(visit.start_at)}</p>
                  <p className={styles.historyService}>{visit.service?.name || visit.service_name || "Dental appointment"}</p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </section>
  );
}
