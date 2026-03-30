import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAppointment,
  getAppointments,
  getAvailableDentists,
  toErrorMessage,
  updateAppointment,
  updateAppointmentStatus,
  type Appointment,
  type AppointmentPayload,
  type AppointmentStatus,
  type AvailableDentist,
} from "../../api/appointments";
import { getAdminPatients } from "../../api/patients";
import { formatDate, formatTime, isSameLocalDay, parseAppointmentDateTime } from "../Dentist/dateUtils";
import DentistWeeklyAgenda from "../Dentist/DentistWeeklyAgenda";
import styles from "../Dentist/dentist.module.css";
import ReceptionistAppointmentFormModal, {
  type ReceptionistPatientOption,
  type ReceptionistServiceOption,
} from "./ReceptionistAppointmentFormModal";

type ReceptionistFilter = "today" | "upcoming" | "completed" | "canceled" | "all";
type AgendaViewMode = "week" | "list";

const FILTER_LABELS: Record<ReceptionistFilter, string> = {
  today: "Hoy",
  upcoming: "Próximas",
  completed: "Completadas",
  canceled: "Canceladas",
  all: "Todas",
};

const STATUS_ACTIONS: Array<{ label: string; value: AppointmentStatus; kind?: "danger" }> = [
  { label: "No asistió", value: "no_show" },
  { label: "Cancelar", value: "cancelled", kind: "danger" },
];

function isCanceled(status?: string) {
  return status === "canceled" || status === "cancelled";
}

