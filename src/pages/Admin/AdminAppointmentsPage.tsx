import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAppointment,
  getAppointments,
  getAvailableDentists,
  toErrorMessage,
  updateAppointment,
  updateAppointmentStatus,
  type Appointment,
  type AppointmentStatus,
  type AvailableDentist,
} from "../../api/appointments";
import { getAdminPatients } from "../../api/patients";
import { getServices, type Service } from "../../api/services";
import styles from "./admin.module.css";
import AppointmentForm, { type AppointmentFormState } from "./AppointmentForm";
import EditAppointmentModal from "./EditAppointmentModal";

const APPOINTMENT_STATUS_ACTIONS: AppointmentStatus[] = ["confirmed", "completed", "cancelled"];

const EMPTY_FORM: AppointmentFormState = {
  patient_user_id: "",
  service_id: "",
  start_at: "",
  dentist_user_id: "",
  reason: "",
  internal_notes: "",
};

function formatDateTime(value: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function toDateTimeLocal(value?: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}


export default function AdminAppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Array<{ id?: number; name: string }>>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [createAvailableDentists, setCreateAvailableDentists] = useState<AvailableDentist[]>([]);
  const [editAvailableDentists, setEditAvailableDentists] = useState<AvailableDentist[]>([]);

  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingCreateDentists, setLoadingCreateDentists] = useState(false);
  const [loadingEditDentists, setLoadingEditDentists] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [appointmentsError, setAppointmentsError] = useState("");
  const [patientsError, setPatientsError] = useState("");
  const [servicesError, setServicesError] = useState("");
  const [createDentistsError, setCreateDentistsError] = useState("");
  const [editDentistsError, setEditDentistsError] = useState("");
  const [createFormError, setCreateFormError] = useState("");
  const [editFormError, setEditFormError] = useState("");
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  const [createForm, setCreateForm] = useState<AppointmentFormState>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<AppointmentFormState>(EMPTY_FORM);

  const selectedCreateService = useMemo(
    () => services.find((service) => String(service.id) === createForm.service_id),
    [createForm.service_id, services]
  );

  const selectedEditService = useMemo(
    () => services.find((service) => String(service.id) === editForm.service_id),
    [editForm.service_id, services]
  );

  const canSearchCreateDentists = Boolean(createForm.service_id && createForm.start_at);
  const canSearchEditDentists = Boolean(editForm.service_id && editForm.start_at);

  const resetCreateForm = useCallback(() => {
    setCreateForm(EMPTY_FORM);
    setCreateAvailableDentists([]);
    setCreateDentistsError("");
    setCreateFormError("");
  }, []);

  const closeEditModal = useCallback(() => {
    setEditingAppointment(null);
    setEditForm(EMPTY_FORM);
    setEditAvailableDentists([]);
    setEditDentistsError("");
    setEditFormError("");
  }, []);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoadingAppointments(true);
      const appointments = await getAppointments();
      setItems(appointments);
      setAppointmentsError("");
    } catch (error: unknown) {
      setItems([]);
      setAppointmentsError(toErrorMessage(error, "No se pudo cargar la agenda"));
    } finally {
      setLoadingAppointments(false);
    }
  }, []);

  const fetchPatients = useCallback(async () => {
    try {
      setLoadingPatients(true);
      const adminPatients = await getAdminPatients();
      setPatients(adminPatients.map((patient) => ({ id: patient.id, name: patient.name })));
      setPatientsError("");
    } catch (error: unknown) {
      setPatients([]);
      setPatientsError(toErrorMessage(error, "No se pudieron cargar los pacientes"));
    } finally {
      setLoadingPatients(false);
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      setLoadingServices(true);
      const catalog = await getServices();
      setServices(catalog.filter((service) => service.status !== false));
      setServicesError("");
    } catch (error: unknown) {
      setServices([]);
      setServicesError(toErrorMessage(error, "No se pudieron cargar los servicios"));
    } finally {
      setLoadingServices(false);
    }
  }, []);

  useEffect(() => {
    void fetchAppointments();
    void fetchPatients();
    void fetchServices();
  }, [fetchAppointments, fetchPatients, fetchServices]);

  useEffect(() => {
    if (!canSearchCreateDentists) {
      setCreateAvailableDentists([]);
      setCreateDentistsError("");
      setLoadingCreateDentists(false);
      setCreateForm((current) => (current.dentist_user_id ? { ...current, dentist_user_id: "" } : current));
      return;
    }

    let active = true;

    async function fetchCreateDentists() {
      try {
        setLoadingCreateDentists(true);
        const dentists = await getAvailableDentists({
          service_id: Number(createForm.service_id),
          start_at: createForm.start_at,
        });

        if (!active) return;

        setCreateAvailableDentists(dentists);
        setCreateDentistsError("");
        setCreateForm((current) => {
          const stillAvailable = dentists.some((dentist) => String(dentist.id) === current.dentist_user_id);
          return stillAvailable ? current : { ...current, dentist_user_id: "" };
        });
      } catch (error: unknown) {
        if (!active) return;
        setCreateAvailableDentists([]);
        setCreateDentistsError(toErrorMessage(error, "No se pudieron cargar los dentistas disponibles"));
        setCreateForm((current) => (current.dentist_user_id ? { ...current, dentist_user_id: "" } : current));
      } finally {
        if (active) {
          setLoadingCreateDentists(false);
        }
      }
    }

    void fetchCreateDentists();

    return () => {
      active = false;
    };
  }, [canSearchCreateDentists, createForm.service_id, createForm.start_at]);

  useEffect(() => {
    if (!editingAppointment) {
      setEditAvailableDentists([]);
      setEditDentistsError("");
      setLoadingEditDentists(false);
      return;
    }

    if (!canSearchEditDentists) {
      setEditAvailableDentists([]);
      setEditDentistsError("");
      setLoadingEditDentists(false);
      setEditForm((current) => (current.dentist_user_id ? { ...current, dentist_user_id: "" } : current));
      return;
    }

    const editingAppointmentId = editingAppointment.id;
    let active = true;

    async function fetchEditDentists() {
      try {
        setLoadingEditDentists(true);
        const dentists = await getAvailableDentists({
          service_id: Number(editForm.service_id),
          start_at: editForm.start_at,
          exclude_appointment_id: editingAppointmentId ?? undefined,
        });

        if (!active) return;

        setEditAvailableDentists(dentists);
        setEditDentistsError("");
        setEditForm((current) => {
          const stillAvailable = dentists.some((dentist) => String(dentist.id) === current.dentist_user_id);
          return stillAvailable ? current : { ...current, dentist_user_id: "" };
        });
      } catch (error: unknown) {
        if (!active) return;
        setEditAvailableDentists([]);
        setEditDentistsError(toErrorMessage(error, "No se pudieron cargar los dentistas disponibles"));
        setEditForm((current) => (current.dentist_user_id ? { ...current, dentist_user_id: "" } : current));
      } finally {
        if (active) {
          setLoadingEditDentists(false);
        }
      }
    }

    void fetchEditDentists();

    return () => {
      active = false;
    };
  }, [canSearchEditDentists, editForm.service_id, editForm.start_at, editingAppointment]);

  function startEdit(item: Appointment) {
    setEditingAppointment(item);
    setEditFormError("");
    setEditDentistsError("");
    setEditAvailableDentists([]);
    setEditForm({
      patient_user_id: item.patient_user_id ? String(item.patient_user_id) : "",
      service_id: item.service_id ? String(item.service_id) : "",
      start_at: toDateTimeLocal(item.start_at),
      dentist_user_id: item.dentist_user_id ? String(item.dentist_user_id) : "",
      reason: item.reason ?? "",
      internal_notes: item.internal_notes ?? item.notes ?? "",
    });
  }

  function handleCreateFormChange(field: keyof AppointmentFormState, value: string) {
    setCreateForm((current) => ({ ...current, [field]: value }));
  }

  function handleEditFormChange(field: keyof AppointmentFormState, value: string) {
    setEditForm((current) => ({ ...current, [field]: value }));
  }

  async function onCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateFormError("");

    if (!createForm.patient_user_id || !createForm.service_id || !createForm.start_at || !createForm.dentist_user_id) {
      setCreateFormError("Completa paciente, servicio, horario y dentista antes de crear la cita.");
      return;
    }

    try {
      setSavingCreate(true);

      await createAppointment({
        patient_user_id: Number(createForm.patient_user_id),
        service_id: Number(createForm.service_id),
        start_at: createForm.start_at,
        dentist_user_id: Number(createForm.dentist_user_id),
        reason: createForm.reason.trim() || undefined,
        internal_notes: createForm.internal_notes.trim() || undefined,
      });

      resetCreateForm();
      await fetchAppointments();
    } catch (error: unknown) {
      setCreateFormError(toErrorMessage(error, "No se pudo crear la cita"));
    } finally {
      setSavingCreate(false);
    }
  }

  async function onEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEditFormError("");

    if (!editingAppointment?.id) return;

    if (!editForm.patient_user_id || !editForm.service_id || !editForm.start_at || !editForm.dentist_user_id) {
      setEditFormError("Completa paciente, servicio, horario y dentista antes de guardar la cita.");
      return;
    }

    try {
      setSavingEdit(true);

      await updateAppointment(editingAppointment.id, {
        patient_user_id: Number(editForm.patient_user_id),
        service_id: Number(editForm.service_id),
        start_at: editForm.start_at,
        dentist_user_id: Number(editForm.dentist_user_id),
        reason: editForm.reason.trim() || undefined,
        internal_notes: editForm.internal_notes.trim() || undefined,
      });

      await fetchAppointments();
      closeEditModal();
    } catch (error: unknown) {
      setEditFormError(toErrorMessage(error, "No se pudo actualizar la cita"));
    } finally {
      setSavingEdit(false);
    }
  }

  async function onStatusChange(item: Appointment, status: AppointmentStatus) {
    if (!item.id) return;

    try {
      await updateAppointmentStatus(item.id, status);
      await fetchAppointments();
    } catch (error: unknown) {
      setAppointmentsError(toErrorMessage(error, "No se pudo actualizar el estatus de la cita"));
    }
  }

  return (
    <div className={styles.viewStack}>
      <div className={styles.hero}>
        <div>
          <h2 className={styles.heroTitle}>Agenda clínica</h2>
          <p className={styles.heroSub}>Programa y edita citas con el flujo actual del backend: paciente, servicio, horario y dentista disponible.</p>
        </div>
      </div>

      <div className={styles.contentCard}>
        <div className={styles.sectionHead}>
          <div>
            <h3 className={styles.sectionTitle}>Nueva cita</h3>
            <p className={styles.sectionSub}>
              Selecciona el servicio primero para consultar únicamente dentistas compatibles y libres.
            </p>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.formSurface}>
            <AppointmentForm
              form={createForm}
              patients={patients}
              services={services}
              availableDentists={createAvailableDentists}
              selectedService={selectedCreateService}
              canSearchDentists={canSearchCreateDentists}
              loadingPatients={loadingPatients}
              loadingServices={loadingServices}
              loadingDentists={loadingCreateDentists}
              patientsError={patientsError}
              servicesError={servicesError}
              dentistsError={createDentistsError}
              formError={createFormError}
              saving={savingCreate}
              mode="create"
              onChange={handleCreateFormChange}
              onSubmit={onCreateSubmit}
            />
          </div>
        </div>
      </div>

      <div className={styles.contentCard}>
        <div className={styles.sectionHead}>
          <div>
            <h3 className={styles.sectionTitle}>Citas registradas</h3>
            <p className={styles.sectionSub}>{loadingAppointments ? "Cargando..." : `${items.length} cita(s)`}</p>
          </div>
        </div>

        <div className={styles.sectionBody}>
          {loadingAppointments && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Cargando citas...</p></div></div>}
          {!loadingAppointments && appointmentsError && <div className={styles.empty}><div className={styles.emptyBox}><p className={styles.emptyTitle}>Error</p><p className={styles.emptyText}>{appointmentsError}</p></div></div>}

          {!loadingAppointments && !appointmentsError && (
            <div className={styles.listSurface}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Paciente</th>
                      <th>Dentista</th>
                      <th>Servicio</th>
                      <th>Especialidad</th>
                      <th>Inicio</th>
                      <th>Fin</th>
                      <th>Estatus</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td><p className={styles.rowTitle}>{item.id}</p></td>
                        <td><p className={styles.rowTitle}>{item.patient?.name || item.patient_name || item.patient_user_id}</p></td>
                        <td><p className={styles.rowTitle}>{item.dentist?.name || item.dentist_name || item.dentist_user_id}</p></td>
                        <td>
                          <p className={styles.rowTitle}>{item.service?.name || item.service_name || `#${item.service_id}`}</p>
                          {item.reason && <p className={styles.rowSub}>Motivo: {item.reason}</p>}
                          {item.internal_notes && <p className={styles.rowSub}>Notas: {item.internal_notes}</p>}
                        </td>
                        <td><p className={styles.rowSub}>{item.service?.specialty?.name || item.specialty_name || "-"}</p></td>
                        <td><p className={styles.rowSub}>{formatDateTime(item.start_at)}</p></td>
                        <td><p className={styles.rowSub}>{formatDateTime(item.end_at || "")}</p></td>
                        <td><span className={`${styles.pill} ${item.status === "cancelled" || item.status === "canceled" ? styles.pillOff : styles.pillOn}`}>{item.status || "scheduled"}</span></td>
                        <td>
                          <div className={styles.tableActions}>
                            <button
                              className={styles.btnSoft}
                              onClick={() => startEdit(item)}
                              disabled={!item.id || savingEdit}
                            >
                              Editar
                            </button>
                            {APPOINTMENT_STATUS_ACTIONS.map((status) => (
                              <button
                                key={status}
                                className={status === "cancelled" ? styles.btnDanger : styles.btnGhost}
                                onClick={() => onStatusChange(item, status)}
                                disabled={item.status === status}
                              >
                                {status === "confirmed" ? "Confirmar" : status === "completed" ? "Completar" : "Cancelar"}
                              </button>
                            ))}
                          </div>
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
      {editingAppointment && (
        <EditAppointmentModal
          appointment={editingAppointment}
          form={editForm}
          patients={patients}
          services={services}
          availableDentists={editAvailableDentists}
          selectedService={selectedEditService}
          canSearchDentists={canSearchEditDentists}
          loadingPatients={loadingPatients}
          loadingServices={loadingServices}
          loadingDentists={loadingEditDentists}
          patientsError={patientsError}
          servicesError={servicesError}
          dentistsError={editDentistsError}
          formError={editFormError}
          saving={savingEdit}
          onChange={handleEditFormChange}
          onClose={closeEditModal}
          onSubmit={onEditSubmit}
        />
      )}
    </div>
  );
}
