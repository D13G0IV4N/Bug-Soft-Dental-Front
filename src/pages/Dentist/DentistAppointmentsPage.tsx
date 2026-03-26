import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAppointmentById,
  getDentistAppointments,
  toErrorMessage,
  type Appointment,
} from "../../api/appointments";
import styles from "../Admin/admin.module.css";
import formStyles from "../../styles/formSystem.module.css";
import DentistAppointmentDetailModal from "./DentistAppointmentDetailModal";

type DentistFilter = "today" | "upcoming" | "completed" | "canceled" | "all";

const FILTER_LABELS: Record<DentistFilter, string> = {
  today: "Hoy",
  upcoming: "Próximas",
  completed: "Completadas",
  canceled: "Canceladas",
  all: "Todas",
};

function parseDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value?: string) {
  const parsed = parseDate(value);
  return parsed ? parsed.toLocaleDateString() : "-";
}

function formatTime(value?: string) {
  const parsed = parseDate(value);
  return parsed ? parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
}

function isCanceled(status?: string) {
  return status === "canceled" || status === "cancelled";
}

function matchesFilter(item: Appointment, filter: DentistFilter) {
  const date = parseDate(item.start_at);
  const status = item.status ?? "scheduled";

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (filter === "all") return true;
  if (filter === "completed") return status === "completed";
  if (filter === "canceled") return isCanceled(status);

  if (!date) return false;
  if (filter === "today") return date >= dayStart && date <= dayEnd;
  if (filter === "upcoming") {
    return date > dayEnd && status !== "completed" && !isCanceled(status) && status !== "no_show";
  }

  return true;
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
      const fallback = items.find((item) => item.id === selectedAppointmentId) ?? null;
      setSelectedAppointment(fallback);
    }
  }

  return (
    <div className={styles.viewStack}>
      <div className={styles.hero}>
        <div>
          <h2 className={styles.heroTitle}>Mis citas</h2>
          <p className={styles.heroSub}>Consulta, filtra y actualiza las citas asignadas a tu usuario.</p>
        </div>
      </div>

      <div className={styles.contentCard}>
        <div className={styles.sectionHead}>
          <div>
            <h3 className={styles.sectionTitle}>Agenda personal</h3>
            <p className={styles.sectionSub}>{loading ? "Cargando..." : `${filteredItems.length} resultado(s)`}</p>
          </div>
        </div>

        <div className={styles.sectionBody}>
          <div className={styles.actions}>
            {(Object.keys(FILTER_LABELS) as DentistFilter[]).map((filter) => (
              <button
                key={filter}
                className={filter === selectedFilter ? styles.btnPrimary : styles.btnGhost}
                onClick={() => setSelectedFilter(filter)}
              >
                {FILTER_LABELS[filter]}
              </button>
            ))}
          </div>

          <label className={styles.rowSub}>
            Buscar por paciente o servicio
            <input
              className={formStyles.control}
              style={{ marginTop: 6 }}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ej. Juan Pérez o Limpieza dental"
            />
          </label>

          {loading && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Cargando citas...</p></div></div>}
          {!loading && error && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Error</p><p className={styles.emptyText}>{error}</p></div></div>}

          {!loading && !error && filteredItems.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyBox}>
                <p className={styles.emptyTitle}>Sin citas para este filtro</p>
                <p className={styles.emptyText}>Ajusta el filtro o búsqueda para ver otras citas.</p>
              </div>
            </div>
          )}

          {!loading && !error && filteredItems.length > 0 && (
            <div className={styles.listSurface}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Inicio</th>
                      <th>Fin</th>
                      <th>Paciente</th>
                      <th>Servicio</th>
                      <th>Especialidad</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.id}>
                        <td><p className={styles.rowSub}>{formatDate(item.start_at)}</p></td>
                        <td><p className={styles.rowSub}>{formatTime(item.start_at)}</p></td>
                        <td><p className={styles.rowSub}>{formatTime(item.end_at)}</p></td>
                        <td><p className={styles.rowTitle}>{item.patient?.name || item.patient_name || `#${item.patient_user_id}`}</p></td>
                        <td><p className={styles.rowTitle}>{item.service?.name || item.service_name || `#${item.service_id}`}</p></td>
                        <td><p className={styles.rowSub}>{item.service?.specialty?.name || item.specialty_name || "-"}</p></td>
                        <td>
                          <span className={`${styles.pill} ${isCanceled(item.status) ? styles.pillOff : styles.pillOn}`}>
                            {item.status || "scheduled"}
                          </span>
                        </td>
                        <td>
                          <button className={styles.btnSoft} onClick={() => openDetail(item)}>
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedAppointment && !loadingDetail && (
        <DentistAppointmentDetailModal
          appointment={selectedAppointment}
          onClose={closeModal}
          onUpdated={refreshDetailAndList}
        />
      )}
    </div>
  );
}