function matchesFilter(item: Appointment, filter: ReceptionistFilter) {
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

function buildKnownServices(appointments: Appointment[]): ReceptionistServiceOption[] {
  const map = new Map<number, ReceptionistServiceOption>();

  appointments.forEach((item) => {
    if (!item.service_id) return;
    if (!map.has(item.service_id)) {
      map.set(item.service_id, {
        id: item.service_id,
        name: item.service?.name || item.service_name || `Servicio #${item.service_id}`,
        specialtyName: item.service?.specialty?.name || item.specialty_name || undefined,
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export default function ReceptionistAppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<ReceptionistPatientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [error, setError] = useState("");
  const [patientsError, setPatientsError] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<ReceptionistFilter>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<AgendaViewMode>("week");
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [statusBusyId, setStatusBusyId] = useState<number | null>(null);

  const [loadingDentists, setLoadingDentists] = useState(false);
  const [dentistsError, setDentistsError] = useState("");
  const [availableDentists, setAvailableDentists] = useState<AvailableDentist[]>([]);
  const [dentistQuery, setDentistQuery] = useState<{ serviceId: number; startAt: string; appointmentId?: number } | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const appointments = await getAppointments();
      setItems(appointments);
      setError("");
    } catch (requestError: unknown) {
      setItems([]);
      setError(toErrorMessage(requestError, "No se pudieron cargar las citas"));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPatients = useCallback(async () => {
    try {
      setLoadingPatients(true);
      const catalog = await getAdminPatients();
      const options = catalog
        .filter((patient) => typeof patient.id === "number" && patient.status !== false)
        .map((patient) => ({
          id: patient.id as number,
          name: patient.name || `Paciente #${patient.id}`,
          phone: patient.phone,
          email: patient.email,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setPatients(options);
      setPatientsError("");
    } catch (requestError: unknown) {
      setPatients([]);
      setPatientsError(toErrorMessage(requestError, "No se pudieron cargar los pacientes"));
    } finally {
      setLoadingPatients(false);
    }
  }, []);

  useEffect(() => {
    void fetchAppointments();
    void fetchPatients();
  }, [fetchAppointments, fetchPatients]);

  useEffect(() => {
    if (!dentistQuery) {
      setAvailableDentists([]);
      setDentistsError("");
      return;
    }

    let active = true;
    const query = dentistQuery;

    async function fetchDentists() {
      try {
        setLoadingDentists(true);
        const dentists = await getAvailableDentists({
          service_id: query.serviceId,
          start_at: query.startAt,
          exclude_appointment_id: query.appointmentId,
        });

        if (!active) return;

        setAvailableDentists(dentists);
        setDentistsError("");
      } catch (requestError: unknown) {
        if (!active) return;
        setAvailableDentists([]);
        setDentistsError(toErrorMessage(requestError, "No se pudieron cargar los dentistas disponibles"));
      } finally {
        if (active) {
          setLoadingDentists(false);
        }
      }
    }

    void fetchDentists();

    return () => {
      active = false;
    };
  }, [dentistQuery]);

  const knownServices = useMemo(() => buildKnownServices(items), [items]);

  const filteredItems = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return items.filter((item) => {
      if (!matchesFilter(item, selectedFilter)) return false;
      if (!searchTerm) return true;

      const patientName = (item.patient?.name || item.patient_name || "").toLowerCase();
      const dentistName = (item.dentist?.name || item.dentist_name || "").toLowerCase();
      const serviceName = (item.service?.name || item.service_name || "").toLowerCase();

      return patientName.includes(searchTerm) || dentistName.includes(searchTerm) || serviceName.includes(searchTerm);
    });
  }, [items, search, selectedFilter]);

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

  function setDentistLookup(serviceIdRaw: string, startAt: string, appointmentId?: number) {
    const serviceId = Number(serviceIdRaw);
    if (!serviceId || !startAt) {
      setDentistQuery(null);
      return;
    }

    setDentistQuery({ serviceId, startAt, appointmentId });
  }

  const handleCreateLookupChange = useCallback((serviceId: string, startAt: string) => {
    setDentistLookup(serviceId, startAt);
  }, []);

  const handleEditLookupChange = useCallback((serviceId: string, startAt: string) => {
    setDentistLookup(serviceId, startAt, editingAppointment?.id);
  }, [editingAppointment?.id]);

  return (
    <section className={styles.surface}>
      <div className={styles.workspaceHero}>
        <div>
          <p className={styles.workspaceTag}>Dental Flow · Front Desk</p>
          <h2 className={styles.heroTitle}>Workspace de recepción</h2>
          <p className={styles.heroSub}>Gestiona la agenda clínica con las rutas actuales de appointments y patients del backend.</p>
        </div>

        <button
          className={styles.btn}
          onClick={() => {
            setActionError("");
            setActionSuccess("");
            setDentistQuery(null);
            setOpenCreate(true);
          }}
        >
          + Nueva cita
        </button>
      </div>

      {!error && (
        <div className={styles.statsGrid}>
          <article className={styles.statCard}><p className={styles.statLabel}>Citas de hoy</p><p className={styles.statValue}>{summary.today}</p></article>
          <article className={styles.statCard}><p className={styles.statLabel}>Próximas</p><p className={styles.statValue}>{summary.upcoming}</p></article>
          <article className={styles.statCard}><p className={styles.statLabel}>Completadas</p><p className={styles.statValue}>{summary.completed}</p></article>
          <article className={styles.statCard}><p className={styles.statLabel}>Canceladas</p><p className={styles.statValue}>{summary.canceled}</p></article>
        </div>
      )}

      <div className={styles.controlsShell}>
        <div className={styles.controlsHeader}>
          <div className={styles.filters}>
            {(Object.keys(FILTER_LABELS) as ReceptionistFilter[]).map((filter) => (
              <button
                key={filter}
                className={`${styles.filterBtn} ${filter === selectedFilter ? styles.filterBtnActive : ""}`.trim()}
                onClick={() => setSelectedFilter(filter)}
              >
                {FILTER_LABELS[filter]}
              </button>
            ))}
          </div>

          <div className={styles.viewModeSwitch}>
            <button
              className={`${styles.viewModeBtn} ${viewMode === "week" ? styles.viewModeBtnActive : ""}`.trim()}
              onClick={() => setViewMode("week")}
            >
              Agenda semanal
            </button>
            <button
              className={`${styles.viewModeBtn} ${viewMode === "list" ? styles.viewModeBtnActive : ""}`.trim()}
              onClick={() => setViewMode("list")}
            >
              Vista detallada
            </button>
          </div>
        </div>

        <input
          className={styles.searchInput}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por paciente, dentista o servicio"
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

      {!loading && !error && filteredItems.length > 0 && viewMode === "week" && (
        <div className={styles.workspacePanel}>
          <DentistWeeklyAgenda
            appointments={filteredItems}
            onView={(item) => {
              setEditingAppointment(item);
              setOpenEdit(true);
            }}
            onEdit={(item) => {
              setEditingAppointment(item);
              setOpenEdit(true);
            }}
          />
        </div>
      )}

      {!loading && !error && filteredItems.length > 0 && viewMode === "list" && (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Horario</th>
                <th>Paciente</th>
                <th>Dentista</th>
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
                    <p className={styles.rowMain}>{item.dentist?.name || item.dentist_name || `#${item.dentist_user_id}`}</p>
                    <p className={styles.rowMeta}>{item.dentist?.email || "Sin correo"}</p>
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
                      <button
                        className={styles.btnGhost}
                        onClick={() => {
                          setEditingAppointment(item);
                          setOpenEdit(true);
                        }}
                      >
                        Editar
                      </button>
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

      {openCreate && (
        <ReceptionistAppointmentFormModal
          mode="create"
          patients={patients}
          knownServices={knownServices}
          loadingPatients={loadingPatients}
          patientsError={patientsError}
          loadingDentists={loadingDentists}
          dentistsError={dentistsError}
          availableDentists={availableDentists}
          onLookupChange={handleCreateLookupChange}
          onClose={() => {
            setOpenCreate(false);
            setDentistQuery(null);
          }}
          onSubmit={async (payload) => {
            setActionError("");
            setActionSuccess("");
            await createAppointment(payload as AppointmentPayload);
            await fetchAppointments();
            setOpenCreate(false);
            setDentistQuery(null);
            setActionSuccess("Cita creada correctamente.");
          }}
        />
      )}

      {openEdit && editingAppointment && (
        <ReceptionistAppointmentFormModal
          mode="edit"
          appointment={editingAppointment}
          patients={patients}
          knownServices={knownServices}
          loadingPatients={loadingPatients}
          patientsError={patientsError}
          loadingDentists={loadingDentists}
          dentistsError={dentistsError}
          availableDentists={availableDentists}
          onLookupChange={handleEditLookupChange}
          onClose={() => {
            setOpenEdit(false);
            setEditingAppointment(null);
            setDentistQuery(null);
          }}
          onSubmit={async (payload) => {
            if (!editingAppointment.id) return;
            setActionError("");
            setActionSuccess("");
            await updateAppointment(editingAppointment.id, payload);
            await fetchAppointments();
            setOpenEdit(false);
            setEditingAppointment(null);
            setDentistQuery(null);
            setActionSuccess("Cita actualizada correctamente.");
          }}
        />
      )}

      {(openCreate || openEdit) && (
        <div className={styles.fieldFull}>
          <p className={styles.rowMeta}>
            Nota técnica: este módulo no consume /api/services porque receptionist aún no tiene permiso confirmado en backend.
            La selección de servicios se encapsula por ID y con sugerencias derivadas de citas existentes.
          </p>
        </div>
      )}
    </section>
  );
}
