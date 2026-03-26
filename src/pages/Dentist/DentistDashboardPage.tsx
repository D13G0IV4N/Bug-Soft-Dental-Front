import { useCallback, useEffect, useMemo, useState } from "react";
import { getDentistAppointments, toErrorMessage, type Appointment } from "../../api/appointments";
import { isSameLocalDay, parseAppointmentDateTime } from "./dateUtils";
import styles from "./dentist.module.css";

function isCanceled(status?: string) {
  return status === "canceled" || status === "cancelled";
}

export default function DentistDashboardPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const appointments = await getDentistAppointments();
      setItems(appointments);
      setError("");
    } catch (requestError: unknown) {
      setItems([]);
      setError(toErrorMessage(requestError, "No se pudieron cargar las citas del dentista"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAppointments();
  }, [fetchAppointments]);

  const summary = useMemo(() => {
    const now = new Date();

    return items.reduce(
      (acc, item) => {
        const startAt = parseAppointmentDateTime(item.start_at);
        const status = (item.status ?? "scheduled").toLowerCase();

        if (status === "completed") acc.completed += 1;
        if (isCanceled(status)) acc.canceled += 1;

        if (startAt && isSameLocalDay(startAt, now)) {
          acc.today += 1;
        }

        if (startAt && startAt > now && !["completed", "no_show", "canceled", "cancelled"].includes(status)) {
          acc.upcoming += 1;
        }

        return acc;
      },
      { today: 0, upcoming: 0, completed: 0, canceled: 0 }
    );
  }, [items]);

  return (
    <section className={styles.surface}>
      <h2 className={styles.heroTitle}>Mi agenda de hoy</h2>
      <p className={styles.heroSub}>Indicadores basados en tus citas asignadas y su estado clínico.</p>

      {loading && <div className={styles.emptyState}>Cargando resumen clínico...</div>}

      {!loading && error && (
        <div className={styles.emptyState}>
          <p>No se pudo cargar el resumen.</p>
          <p>{error}</p>
          <button className={styles.btnGhost} onClick={() => void fetchAppointments()}>Reintentar</button>
        </div>
      )}

      {!loading && !error && (
        <div className={styles.statsGrid}>
          <article className={styles.statCard}><p className={styles.statLabel}>Citas de hoy</p><p className={styles.statValue}>{summary.today}</p></article>
          <article className={styles.statCard}><p className={styles.statLabel}>Próximas</p><p className={styles.statValue}>{summary.upcoming}</p></article>
          <article className={styles.statCard}><p className={styles.statLabel}>Completadas</p><p className={styles.statValue}>{summary.completed}</p></article>
          <article className={styles.statCard}><p className={styles.statLabel}>Canceladas</p><p className={styles.statValue}>{summary.canceled}</p></article>
        </div>
      )}
    </section>
  );
}
