import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAppointmentById,
  getDentistAppointments,
  toErrorMessage,
  type Appointment,
} from "../../api/appointments";
import DentistAppointmentDetailModal from "./DentistAppointmentDetailModal";
import { formatDate, formatTime, parseAppointmentDateTime } from "./dateUtils";
import styles from "./dentist.module.css";

type DentistFilter = "today" | "upcoming" | "completed" | "canceled" | "all";

const FILTER_LABELS: Record<DentistFilter, string> = {
  today: "Hoy",
  upcoming: "Próximas",
  completed: "Completadas",
  canceled: "Canceladas",
  all: "Todas",
};

function isCanceled(status?: string) {
  return status === "canceled" || status === "cancelled";
}

function matchesFilter(item: Appointment, filter: DentistFilter) {
  const date = parseAppointmentDateTime(item.start_at);
  const status = (item.status ?? "scheduled").toLowerCase();
  const now = new Date();

  if (filter === "all") return true;
  if (filter === "completed") return status === "completed";
  if (filter === "canceled") return isCanceled(status);
  if (!date) return false;

  if (filter === "today") {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }

  return date > now && !["completed", "no_show", "canceled", "cancelled"].includes(status);
}

function statusClass(status?: string) {
  const key = (status ?? "scheduled").toLowerCase();
  if (key === "completed") return styles.statusCompleted;
  if (key === "confirmed") return styles.statusConfirmed;
  if (key === "pending") return styles.statusPending;
  if (key === "no_show") return styles.statusNoShow;
  if (key === "cancelled") return styles.statusCancelled;
  if (key === "canceled") return styles.statusCanceled;
  return styles.statusScheduled;
}

export default function DentistAppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<DentistFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const appointments = await getDentistAppointments();
      setItems(appointments);
      setError("");
    } catch (requestError: unknown) {
      setItems([]);
      setError(toErrorMessage(requestError, "No se pudieron cargar tus citas"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAppointments();
  }, [fetchAppointments]);

  const filteredItems = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return items.filter((item) => {
      if (!matchesFilter(item, selectedFilter)) return false;
      if (!searchTerm) return true;

      const patientName = (item.patient?.name || item.patient_name || "").toLowerCase();
      const serviceName = (item.service?.name || item.service_name || "").toLowerCase();

      return patientName.includes(searchTerm) || serviceName.includes(searchTerm);
    });
  }, [items, search, selectedFilter]);

  async function openDetail(item: Appointment) {
    if (!item.id) return;

    try {
      setLoadingDetail(true);
      setSelectedAppointmentId(item.id);
      const detail = await getAppointmentById(item.id);
      setSelectedAppointment(detail);
    } catch {
      setSelectedAppointment(item);
    } finally {
      setLoadingDetail(false);
    }
  }

  function closeModal() {
    setSelectedAppointmentId(null);
    setSelectedAppointment(null);
    setLoadingDetail(false);
  }

  async function refreshDetailAndList() {
    await fetchAppointments();
    if (!selectedAppointmentId) return;

    try {
      const detail = await getAppointmentById(selectedAppointmentId);
      setSelectedAppointment(detail);
    } catch {
      setSelectedAppointment(null);
    }
  }

  return (
    <section className={styles.surface}>
      <h2 className={styles.heroTitle}>Citas clínicas</h2>
      <p className={styles.heroSub}>Busca rápido, revisa detalle clínico y actualiza estados sin salir de la agenda.</p>


      <div className={styles.infoCard} style={{ marginBottom: 14 }}>
        <p className={styles.infoLabel}>Nueva cita</p>
        <p className={styles.rowMeta}>Pendiente de habilitar: el rol dentista no tiene fuentes seguras de pacientes/servicios para crear citas desde este módulo.</p>
      </div>
      <div className={styles.controls}>
        <div className={styles.filters}>
          {(Object.keys(FILTER_LABELS) as DentistFilter[]).map((filter) => (
            <button
              key={filter}
              className={`${styles.filterBtn} ${filter === selectedFilter ? styles.filterBtnActive : ""}`.trim()}
              onClick={() => setSelectedFilter(filter)}
            >
              {FILTER_LABELS[filter]}
            </button>
          ))}
        </div>

        <input
          className={styles.searchInput}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por paciente o servicio"
        />
      </div>

      {loading && <div className={styles.emptyState}>Cargando citas...</div>}

      {!loading && error && (
        <div className={styles.emptyState}>
          <p>{error}</p>
          <button className={styles.btnGhost} onClick={() => void fetchAppointments()}>Reintentar</button>
        </div>
      )}

      {!loading && !error && filteredItems.length === 0 && (
        <div className={styles.emptyState}>No hay citas para este filtro.</div>
      )}

      {!loading && !error && filteredItems.length > 0 && (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Horario</th>
                <th>Paciente</th>
                <th>Servicio</th>
                <th>Especialidad</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <p className={styles.rowMain}>{formatDate(item.start_at)}</p>
                    <p className={styles.rowMeta}>{formatTime(item.start_at)} - {formatTime(item.end_at)}</p>
                  </td>
                  <td>
                    <p className={styles.rowMain}>{item.patient?.name || item.patient_name || `#${item.patient_user_id}`}</p>
                    <p className={styles.rowMeta}>{item.patient?.phone || "Sin teléfono"}</p>
                  </td>
                  <td>
                    <p className={styles.rowMain}>{item.service?.name || item.service_name || `#${item.service_id}`}</p>
                  </td>
                  <td>
                    <p className={styles.rowMeta}>{item.service?.specialty?.name || item.specialty_name || "-"}</p>
                  </td>
                  <td>
                    <span className={`${styles.statusPill} ${statusClass(item.status)}`.trim()}>{item.status || "scheduled"}</span>
                  </td>
                  <td>
                    <button className={styles.btn} onClick={() => void openDetail(item)}>Abrir panel</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loadingDetail && <div className={styles.emptyState}>Cargando detalle...</div>}

      {selectedAppointment && !loadingDetail && (
        <DentistAppointmentDetailModal
          appointment={selectedAppointment}
          onClose={closeModal}
          onUpdated={refreshDetailAndList}
        />
      )}
    </section>
  );
}
