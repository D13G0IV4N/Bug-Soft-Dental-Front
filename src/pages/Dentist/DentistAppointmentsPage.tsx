import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAppointment,
  getAppointmentById,
  getDentistAppointments,
  toErrorMessage,
  updateAppointmentStatus,
  type Appointment,
  type AppointmentStatus,
} from "../../api/appointments";
import { me } from "../../api/auth";
import { getServices, type Service } from "../../api/services";
import { getStoredUser } from "../../utils/auth";
import DentistAppointmentDetailModal from "./DentistAppointmentDetailModal";
import DentistAppointmentFormModal from "./DentistAppointmentFormModal";
import { formatDate, formatTime, parseAppointmentDateTime } from "./dateUtils";
import styles from "./dentist.module.css";

type DentistFilter = "today" | "upcoming" | "completed" | "canceled" | "all";

type DentistPatientOption = {
  id: number;
  name: string;
  phone?: string;
  email?: string;
};

const FILTER_LABELS: Record<DentistFilter, string> = {
  today: "Hoy",
  upcoming: "Próximas",
  completed: "Completadas",
  canceled: "Canceladas",
  all: "Todas",
};

const STATUS_ACTIONS: Array<{ label: string; value: AppointmentStatus; kind?: "danger" }> = [
  { label: "Confirmar", value: "confirmed" },
  { label: "Completar", value: "completed" },
  { label: "No asistió", value: "no_show" },
  { label: "Cancelar", value: "canceled", kind: "danger" },
];

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

function canApplyStatus(item: Appointment, target: AppointmentStatus) {
  const current = (item.status ?? "scheduled").toLowerCase();
  return current !== target;
}

export default function DentistAppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [error, setError] = useState("");
  const [servicesError, setServicesError] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<DentistFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [statusBusyId, setStatusBusyId] = useState<number | null>(null);
  const [dentistUserId, setDentistUserId] = useState<number | null>(getStoredUser()?.id ?? null);

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

  const fetchServices = useCallback(async () => {
    try {
      setLoadingServices(true);
      const catalog = await getServices();
      setServices(catalog.filter((service) => service.status !== false));
      setServicesError("");
    } catch (requestError: unknown) {
      setServices([]);
      setServicesError(toErrorMessage(requestError, "No se pudieron cargar los servicios"));
    } finally {
      setLoadingServices(false);
    }
  }, []);

  const resolveDentistUserId = useCallback(async () => {
    if (dentistUserId) return;

    try {
      const response = await me();
      const user = response?.data?.data ?? response?.data;
      const id = typeof user?.id === "number" ? user.id : Number(user?.id);
      if (id > 0) setDentistUserId(id);
    } catch {
      // handled by form validations
    }
  }, [dentistUserId]);

  useEffect(() => {
    void fetchAppointments();
    void fetchServices();
    void resolveDentistUserId();
  }, [fetchAppointments, fetchServices, resolveDentistUserId]);

  const patientOptions = useMemo<DentistPatientOption[]>(() => {
    const map = new Map<number, DentistPatientOption>();

    items.forEach((item) => {
      const id = item.patient_user_id || item.patient?.id;
      if (!id) return;
      map.set(id, {
        id,
        name: item.patient?.name || item.patient_name || `Paciente #${id}`,
        phone: item.patient?.phone,
        email: item.patient?.email,
      });
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

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

  async function handleQuickStatus(item: Appointment, status: AppointmentStatus) {
    if (!item.id || !canApplyStatus(item, status)) return;

    try {
      setStatusBusyId(item.id);
      setActionError("");
      setActionSuccess("");
      await updateAppointmentStatus(item.id, status);
      await fetchAppointments();
      setActionSuccess(`Cita #${item.id} actualizada a ${status}.`);
    } catch (requestError: unknown) {
      setActionError(toErrorMessage(requestError, "No se pudo actualizar el estado"));
    } finally {
      setStatusBusyId(null);
    }
  }

  function startEdit(item: Appointment) {
    setEditingAppointment(item);
    setOpenEdit(true);
  }

  return (
    <section className={styles.surface}>
      <div className={styles.workspaceHero}>
        <div>
          <p className={styles.workspaceTag}>Dental Flow · Operación diaria</p>
          <h2 className={styles.heroTitle}>Workspace de citas clínicas</h2>
          <p className={styles.heroSub}>Gestiona agenda, crea citas, edita detalles clínicos y actualiza estados en una sola vista.</p>
        </div>

        <button className={styles.btn} onClick={() => setOpenCreate(true)}>
          + Nueva cita
        </button>
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

      {actionError && <p className={styles.feedbackError}>{actionError}</p>}
      {actionSuccess && <p className={styles.feedbackOk}>{actionSuccess}</p>}

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
                <th>Estado</th>
                <th>Acciones</th>
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
                    <p className={styles.rowMeta}>{item.service?.specialty?.name || item.specialty_name || "-"}</p>
                  </td>
                  <td>
                    <span className={`${styles.statusPill} ${statusClass(item.status)}`.trim()}>{item.status || "scheduled"}</span>
                  </td>
                  <td>
                    <div className={styles.tableActions}>
                      <button className={styles.btnGhost} onClick={() => void openDetail(item)}>Ver</button>
                      <button className={styles.btnGhost} onClick={() => startEdit(item)}>Editar</button>
                      {STATUS_ACTIONS.map((action) => (
                        <button
                          key={`${item.id}-${action.value}`}
                          className={action.kind === "danger" ? styles.btnDanger : styles.btnTiny}
                          disabled={statusBusyId === item.id || !canApplyStatus(item, action.value)}
                          onClick={() => void handleQuickStatus(item, action.value)}
                        >
                          {statusBusyId === item.id ? "..." : action.label}
                        </button>
                      ))}
                    </div>
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
          services={services}
          loadingServices={loadingServices}
          servicesError={servicesError}
          onClose={closeModal}
          onUpdated={refreshDetailAndList}
        />
      )}

      {openCreate && (
        <DentistAppointmentFormModal
          mode="create"
          patients={patientOptions}
          services={services}
          loadingServices={loadingServices}
          servicesError={servicesError}
          dentistUserId={dentistUserId}
          onClose={() => setOpenCreate(false)}
          onSubmit={async (payload) => {
            await createAppointment(payload);
            await fetchAppointments();
            setOpenCreate(false);
            setActionSuccess("Cita creada correctamente.");
          }}
        />
      )}

      {openEdit && editingAppointment && (
        <DentistAppointmentFormModal
          mode="edit"
          appointment={editingAppointment}
          patients={patientOptions}
          services={services}
          loadingServices={loadingServices}
          servicesError={servicesError}
          dentistUserId={dentistUserId}
          onClose={() => {
            setOpenEdit(false);
            setEditingAppointment(null);
          }}
          onSubmit={async () => {
            await fetchAppointments();
            setOpenEdit(false);
            setEditingAppointment(null);
            setActionSuccess("Cita actualizada correctamente.");
          }}
        />
      )}
    </section>
  );
}
