import { useEffect, useMemo, useState } from "react";
import { getDentistAppointments, toErrorMessage, type Appointment } from "../../api/appointments";
import styles from "../Admin/admin.module.css";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function parseDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isCanceled(status?: string) {
  return status === "canceled" || status === "cancelled";
}

export default function DentistDashboardPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAppointments() {
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
    }

    void fetchAppointments();
  }, []);

  const summary = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    return items.reduce(
      (acc, item) => {
        const startAt = parseDate(item.start_at);
        const status = item.status ?? "scheduled";

        if (status === "completed") acc.completed += 1;
        if (isCanceled(status)) acc.canceled += 1;

        if (startAt && startAt >= todayStart && startAt <= todayEnd) {
          acc.today += 1;
        }

        if (startAt && startAt > todayEnd && status !== "completed" && !isCanceled(status) && status !== "no_show") {
          acc.upcoming += 1;
        }

        return acc;
      },
      { today: 0, upcoming: 0, completed: 0, canceled: 0 }
    );
  }, [items]);

  return (
    <div className={styles.viewStack}>
      <div className={styles.hero}>
        <div>
          <h2 className={styles.heroTitle}>Dashboard de dentista</h2>
          <p className={styles.heroSub}>Resumen de tu agenda clínica en tiempo real.</p>
        </div>
      </div>

      <div className={styles.contentCard}>
        <div className={styles.sectionHead}>
          <div>
            <h3 className={styles.sectionTitle}>Resumen de citas</h3>
            <p className={styles.sectionSub}>Indicadores construidos con tus citas asignadas.</p>
          </div>
        </div>

        <div className={styles.sectionBody}>
          {loading && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Cargando resumen...</p></div></div>}

          {!loading && error && (
            <div className={styles.empty}>
              <div className={styles.emptyBox}>
                <p className={styles.emptyTitle}>Error al cargar</p>
                <p className={styles.emptyText}>{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <article className={styles.formSurface}>
                <p className={styles.rowSub}>Citas de hoy</p>
                <p className={styles.heroTitle}>{summary.today}</p>
              </article>
              <article className={styles.formSurface}>
                <p className={styles.rowSub}>Próximas citas</p>
                <p className={styles.heroTitle}>{summary.upcoming}</p>
              </article>
              <article className={styles.formSurface}>
                <p className={styles.rowSub}>Completadas</p>
                <p className={styles.heroTitle}>{summary.completed}</p>
              </article>
              <article className={styles.formSurface}>
                <p className={styles.rowSub}>Canceladas</p>
                <p className={styles.heroTitle}>{summary.canceled}</p>
              </article>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
